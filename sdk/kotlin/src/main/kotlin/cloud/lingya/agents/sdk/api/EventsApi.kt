package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.AgentsUserClient
import cloud.lingya.agents.sdk.bodyOrThrow
import cloud.lingya.agents.sdk.generated.api.EventsApi as GeneratedEventsApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.Flow

/**
 * events 分组的 channel 绑定异步接口。 / Channel-bound asynchronous events operations.
 *
 * `channelId` 来自根客户端，避免调用方法时传入与签名目标不一致的 channel。
 * / `channelId` comes from the root client so method calls cannot diverge from the signed channel.
 *
 * @author 思追(shaco)
 */
public class EventsApi internal constructor(
    private val channelId: String,
    private val delegate: GeneratedEventsApi,
    private val userClient: AgentsUserClient,
) {
    /**
     * 读取消息事件 / Get message events
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param messageId 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getChatEvents(
        conversationId: kotlin.String,
        messageId: kotlin.String,
    ): AiChatBriefEventList =
        delegate.getChatEvents(channelId, conversationId, messageId).bodyOrThrow()

    /**
     * 批量读取消息事件 / Get message events in batch
     *
     * @param input 批量读取消息事件 / Get message events in batch 的强类型请求体。 / Typed request body for getChatEventsBatch.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getChatEventsBatch(
        input: AiChatEventsBatchInput,
    ): AiChatEventsBatch =
        delegate.getChatEventsBatch(channelId, input).bodyOrThrow()

}
