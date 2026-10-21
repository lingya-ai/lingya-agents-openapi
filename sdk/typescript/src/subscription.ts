import { ApiError, RequestOptions, RequestScope, abortable, normalizeError } from './lifecycle';
import { decodeAiChatBriefEvent, type AiChatBriefEvent } from './events';
import { decodeSse } from './sse';

let nextConnectionId = 0;
export interface ConnectionEvent { connectionId?: string; type: 'opened' | 'ready' | 'heartbeat' | 'closed'; transport: 'sse' | 'websocket'; requestId?: string; reason?: string; closeCode?: number }
export interface StreamOptions extends RequestOptions { xRequestID?: string; transport?: 'sse' | 'websocket'; idleTimeoutMs?: number; onConnectionEvent?: (event: ConnectionEvent) => void }
export interface StreamCloseInfo { reason: 'end' | 'complete' | 'normal' | 'closed' | 'cancelled' | 'timeout' | 'error'; error?: ApiError; closeCode?: number }
export interface WebSocketLike {
    serverRequestId?: string; handshakeError?: ApiError;
    onopen: ((event: any) => void) | null; onmessage: ((event: { data: any }) => void) | null;
    onerror: ((event: any) => void) | null; onclose: ((event: { code: number; reason: string }) => void) | null;
    close(code?: number, reason?: string): void;
}
export type WebSocketFactory = (url: string, options: { protocols: string[]; headers?: Record<string, string> }) => WebSocketLike;
export type WebSocketConnector = (url: string, signal: AbortSignal, requestId?: string) => Promise<WebSocketLike>;
export type StreamRequest = (signal: AbortSignal) => Promise<Response>;

/** One connection, no replay, retry, UI merging or recovery policy. */
export class ChatSubscription implements AsyncIterable<AiChatBriefEvent> {
    public readonly events: AsyncIterable<AiChatBriefEvent> = this;
    public readonly closed: Promise<StreamCloseInfo>;
    private readonly scope: RequestScope;
    private readonly queue: AiChatBriefEvent[] = [];
    private wake?: () => void;
    private done = false;
    private failure?: ApiError;
    private finish!: (value: StreamCloseInfo) => void;
    private idleTimer?: ReturnType<typeof setTimeout>;
    private reason: StreamCloseInfo['reason'] = 'closed';
    private serverRequestId?: string;
    private closeCode?: number;
    private readonly connectionId = `connection-${++nextConnectionId}`;
    public constructor(private readonly request: StreamRequest, private readonly url: string,
        private readonly messageId: string, private readonly options: StreamOptions = {}, private readonly connect?: WebSocketConnector) {
        if (options.idleTimeoutMs !== undefined && (!Number.isFinite(options.idleTimeoutMs) || options.idleTimeoutMs <= 0)) throw new RangeError('idleTimeoutMs must be positive');
        this.scope = new RequestScope(options);
        this.closed = new Promise(resolve => { this.finish = resolve; });
        void this.run();
    }
    public close(): void { this.reason = 'closed'; this.scope.controller.abort(); }
    private diagnostic(type: ConnectionEvent['type'], requestId: string | undefined = this.serverRequestId): void {
        try { this.options.onConnectionEvent?.({ type, connectionId: this.connectionId, transport: this.options.transport ?? 'sse', requestId, reason: type === 'closed' ? this.reason : undefined, closeCode: this.closeCode }); } catch { /* Observers do not own connection state. */ }
    }
    private activity(): void {
        clearTimeout(this.idleTimer);
        if (this.options.idleTimeoutMs !== undefined) this.idleTimer = setTimeout(() => this.scope.controller.abort(new ApiError('', '', undefined, '', { kind: 'timeout' })), this.options.idleTimeoutMs);
    }
    private push(data: string): boolean {
        const event = decodeAiChatBriefEvent(data);
        if (this.queue.length >= 1024) throw new ApiError('', '', undefined, '', { kind: 'protocol' });
        this.queue.push(event); this.wake?.();
        if (event.type === 'end') { this.reason = 'end'; return true; }
        return false;
    }
    private async run(): Promise<void> {
        let requestId: string | undefined;
        try {
            if (this.options.transport === 'websocket') await this.websocket();
            else {
                const response = await abortable(this.request(this.scope.signal), this.scope.signal);
                requestId = response.headers.get('X-Request-ID') ?? undefined;
                this.diagnostic('opened', requestId); this.activity();
                for await (const data of decodeSse(response, this.scope.signal, comment => {
                    this.activity(); this.diagnostic(comment === 'ready' ? 'ready' : 'heartbeat', requestId);
                })) {
                    this.activity();
                    if (this.push(data)) break;
                }
                if (this.reason !== 'end') throw new ApiError('', '', undefined, '', { kind: 'unexpected_eof', requestId });
            }
        } catch (error) {
            if (!this.scope.signal.aborted || this.options.signal?.aborted || this.scope.signal.reason instanceof ApiError) {
                this.failure = await normalizeError(error, this.scope.signal);
                this.reason = this.failure.kind === 'timeout' ? 'timeout' : this.failure.kind === 'cancelled' ? 'cancelled' : 'error';
            }
        } finally {
            this.scope.controller.abort(); this.scope.dispose(); clearTimeout(this.idleTimer);
            this.done = true; this.wake?.(); this.diagnostic('closed', requestId);
            this.finish({ reason: this.reason, error: this.failure, closeCode: this.closeCode });
        }
    }
    private async websocket(): Promise<void> {
        if (!this.connect) throw new ApiError('', '', undefined, '', { kind: 'protocol' });
        const socket = await abortable(this.connect(this.url, this.scope.signal, this.options.xRequestID), this.scope.signal);
        await new Promise<void>((resolve, reject) => {
            let settled = false, ready = false;
            const settle = (error?: unknown) => {
                if (settled) return; settled = true;
                this.scope.signal.removeEventListener('abort', abort);
                socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
                try { socket.close(1000, 'client-close'); } catch { /* Already closed. */ }
                error ? reject(error) : resolve();
            };
            const abort = () => settle(new ApiError('', '', undefined, '', { kind: 'cancelled' }));
            this.scope.signal.addEventListener('abort', abort, { once: true });
            if (this.scope.signal.aborted) { abort(); return; }
            socket.onopen = () => { this.serverRequestId = socket.serverRequestId; this.diagnostic('opened'); this.activity(); };
            socket.onmessage = frame => {
                try {
                    this.activity();
                    if (typeof frame.data !== 'string') throw new Error('Expected text frame');
                    const value = JSON.parse(frame.data);
                    if (value.id !== this.messageId || typeof value.event !== 'string') throw new Error('Invalid envelope');
                    if (value.event === 'ready') { ready = true; this.diagnostic('ready'); }
                    else if (value.event === 'complete') { this.reason = 'complete'; settle(); }
                    else if (value.event === 'transport-error') throw new ApiError('', '', undefined, JSON.stringify(value.data), { kind: 'protocol' });
                    else {
                        if (!ready || !value.data || typeof value.data.type !== 'string') throw new Error('Invalid business frame');
                        if (this.push(JSON.stringify(value.data))) settle();
                    }
                } catch (error) { settle(error instanceof ApiError ? error : new ApiError('', '', undefined, '', { kind: 'protocol' })); }
            };
            socket.onerror = () => settle(socket.handshakeError ?? new ApiError('', '', undefined, '', { kind: 'network' }));
            socket.onclose = event => { this.closeCode = event.code; if (event.code === 1000) { this.reason = 'normal'; settle(); } else settle(new ApiError('', '', undefined, '', { kind: 'unexpected_eof' })); };
        });
    }
    public async *[Symbol.asyncIterator](): AsyncGenerator<AiChatBriefEvent> {
        try {
            for (;;) {
                if (this.queue.length) { yield this.queue.shift()!; continue; }
                if (this.done) { if (this.failure) throw this.failure; return; }
                await new Promise<void>(resolve => { this.wake = resolve; });
            }
        } finally { this.close(); await this.closed; }
    }
}


/** Finite SSE endpoints permit EOF, while sharing cancellation and idle semantics. */
export async function* finiteSse(request: StreamRequest, options: StreamOptions = {}): AsyncGenerator<string> {
    if (options.idleTimeoutMs !== undefined && (!Number.isFinite(options.idleTimeoutMs) || options.idleTimeoutMs <= 0)) throw new RangeError('idleTimeoutMs must be positive');
    const scope = new RequestScope(options);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let reason = 'closed', requestId: string | undefined;
    const connectionId = `connection-${++nextConnectionId}`;
    const diagnostic = (type: ConnectionEvent['type']) => {
        try { options.onConnectionEvent?.({type, transport:'sse', connectionId, requestId, reason:type==='closed'?reason:undefined}); } catch { /* Observer only. */ }
    };
    const activity = () => {
        clearTimeout(timer);
        if (options.idleTimeoutMs !== undefined) timer = setTimeout(()=>scope.controller.abort(new ApiError('', '', undefined, '', {kind:'timeout'})), options.idleTimeoutMs);
    };
    try {
        if (options.transport === 'websocket') throw new ApiError('', '', undefined, '', {kind:'protocol'});
        const response = await abortable(request(scope.signal), scope.signal);
        requestId = response.headers.get('X-Request-ID') ?? undefined;
        diagnostic('opened'); activity();
        for await (const data of decodeSse(response, scope.signal, comment => { activity(); diagnostic(comment==='ready'?'ready':'heartbeat'); })) {
            activity(); yield data;
        }
        reason = 'normal';
    } catch (error) {
        const normalized = await normalizeError(error, scope.signal);
        requestId ??= normalized.requestId;
        reason = normalized.kind === 'timeout' ? 'timeout' : normalized.kind === 'cancelled' ? 'cancelled' : 'error';
        throw normalized;
    } finally { scope.controller.abort(); scope.dispose(); clearTimeout(timer); diagnostic('closed'); }
}
