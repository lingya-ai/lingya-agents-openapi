import { WebSocket } from 'ws';
import { abortable, ApiError, checkSignal } from './lifecycle';
import type { WebSocketConnector, WebSocketLike } from './subscription';
import { AgentsUserClient } from './client-core';
import { Configuration } from './runtime';
import { createSignedFetch, type OpenApiCredentials } from './hmac';
import { createTokenFetch, type TokenAuth, type ClientOptions } from './token';
export * from './client-core';
export * from './token';

export type AgentsClientOptions = ClientOptions<TokenAuth | {
    type: 'hmac'; accessKey: string; secretKey: string; externalUserId: string;
}>;

/** Channel client; options construction binds authentication and exposes API groups directly. */
export class AgentsClient {
    private readonly baseUrl: string;
    public readonly channelId: string;
    private readonly credentials?: OpenApiCredentials;
    private readonly bound?: AgentsUserClient;

    public constructor(options: AgentsClientOptions);
    public constructor(baseUrl: string, channelId: string, credentials: OpenApiCredentials);
    public constructor(options: string | AgentsClientOptions, channelId?: string, credentials?: OpenApiCredentials) {
        this.baseUrl = typeof options === 'string' ? options : options.baseUrl;
        this.channelId = typeof options === 'string' ? channelId! : options.channelId;
        if (!this.channelId) throw new Error('channelId must not be empty');
        if (typeof options === 'string') {
            if (!credentials) throw new Error('credentials are required');
            this.credentials = credentials;
        } else {
            const transport = options.auth.type === 'token'
                ? createTokenFetch(options.auth.tokenProvider, this.channelId, options.fetch)
                : createSignedFetch(options.auth, options.auth.externalUserId, options.fetch);
            this.bound = this.bind(transport, options.auth.type === 'token', async (url, signal, requestId) => {
                const factory = options.webSocketFactory ?? createNodeWebSocket;
                if (options.auth.type === 'token') {
                    let token: string;
                    try { token = await abortable(Promise.resolve().then(() => options.auth.type === 'token' ? options.auth.tokenProvider({ channelId: this.channelId, signal, fetch: options.fetch ?? globalThis.fetch }) : ''), signal); } catch (error) { if (signal.aborted) throw error; throw new ApiError('', '', undefined, '', { kind: 'authentication' }); }
                    if (typeof token !== 'string' || !/^[!#-~]+$/.test(token)) throw new ApiError('', '', undefined, '', { kind: 'authentication' });
                    checkSignal(signal);
                    return factory(url, { protocols: [`xlt-openapi-token.${token}`], headers: requestId ? { 'X-Request-ID': requestId } : undefined });
                }
                const httpUrl = url.replace(/^ws/, 'http');
                const capture: typeof fetch = async input => new Response(null, { headers: new Request(input).headers });
                const response = await createSignedFetch(options.auth, options.auth.externalUserId, capture)(httpUrl, { signal });
                checkSignal(signal);
                return factory(url, { protocols: [], headers: { ...Object.fromEntries(response.headers.entries()), ...(requestId ? { 'X-Request-ID': requestId } : {}) } });
            });
        }
    }
    private bind(transport: typeof fetch, tokenAuth: boolean = false, connector?: WebSocketConnector): AgentsUserClient {
        return new AgentsUserClient(this.channelId, new Configuration({
            basePath: this.baseUrl.replace(/\/+$/, ''), fetchApi: transport,
        }), transport, this.baseUrl, tokenAuth, connector);
    }
    public forUser(externalUserId: string): AgentsUserClient {
        if (!this.credentials) throw new Error('Options clients already bind identity; create a new client to switch users');
        return new AgentsClient({ baseUrl: this.baseUrl, channelId: this.channelId, auth: { type: 'hmac', ...this.credentials, externalUserId } }).user;
    }
    private get user(): AgentsUserClient {
        if (!this.bound) throw new Error('Call forUser before using a legacy channel client');
        return this.bound;
    }
    public get chat(): AgentsUserClient['chat'] { return this.user.chat; }
    public get configuration(): AgentsUserClient['configuration'] { return this.user.configuration; }
    public get conversations(): AgentsUserClient['conversations'] { return this.user.conversations; }
    public get events(): AgentsUserClient['events'] { return this.user.events; }
    public get files(): AgentsUserClient['files'] { return this.user.files; }
    public get interactions(): AgentsUserClient['interactions'] { return this.user.interactions; }
    public get knowledge(): AgentsUserClient['knowledge'] { return this.user.knowledge; }
    public get messages(): AgentsUserClient['messages'] { return this.user.messages; }
    public get sql(): AgentsUserClient['sql'] { return this.user.sql; }
    public get workspace(): AgentsUserClient['workspace'] { return this.user.workspace; }
    public get lowLevel(): AgentsUserClient['lowLevel'] { return this.user.lowLevel; }
}
export { AgentsClient as LingyaAgentsClient };


function createNodeWebSocket(address: string, init: { protocols: string[]; headers?: Record<string, string> }): WebSocketLike {
    const socket = new WebSocket(address, init.protocols, { headers: init.headers });
    const result = socket as unknown as WebSocketLike;
    // ws is an EventEmitter: termination while connecting must also have an error listener.
    socket.on('error', () => undefined);
    socket.on('upgrade', response => {
        const id = response.headers['x-request-id'];
        if (typeof id === 'string') result.serverRequestId = id;
    });
    socket.on('unexpected-response', (_request, response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        response.on('data', chunk => {
            const bytes = Buffer.from(chunk);
            if (size < 65536) chunks.push(bytes.subarray(0, 65536 - size));
            size += bytes.length;
        });
        const fail = () => {
            const id = response.headers['x-request-id'];
            result.handshakeError = new ApiError('GET', '/stream/ws', response.statusCode, Buffer.concat(chunks).toString('utf8'), { kind: 'http', requestId: typeof id === 'string' ? id : undefined });
            socket.terminate();
        };
        response.once('end', fail);
        response.once('error', fail);
        socket.once('close', () => response.destroy());
    });
    return result;
}
