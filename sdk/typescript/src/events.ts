import type {
    AiChatBriefEvent as GeneratedAiChatBriefEvent,
    ToolExtension as GeneratedToolExtension,
    UnknownAiChatBriefEvent,
    UnknownToolExtension,
} from './models';

const knownEventTypes = new Set([
    'user-query', 'compressor-context-start', 'compressor-context-end', 'compactor-warning', 'manual-interrupt',
    'error', 'start', 'think', 'message', 'tool-execution',
    'tool-execution-sub-agent-call', 'tool-execution-awaiting-user-input', 'end',
]);
const knownToolCategories = new Set([
    'planApproval', 'askUserQuestion', 'imageGeneration', 'sqlQuery', 'sqlQueryResult', 'sqlChartResult',
    'mathFormula', 'mathResult', 'jsRunScript', 'jsRunScriptResult', 'skillResource', 'taskProgress',
]);

/** 包含全部已知事件以及携带原始 JSON 的未知事件。 / All known events plus a raw-JSON fallback for future event types. */
export type AiChatBriefEvent = GeneratedAiChatBriefEvent | UnknownAiChatBriefEvent;

/** 包含全部已知工具扩展以及携带原始 JSON 的未知扩展。 / All known tool extensions plus a raw-JSON fallback. */
export type ToolExtension = GeneratedToolExtension | UnknownToolExtension;

/**
 * 按 type 判别事件；未知值只暴露 type 与 rawJson。 / Decodes by type with an exact JSON fallback.
 *
 * @param rawJson - 一个完整 SSE data 对象的原始 JSON。
 * @returns 已知事件联合，或保存输入原文的未知事件。
 * @throws SyntaxError 当输入不是有效 JSON。
 */
export function decodeAiChatBriefEvent(rawJson: string): AiChatBriefEvent {
    const parsed = JSON.parse(rawJson) as { type?: unknown };
    const type = typeof parsed.type === 'string' ? parsed.type : 'unknown';
    return knownEventTypes.has(type) ? parsed as GeneratedAiChatBriefEvent : { type, rawJson };
}

/**
 * 按 category 判别工具扩展。 / Decodes a tool extension by category.
 *
 * @param rawJson - 一个完整工具扩展对象的原始 JSON。
 * @returns 12 种已知扩展之一，或保存输入原文的未知扩展。
 * @throws SyntaxError 当输入不是有效 JSON。
 */
export function decodeToolExtension(rawJson: string): ToolExtension {
    const parsed = JSON.parse(rawJson) as { category?: unknown };
    const category = typeof parsed.category === 'string' ? parsed.category : 'unknown';
    return knownToolCategories.has(category) ? parsed as GeneratedToolExtension : { category, rawJson };
}

/** @deprecated Use [AiChatBriefEvent]. */
export type LingyaAiChatBriefEvent = AiChatBriefEvent;
/** @deprecated Use [ToolExtension]. */
export type LingyaToolExtension = ToolExtension;
