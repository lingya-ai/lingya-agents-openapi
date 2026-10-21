package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.AgentsUserClient
import cloud.lingya.agents.sdk.bodyOrThrow
import cloud.lingya.agents.sdk.generated.api.ChatApi as GeneratedChatApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.Flow

/**
 * chat 分组的 channel 绑定异步接口。 / Channel-bound asynchronous chat operations.
 *
 * `channelId` 来自根客户端，避免调用方法时传入与签名目标不一致的 channel。
 * / `channelId` comes from the root client so method calls cannot diverge from the signed channel.
 *
 * @author 思追(shaco)
 */
public class ChatApi internal constructor(
    private val channelId: String,
    private val delegate: GeneratedChatApi,
    private val userClient: AgentsUserClient,
) {
    /**
     * 创建会话并提交消息 / Create a conversation and submit a message
     *
     * @param input 创建会话并提交消息 / Create a conversation and submit a message 的强类型请求体。 / Typed request body for createChat.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun createChat(
        input: AiChatInput,
    ): AiChatSubmission =
        delegate.createChat(channelId, input).bodyOrThrow()

    /**
     * 向已有会话提交消息 / Submit a message to an existing conversation
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param input 向已有会话提交消息 / Submit a message to an existing conversation 的强类型请求体。 / Typed request body for continueChat.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun continueChat(
        conversationId: kotlin.String,
        input: AiChatInput,
    ): AiChatSubmission =
        delegate.continueChat(channelId, conversationId, input).bodyOrThrow()

    /**
     * 订阅消息事件流 / Stream message events
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param xRequestID 可选诊断请求 ID，便于关联客户端与服务端日志。 / Optional diagnostic request ID used to correlate client and server logs.
     * @param input 订阅消息事件流 / Stream message events 的强类型请求体。 / Typed request body for streamChatEvents.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun streamChatEvents(
        conversationId: kotlin.String,
        input: AiChatStreamInput,
        xRequestID: kotlin.String? = null,
    ): Flow<cloud.lingya.agents.sdk.event.AiChatBriefEvent> =
        userClient.streamChatEventsInternal(conversationId, input, xRequestID)

    /**
     * 探测 SSE 连接 / Probe the SSE connection
     *
     * @param xRequestID 可选诊断请求 ID，便于关联客户端与服务端日志。 / Optional diagnostic request ID used to correlate client and server logs.
     * @param input 探测 SSE 连接 / Probe the SSE connection 的强类型请求体。 / Typed request body for probeEventStream.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun probeEventStream(
        input: ChatStreamProbeInput,
        xRequestID: kotlin.String? = null,
    ): Flow<ChatStreamProbeEvent> =
        userClient.probeEventStreamInternal(input, xRequestID)

    /**
     * 中断会话执行 / Interrupt conversation execution
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun interruptConversation(
        conversationId: kotlin.String,
    ): Unit =
        delegate.interruptConversation(channelId, conversationId).bodyOrThrow()

    /**
     * 压缩会话上下文 / Compact conversation context
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param force 是否忽略当前阈值并强制压缩。 / Whether to compact regardless of the current threshold.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun compactConversation(
        conversationId: kotlin.String,
        force: kotlin.Boolean? = true,
    ): Unit =
        delegate.compactConversation(channelId, conversationId, force).bodyOrThrow()

    /**
     * 读取当前目标 / Get current goal
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getGoal(
        conversationId: kotlin.String,
    ): AgentGoalView =
        delegate.getGoal(channelId, conversationId).bodyOrThrow()

    /**
     * 编辑目标 / Edit goal
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param input 编辑目标 / Edit goal 的强类型请求体。 / Typed request body for editGoal.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun editGoal(
        conversationId: kotlin.String,
        input: EditAgentGoalInput,
    ): AgentGoal =
        delegate.editGoal(channelId, conversationId, input).bodyOrThrow()

    /**
     * 查询目标历史 / Get goal history
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param page 分页信息 / page metadata。
     * @param size 单页记录数。 / Number of records per page.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getGoalHistory(
        conversationId: kotlin.String,
        page: kotlin.Int? = 0,
        size: kotlin.Int? = 20,
    ): AgentGoalHistory =
        delegate.getGoalHistory(channelId, conversationId, page, size).bodyOrThrow()

    /**
     * 暂停目标 / Pause goal
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param input 暂停目标 / Pause goal 的强类型请求体。 / Typed request body for pauseGoal.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun pauseGoal(
        conversationId: kotlin.String,
        input: AgentGoalRefInput,
    ): AgentGoal =
        delegate.pauseGoal(channelId, conversationId, input).bodyOrThrow()

    /**
     * 恢复目标 / Resume goal
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param input 恢复目标 / Resume goal 的强类型请求体。 / Typed request body for resumeGoal.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun resumeGoal(
        conversationId: kotlin.String,
        input: AgentGoalRefInput,
    ): AgentGoal =
        delegate.resumeGoal(channelId, conversationId, input).bodyOrThrow()

    /**
     * 清除目标 / Clear goal
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param input 清除目标 / Clear goal 的强类型请求体。 / Typed request body for clearGoal.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun clearGoal(
        conversationId: kotlin.String,
        input: AgentGoalRefInput,
    ): AgentGoal =
        delegate.clearGoal(channelId, conversationId, input).bodyOrThrow()

}
