package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.generated.api.EventsApi as GeneratedEventsApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking

/**
 * events 分组的 Java 友好阻塞接口。 / Java-friendly blocking events operations.
 *
 * @author 思追(shaco)
 */
public class BlockingEventsApi internal constructor(
    private val delegate: EventsApi,
) {
    /**
     * 读取消息事件 / Get message events
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param messageId 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getChatEvents(
        conversationId: kotlin.String,
        messageId: kotlin.String,
    ): AiChatBriefEventList = runBlocking {
        delegate.getChatEvents(conversationId, messageId)
    }

    /**
     * 批量读取消息事件 / Get message events in batch
     *
     * @param input 批量读取消息事件 / Get message events in batch 的强类型请求体。 / Typed request body for getChatEventsBatch.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getChatEventsBatch(
        input: AiChatEventsBatchInput,
    ): AiChatEventsBatch = runBlocking {
        delegate.getChatEventsBatch(input)
    }

}
