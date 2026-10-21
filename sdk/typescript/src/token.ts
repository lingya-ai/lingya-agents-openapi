import { ApiError, abortable, checkSignal, fetchResponse } from './lifecycle';
import type { WebSocketFactory } from './subscription';
/** A fresh token must be issued for every invocation, including concurrent calls. */
export type TokenProvider = (context: { channelId: string; signal?: AbortSignal; fetch: typeof fetch }) => string | Promise<string>;
export interface TokenAuth { type: 'token'; tokenProvider: TokenProvider }
export interface ClientOptions<Auth> { baseUrl: string; channelId: string; auth: Auth; fetch?: typeof fetch; webSocketFactory?: WebSocketFactory }

/** Browser-safe transport: no cache, HMAC headers, redirects, or automatic retries. */
export function createTokenFetch(provider: TokenProvider, channelId: string, network: typeof fetch = globalThis.fetch): typeof fetch {
    if (typeof provider !== 'function') throw new Error('tokenProvider must be a function');
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const request = new Request(input, init);
        checkSignal(request.signal);
        if (new URL(request.url).pathname.endsWith('/presign')) throw new ApiError('POST', '/presign', undefined, '{"message":"presign requires HMAC authentication"}', { kind: 'authentication' });
        if (Array.from(request.headers.keys()).some(name => name.toLowerCase().startsWith('x-openapi-'))) {
            throw new Error('Authentication headers are managed by the SDK');
        }
        let token: string;
        try { token = await abortable(Promise.resolve().then(() => provider({ channelId, signal: request.signal, fetch: network })), request.signal); }
        catch { checkSignal(request.signal); throw Object.assign(new ApiError('', '', undefined, '', { kind: 'authentication' }), { message: 'OpenAPI token provider failed' }); }
        checkSignal(request.signal);
        if (typeof token !== 'string' || !/^[\x21-\x7e]+$/.test(token)) throw Object.assign(new ApiError('', '', undefined, '', { kind: 'authentication' }), { message: 'Invalid OpenAPI token' });
        const headers = new Headers(request.headers);
        headers.set('X-OpenAPI-Token', token);
        return fetchResponse(network, new Request(request, { headers, redirect: 'error' }));
    };
}
