package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.generated.api.MessagesApi as GeneratedMessagesApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking

/**
 * messages 分组的 Java 友好阻塞接口。 / Java-friendly blocking messages operations.
 *
 * @author 思追(shaco)
 */
public class BlockingMessagesApi internal constructor(
    private val delegate: MessagesApi,
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
    public fun listConversationMessages(
        conversationId: kotlin.String,
        current: kotlin.Int? = null,
        size: kotlin.Int? = 30,
        orderBy: kotlin.collections.List<kotlin.String>? = null,
        orderDirection: GeneratedMessagesApi.OrderDirectionListConversationMessages? = GeneratedMessagesApi.OrderDirectionListConversationMessages.ASC,
        orderNullHandling: GeneratedMessagesApi.OrderNullHandlingListConversationMessages? = GeneratedMessagesApi.OrderNullHandlingListConversationMessages.NATIVE,
        keyword: kotlin.String? = null,
    ): ConversationMessagePage = runBlocking {
        delegate.listConversationMessages(conversationId, current, size, orderBy, orderDirection, orderNullHandling, keyword)
    }

    /**
     * 读取单条会话消息 / Get a conversation message
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param messageId 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getConversationMessage(
        conversationId: kotlin.String,
        messageId: kotlin.String,
    ): ConversationMessage = runBlocking {
        delegate.getConversationMessage(conversationId, messageId)
    }

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
    public fun listConversationAsyncTasks(
        conversationId: kotlin.String,
        current: kotlin.Int? = null,
        size: kotlin.Int? = 30,
        orderBy: kotlin.collections.List<kotlin.String>? = null,
        orderDirection: GeneratedMessagesApi.OrderDirectionListConversationAsyncTasks? = GeneratedMessagesApi.OrderDirectionListConversationAsyncTasks.ASC,
        orderNullHandling: GeneratedMessagesApi.OrderNullHandlingListConversationAsyncTasks? = GeneratedMessagesApi.OrderNullHandlingListConversationAsyncTasks.NATIVE,
        keyword: kotlin.String? = null,
        status: kotlin.collections.List<kotlin.String>? = null,
    ): AsyncTaskPage = runBlocking {
        delegate.listConversationAsyncTasks(conversationId, current, size, orderBy, orderDirection, orderNullHandling, keyword, status)
    }

    /**
     * 增量同步异步任务 / Sync asynchronous task updates
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param afterMessageId 通知消息同步游标。 / Notification-message sync cursor.
     * @param size 单页记录数。 / Number of records per page.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun syncConversationAsyncTasks(
        conversationId: kotlin.String,
        afterMessageId: kotlin.String? = null,
        size: kotlin.Int? = 50,
    ): AgentAsyncTaskSync = runBlocking {
        delegate.syncConversationAsyncTasks(conversationId, afterMessageId, size)
    }

    /**
     * 读取异步任务 / Get an asynchronous task
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param asyncTaskId 异步任务 ID。 / Asynchronous task ID.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getConversationAsyncTask(
        conversationId: kotlin.String,
        asyncTaskId: kotlin.String,
    ): AsyncTask = runBlocking {
        delegate.getConversationAsyncTask(conversationId, asyncTaskId)
    }

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
    public fun listConversationSubagents(
        conversationId: kotlin.String,
        current: kotlin.Int? = null,
        size: kotlin.Int? = 30,
        orderBy: kotlin.collections.List<kotlin.String>? = null,
        orderDirection: GeneratedMessagesApi.OrderDirectionListConversationSubagents? = GeneratedMessagesApi.OrderDirectionListConversationSubagents.ASC,
        orderNullHandling: GeneratedMessagesApi.OrderNullHandlingListConversationSubagents? = GeneratedMessagesApi.OrderNullHandlingListConversationSubagents.NATIVE,
        keyword: kotlin.String? = null,
        status: kotlin.collections.List<kotlin.String>? = null,
    ): SubagentTaskPage = runBlocking {
        delegate.listConversationSubagents(conversationId, current, size, orderBy, orderDirection, orderNullHandling, keyword, status)
    }

    /**
     * 增量同步子 Agent 状态 / Sync subagent task updates
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param cursor 子 Agent 状态同步游标。 / Subagent-state sync cursor.
     * @param size 单页记录数。 / Number of records per page.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun syncConversationSubagents(
        conversationId: kotlin.String,
        cursor: kotlin.String? = null,
        size: kotlin.Int? = 50,
    ): SubagentTaskSync = runBlocking {
        delegate.syncConversationSubagents(conversationId, cursor, size)
    }

    /**
     * 读取子 Agent 状态 / Get a subagent task
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param subagentTaskId 子 Agent 任务 ID。 / Subagent task ID.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getConversationSubagent(
        conversationId: kotlin.String,
        subagentTaskId: kotlin.String,
    ): SubagentTask = runBlocking {
        delegate.getConversationSubagent(conversationId, subagentTaskId)
    }

    /**
     * 取消子 Agent 任务 / Cancel a subagent task
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param subagentTaskId 子 Agent 任务 ID。 / Subagent task ID.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun cancelConversationSubagent(
        conversationId: kotlin.String,
        subagentTaskId: kotlin.String,
    ): SubagentTask = runBlocking {
        delegate.cancelConversationSubagent(conversationId, subagentTaskId)
    }

    /**
     * 读取子 Agent 结果 / Get a subagent result
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param subagentTaskId 子 Agent 任务 ID。 / Subagent task ID.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getConversationSubagentResult(
        conversationId: kotlin.String,
        subagentTaskId: kotlin.String,
    ): SubagentTaskResult = runBlocking {
        delegate.getConversationSubagentResult(conversationId, subagentTaskId)
    }

    /**
     * 取消排队消息 / Cancel a queued message
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param messageId 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun cancelQueuedMessage(
        conversationId: kotlin.String,
        messageId: kotlin.String,
    ): ConversationMessage = runBlocking {
        delegate.cancelQueuedMessage(conversationId, messageId)
    }

    /**
     * 增量同步消息 / Sync conversation messages
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param afterMessageId 通知消息同步游标。 / Notification-message sync cursor.
     * @param size 单页记录数。 / Number of records per page.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun syncConversationMessages(
        conversationId: kotlin.String,
        afterMessageId: kotlin.String? = null,
        size: kotlin.Int? = 50,
    ): ConversationMessageSync = runBlocking {
        delegate.syncConversationMessages(conversationId, afterMessageId, size)
    }

}
