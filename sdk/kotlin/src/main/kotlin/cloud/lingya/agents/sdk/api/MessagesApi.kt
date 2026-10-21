package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.AgentsUserClient
import cloud.lingya.agents.sdk.bodyOrThrow
import cloud.lingya.agents.sdk.generated.api.MessagesApi as GeneratedMessagesApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.Flow

/**
 * messages 分组的 channel 绑定异步接口。 / Channel-bound asynchronous messages operations.
 *
 * `channelId` 来自根客户端，避免调用方法时传入与签名目标不一致的 channel。
 * / `channelId` comes from the root client so method calls cannot diverge from the signed channel.
 *
 * @author 思追(shaco)
 */
public class MessagesApi internal constructor(
    private val channelId: String,
    private val delegate: GeneratedMessagesApi,
    private val userClient: AgentsUserClient,
) {
    /**
     * 分页查询会话消息 / List conversation messages
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param current 从 0 开始的页码。 / Zero-based page index.
     * @param size 单页记录数。 / Number of records per page.
     * @param orderBy 排序字段列表。 / Ordered list of sort fields.
     * @param orderDirection 排序方向。 / Sort direction.
     * @param orderNullHandling 空值排序策略。 / Null ordering strategy.
     * @param keyword 标题或正文检索关键字。 / Title or content search keyword.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun listConversationMessages(
        conversationId: kotlin.String,
        current: kotlin.Int? = null,
        size: kotlin.Int? = 30,
        orderBy: kotlin.collections.List<kotlin.String>? = null,
        orderDirection: GeneratedMessagesApi.OrderDirectionListConversationMessages? = GeneratedMessagesApi.OrderDirectionListConversationMessages.ASC,
        orderNullHandling: GeneratedMessagesApi.OrderNullHandlingListConversationMessages? = GeneratedMessagesApi.OrderNullHandlingListConversationMessages.NATIVE,
        keyword: kotlin.String? = null,
    ): ConversationMessagePage =
        delegate.listConversationMessages(channelId, conversationId, current, size, orderBy, orderDirection, orderNullHandling, keyword).bodyOrThrow()

    /**
     * 读取单条会话消息 / Get a conversation message
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param messageId 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getConversationMessage(
        conversationId: kotlin.String,
        messageId: kotlin.String,
    ): ConversationMessage =
        delegate.getConversationMessage(channelId, conversationId, messageId).bodyOrThrow()

    /**
     * 分页查询异步任务 / List asynchronous tasks
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param current 从 0 开始的页码。 / Zero-based page index.
     * @param size 单页记录数。 / Number of records per page.
     * @param orderBy 排序字段列表。 / Ordered list of sort fields.
     * @param orderDirection 排序方向。 / Sort direction.
     * @param orderNullHandling 空值排序策略。 / Null ordering strategy.
     * @param keyword 标题或正文检索关键字。 / Title or content search keyword.
     * @param status 状态过滤条件。 / Status filter.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun listConversationAsyncTasks(
        conversationId: kotlin.String,
        current: kotlin.Int? = null,
        size: kotlin.Int? = 30,
        orderBy: kotlin.collections.List<kotlin.String>? = null,
        orderDirection: GeneratedMessagesApi.OrderDirectionListConversationAsyncTasks? = GeneratedMessagesApi.OrderDirectionListConversationAsyncTasks.ASC,
        orderNullHandling: GeneratedMessagesApi.OrderNullHandlingListConversationAsyncTasks? = GeneratedMessagesApi.OrderNullHandlingListConversationAsyncTasks.NATIVE,
        keyword: kotlin.String? = null,
        status: kotlin.collections.List<kotlin.String>? = null,
    ): AsyncTaskPage =
        delegate.listConversationAsyncTasks(channelId, conversationId, current, size, orderBy, orderDirection, orderNullHandling, keyword, status).bodyOrThrow()

    /**
     * 增量同步异步任务 / Sync asynchronous task updates
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param afterMessageId 通知消息同步游标。 / Notification-message sync cursor.
     * @param size 单页记录数。 / Number of records per page.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun syncConversationAsyncTasks(
        conversationId: kotlin.String,
        afterMessageId: kotlin.String? = null,
        size: kotlin.Int? = 50,
    ): AgentAsyncTaskSync =
        delegate.syncConversationAsyncTasks(channelId, conversationId, afterMessageId, size).bodyOrThrow()

    /**
     * 读取异步任务 / Get an asynchronous task
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param asyncTaskId 异步任务 ID。 / Asynchronous task ID.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getConversationAsyncTask(
        conversationId: kotlin.String,
        asyncTaskId: kotlin.String,
    ): AsyncTask =
        delegate.getConversationAsyncTask(channelId, conversationId, asyncTaskId).bodyOrThrow()

    /**
     * 分页查询子 Agent 任务 / List subagent tasks
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param current 从 0 开始的页码。 / Zero-based page index.
     * @param size 单页记录数。 / Number of records per page.
     * @param orderBy 排序字段列表。 / Ordered list of sort fields.
     * @param orderDirection 排序方向。 / Sort direction.
     * @param orderNullHandling 空值排序策略。 / Null ordering strategy.
     * @param keyword 标题或正文检索关键字。 / Title or content search keyword.
     * @param status 状态过滤条件。 / Status filter.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun listConversationSubagents(
        conversationId: kotlin.String,
        current: kotlin.Int? = null,
        size: kotlin.Int? = 30,
        orderBy: kotlin.collections.List<kotlin.String>? = null,
        orderDirection: GeneratedMessagesApi.OrderDirectionListConversationSubagents? = GeneratedMessagesApi.OrderDirectionListConversationSubagents.ASC,
        orderNullHandling: GeneratedMessagesApi.OrderNullHandlingListConversationSubagents? = GeneratedMessagesApi.OrderNullHandlingListConversationSubagents.NATIVE,
        keyword: kotlin.String? = null,
        status: kotlin.collections.List<kotlin.String>? = null,
    ): SubagentTaskPage =
        delegate.listConversationSubagents(channelId, conversationId, current, size, orderBy, orderDirection, orderNullHandling, keyword, status).bodyOrThrow()

    /**
     * 增量同步子 Agent 状态 / Sync subagent task updates
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param cursor 子 Agent 状态同步游标。 / Subagent-state sync cursor.
     * @param size 单页记录数。 / Number of records per page.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun syncConversationSubagents(
        conversationId: kotlin.String,
        cursor: kotlin.String? = null,
        size: kotlin.Int? = 50,
    ): SubagentTaskSync =
        delegate.syncConversationSubagents(channelId, conversationId, cursor, size).bodyOrThrow()

    /**
     * 读取子 Agent 状态 / Get a subagent task
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param subagentTaskId 子 Agent 任务 ID。 / Subagent task ID.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getConversationSubagent(
        conversationId: kotlin.String,
        subagentTaskId: kotlin.String,
    ): SubagentTask =
        delegate.getConversationSubagent(channelId, conversationId, subagentTaskId).bodyOrThrow()

    /**
     * 取消子 Agent 任务 / Cancel a subagent task
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param subagentTaskId 子 Agent 任务 ID。 / Subagent task ID.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun cancelConversationSubagent(
        conversationId: kotlin.String,
        subagentTaskId: kotlin.String,
    ): SubagentTask =
        delegate.cancelConversationSubagent(channelId, conversationId, subagentTaskId).bodyOrThrow()

    /**
     * 读取子 Agent 结果 / Get a subagent result
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param subagentTaskId 子 Agent 任务 ID。 / Subagent task ID.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getConversationSubagentResult(
        conversationId: kotlin.String,
        subagentTaskId: kotlin.String,
    ): SubagentTaskResult =
        delegate.getConversationSubagentResult(channelId, conversationId, subagentTaskId).bodyOrThrow()

    /**
     * 取消排队消息 / Cancel a queued message
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param messageId 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun cancelQueuedMessage(
        conversationId: kotlin.String,
        messageId: kotlin.String,
    ): ConversationMessage =
        delegate.cancelQueuedMessage(channelId, conversationId, messageId).bodyOrThrow()

    /**
     * 增量同步消息 / Sync conversation messages
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param afterMessageId 通知消息同步游标。 / Notification-message sync cursor.
     * @param size 单页记录数。 / Number of records per page.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun syncConversationMessages(
        conversationId: kotlin.String,
        afterMessageId: kotlin.String? = null,
        size: kotlin.Int? = 50,
    ): ConversationMessageSync =
        delegate.syncConversationMessages(channelId, conversationId, afterMessageId, size).bodyOrThrow()

}
