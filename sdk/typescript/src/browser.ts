import { abortable, ApiError, checkSignal } from './lifecycle';
/** Browser entry: only single-use token authentication is available. */
import { AgentsUserClient } from './client-core';
import { Configuration } from './runtime';
import { createTokenFetch, type ClientOptions, type TokenAuth } from './token';
export * from './runtime';
export * from './models/index';
export * from './bound';
export * from './client-core';
export * from './token';
export { decodeAiChatBriefEvent, decodeToolExtension, type AiChatBriefEvent, type ToolExtension } from './events';
export * from './sse';
export type AgentsClientOptions = ClientOptions<TokenAuth>;
export class AgentsClient extends AgentsUserClient {
    public constructor(options: AgentsClientOptions) {
        if (!options.channelId) throw new Error('channelId must not be empty');
        if (options.auth.type !== 'token') throw new Error('Browser clients require token authentication');
        const transport = createTokenFetch(options.auth.tokenProvider, options.channelId, options.fetch);
        super(options.channelId, new Configuration({ basePath: options.baseUrl.replace(/\/+$/, ''), fetchApi: transport }), transport, options.baseUrl, true, async (url, signal) => {
            let token: string;
            try { token = await abortable(Promise.resolve().then(() => options.auth.tokenProvider({ channelId: options.channelId, signal, fetch: options.fetch ?? globalThis.fetch })), signal); } catch (error) { if (signal.aborted) throw error; throw new ApiError('', '', undefined, '', { kind: 'authentication' }); }
            if (typeof token !== 'string' || !/^[!#-~]+$/.test(token)) throw new ApiError('', '', undefined, '', { kind: 'authentication' });
            const factory = options.webSocketFactory ?? ((address, init) => new WebSocket(address, init.protocols));
            checkSignal(signal);
            return factory(url, { protocols: [`xlt-openapi-token.${token}`] });
        });
    }
}
