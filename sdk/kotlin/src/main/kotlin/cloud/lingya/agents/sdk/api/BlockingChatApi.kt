package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.generated.api.ChatApi as GeneratedChatApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking

/**
 * chat 分组的 Java 友好阻塞接口。 / Java-friendly blocking chat operations.
 *
 * @author 思追(shaco)
 */
public class BlockingChatApi internal constructor(
    private val delegate: ChatApi,
) {
    /**
     * 创建会话并提交消息 / Create a conversation and submit a message
     *
     * @param input 创建会话并提交消息 / Create a conversation and submit a message 的强类型请求体。 / Typed request body for createChat.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun createChat(
        input: AiChatInput,
    ): AiChatSubmission = runBlocking {
        delegate.createChat(input)
    }

    /**
     * 向已有会话提交消息 / Submit a message to an existing conversation
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param input 向已有会话提交消息 / Submit a message to an existing conversation 的强类型请求体。 / Typed request body for continueChat.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun continueChat(
        conversationId: kotlin.String,
        input: AiChatInput,
    ): AiChatSubmission = runBlocking {
        delegate.continueChat(conversationId, input)
    }

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
    ): List<cloud.lingya.agents.sdk.event.AiChatBriefEvent> = runBlocking {
        delegate.streamChatEvents(conversationId, input, xRequestID).toList()
    }

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
    ): List<ChatStreamProbeEvent> = runBlocking {
        delegate.probeEventStream(input, xRequestID).toList()
    }

    /**
     * 中断会话执行 / Interrupt conversation execution
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun interruptConversation(
        conversationId: kotlin.String,
    ): Unit = runBlocking {
        delegate.interruptConversation(conversationId)
    }

    /**
     * 压缩会话上下文 / Compact conversation context
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param force 是否忽略当前阈值并强制压缩。 / Whether to compact regardless of the current threshold.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun compactConversation(
        conversationId: kotlin.String,
        force: kotlin.Boolean? = true,
    ): Unit = runBlocking {
        delegate.compactConversation(conversationId, force)
    }

    /**
     * 读取当前目标 / Get current goal
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getGoal(
        conversationId: kotlin.String,
    ): AgentGoalView = runBlocking {
        delegate.getGoal(conversationId)
    }

    /**
     * 编辑目标 / Edit goal
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param input 编辑目标 / Edit goal 的强类型请求体。 / Typed request body for editGoal.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun editGoal(
        conversationId: kotlin.String,
        input: EditAgentGoalInput,
    ): AgentGoal = runBlocking {
        delegate.editGoal(conversationId, input)
    }

    /**
     * 查询目标历史 / Get goal history
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param page 分页信息 / page metadata。
     * @param size 单页记录数。 / Number of records per page.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getGoalHistory(
        conversationId: kotlin.String,
        page: kotlin.Int? = 0,
        size: kotlin.Int? = 20,
    ): AgentGoalHistory = runBlocking {
        delegate.getGoalHistory(conversationId, page, size)
    }

    /**
     * 暂停目标 / Pause goal
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param input 暂停目标 / Pause goal 的强类型请求体。 / Typed request body for pauseGoal.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun pauseGoal(
        conversationId: kotlin.String,
        input: AgentGoalRefInput,
    ): AgentGoal = runBlocking {
        delegate.pauseGoal(conversationId, input)
    }

    /**
     * 恢复目标 / Resume goal
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param input 恢复目标 / Resume goal 的强类型请求体。 / Typed request body for resumeGoal.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun resumeGoal(
        conversationId: kotlin.String,
        input: AgentGoalRefInput,
    ): AgentGoal = runBlocking {
        delegate.resumeGoal(conversationId, input)
    }

    /**
     * 清除目标 / Clear goal
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param input 清除目标 / Clear goal 的强类型请求体。 / Typed request body for clearGoal.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun clearGoal(
        conversationId: kotlin.String,
        input: AgentGoalRefInput,
    ): AgentGoal = runBlocking {
        delegate.clearGoal(conversationId, input)
    }

}
