import { ApiError, abortable, checkSignal } from './lifecycle';

/** Incremental SSE decoding compatible with Chromium 102. */
export async function* decodeSse(response: Response, signal?: AbortSignal, onComment?: (comment: string) => void): AsyncGenerator<string> {
    if (!/^text\/event-stream(?:\s*;|\s*$)/i.test(response.headers.get('Content-Type') ?? '') || !response.body) {
        await response.body?.cancel();
        throw new ApiError('', '', response.status, '', { kind: 'protocol' });
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let buffer = '', data: string[] = [];
    const cancel = () => { void reader.cancel().catch(() => undefined); };
    signal?.addEventListener('abort', cancel, { once: true });
    try {
        for (;;) {
            checkSignal(signal);
            const chunk = await abortable(reader.read(), signal);
            buffer += chunk.done ? decoder.decode() : decoder.decode(chunk.value, { stream: true });
            let match: RegExpExecArray | null;
            while ((match = /\r\n|\r|\n/.exec(buffer)) !== null) {
                if (!chunk.done && match[0] === '\r' && match.index === buffer.length - 1) break;
                const line = buffer.slice(0, match.index);
                buffer = buffer.slice(match.index + match[0].length);
                if (line === '') { if (data.length) yield data.join('\n'); data = []; }
                else if (line.startsWith(':')) onComment?.(line.slice(1).trim());
                else if (line === 'data' || line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
            }
            if (chunk.done) break;
        }
    } catch (error) {
        if (error instanceof TypeError && !signal?.aborted) throw new ApiError('', '', undefined, '', { kind: 'protocol' });
        throw error;
    } finally {
        signal?.removeEventListener('abort', cancel);
        try { await reader.cancel(); } finally { reader.releaseLock(); }
    }
}
