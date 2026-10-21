export type ErrorKind = 'http' | 'network' | 'authentication' | 'protocol' | 'cancelled' | 'timeout' | 'unexpected_eof';
export interface RequestOptions { signal?: AbortSignal; timeoutMs?: number }
export interface ErrorDetails { kind?: ErrorKind; code?: string; fields?: Array<{ field: string; message: string }>; requestId?: string; cause?: unknown }
export class ApiError extends Error {
    public readonly kind: ErrorKind;
    public readonly code?: string;
    public readonly fields?: Array<{ field: string; message: string }>;
    public readonly requestId?: string;
    public readonly cause?: unknown;
    public constructor(public readonly method: string, public readonly path: string, public readonly status: number | undefined,
        public readonly responseBody: string = '', details: ErrorDetails = {}) {
        let parsed: Record<string, unknown> = {};
        try { parsed = JSON.parse(responseBody); } catch { /* Preserve non-JSON bodies. */ }
        super(typeof parsed?.message === 'string' ? parsed.message : `${method} ${path} ${status === undefined ? details.kind ?? 'failed' : `returned HTTP ${status}`}`);
        this.name = 'ApiError'; this.kind = details.kind ?? (status === undefined ? 'network' : 'http');
        this.code = details.code ?? (typeof parsed?.code === 'string' ? parsed.code : undefined);
        this.fields = details.fields ?? (Array.isArray(parsed?.fields) ? parsed.fields.filter((v): v is {field: string; message: string} => typeof v?.field === 'string' && typeof v?.message === 'string') : undefined);
        this.requestId = details.requestId; this.cause = details.cause;
    }
}
export function abortError(signal: AbortSignal): ApiError {
    return signal.reason instanceof ApiError ? signal.reason : new ApiError('', '', undefined, '', { kind: 'cancelled' });
}
export function checkSignal(signal?: AbortSignal): void { if (signal?.aborted) throw abortError(signal); }
export function abortable<T>(promise: PromiseLike<T>, signal?: AbortSignal): Promise<T> {
    checkSignal(signal);
    if (!signal) return Promise.resolve(promise);
    return new Promise<T>((resolve, reject) => {
        const aborted = () => { signal.removeEventListener('abort', aborted); reject(abortError(signal)); };
        signal.addEventListener('abort', aborted, { once: true });
        Promise.resolve(promise).then(value => { signal.removeEventListener('abort', aborted); resolve(value); }, error => { signal.removeEventListener('abort', aborted); reject(error); });
    });
}
export class RequestScope {
    public readonly controller = new AbortController();
    public readonly signal = this.controller.signal;
    private timer?: ReturnType<typeof setTimeout>;
    private readonly abort: () => void;
    public constructor(private readonly options: RequestOptions = {}) {
        if (options.timeoutMs !== undefined && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) throw new RangeError('timeoutMs must be positive');
        this.abort = () => this.controller.abort(options.signal?.reason instanceof ApiError ? options.signal.reason : new ApiError('', '', undefined, '', { kind: 'cancelled' }));
        options.signal?.addEventListener('abort', this.abort, { once: true });
        if (options.signal?.aborted) this.abort();
        if (options.timeoutMs !== undefined) this.timer = setTimeout(() => this.controller.abort(new ApiError('', '', undefined, '', { kind: 'timeout' })), options.timeoutMs);
    }
    public dispose(): void { clearTimeout(this.timer); this.options.signal?.removeEventListener('abort', this.abort); }
}
export async function normalizeError(error: unknown, signal?: AbortSignal): Promise<ApiError> {
    if (signal?.aborted) return abortError(signal);
    if (error instanceof ApiError) return error;
    const response = (error as { response?: Response })?.response;
    if (response) return new ApiError('', '', response.status, (await response.text()).slice(0, 65536), { requestId: response.headers.get('X-Request-ID') ?? undefined });
    return new ApiError('', '', undefined, '', { kind: error instanceof SyntaxError ? 'protocol' : 'network', cause: error });
}
export async function execute<T>(options: RequestOptions, operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const scope = new RequestScope(options);
    try { checkSignal(scope.signal); return await abortable(operation(scope.signal), scope.signal); }
    catch (error) { throw await normalizeError(error, scope.signal); }
    finally { scope.dispose(); }
}
export interface DownloadResponse { bytes: Uint8Array; filename?: string; contentType?: string; headers: Headers; status: number; requestId?: string }
export async function downloadResponse(response: Response): Promise<DownloadResponse> {
    const disposition = response.headers.get('Content-Disposition') ?? '';
    let filename = /filename="([^"]*)"/i.exec(disposition)?.[1] ?? /filename=([^;\s]+)/i.exec(disposition)?.[1];
    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
    if (encoded) { try { filename = decodeURIComponent(encoded); } catch { /* Use fallback. */ } }
    return { bytes: new Uint8Array(await response.arrayBuffer()), filename, contentType: response.headers.get('Content-Type') ?? undefined,
        headers: response.headers, status: response.status, requestId: response.headers.get('X-Request-ID') ?? undefined };
}

/** Enforce cancellation even when an injected Fetch ignores its signal. */
export async function fetchResponse(network: typeof fetch, request: Request): Promise<Response> {
    checkSignal(request.signal);
    const response = await network(request);
    if (request.signal.aborted) {
        await response.body?.cancel().catch(() => undefined);
        throw abortError(request.signal);
    }
    if (!response.body) return response;
    const reader = response.body.getReader();
    let controller: ReadableStreamDefaultController<Uint8Array>;
    let finished = false;
    const cleanup = () => { finished = true; request.signal.removeEventListener('abort', abort); };
    const abort = () => {
        if (finished) return;
        cleanup();
        void reader.cancel().catch(() => undefined);
        controller.error(abortError(request.signal));
    };
    const body = new ReadableStream<Uint8Array>({
        start(value) { controller = value; request.signal.addEventListener('abort', abort, { once: true }); if (request.signal.aborted) abort(); },
        async pull(value) {
            try {
                const chunk = await reader.read();
                if (finished) return;
                if (chunk.done) { cleanup(); value.close(); reader.releaseLock(); }
                else value.enqueue(chunk.value);
            } catch (error) { if (!finished) { cleanup(); value.error(error); } }
        },
        async cancel(reason) { cleanup(); await reader.cancel(reason); reader.releaseLock(); },
    });
    const wrapped = new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
    Object.defineProperties(wrapped, { url: { value: response.url }, redirected: { value: response.redirected }, type: { value: response.type } });
    return wrapped;
}
