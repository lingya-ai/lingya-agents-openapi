package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.generated.api.ConversationsApi as GeneratedConversationsApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking

/**
 * conversations 分组的 Java 友好阻塞接口。 / Java-friendly blocking conversations operations.
 *
 * @author 思追(shaco)
 */
public class BlockingConversationsApi internal constructor(
    private val delegate: ConversationsApi,
) {
    /**
     * 删除会话 / Delete a conversation
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun deleteConversation(
        conversationId: kotlin.String,
    ): Unit = runBlocking {
        delegate.deleteConversation(conversationId)
    }

    /**
     * 读取会话摘要 / Get conversation summary
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getConversationSummary(
        conversationId: kotlin.String,
    ): ConversationSummary = runBlocking {
        delegate.getConversationSummary(conversationId)
    }

    /**
     * 读取上下文占用 / Get context usage
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getConversationContextUsage(
        conversationId: kotlin.String,
    ): ConversationContextUsage = runBlocking {
        delegate.getConversationContextUsage(conversationId)
    }

    /**
     * 分页查询会话 / List conversations
     *
     * @param current 从 0 开始的页码。 / Zero-based page index.
     * @param size 单页记录数。 / Number of records per page.
     * @param status 状态过滤条件。 / Status filter.
     * @param keyword 标题或正文检索关键字。 / Title or content search keyword.
     * @param groupFilter 字段 groupFilter / group filter field。
     * @param groupId groupFilter 为 GROUP 时必填。 / Required when groupFilter is GROUP.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun listConversations(
        current: kotlin.Int? = 0,
        size: kotlin.Int? = 30,
        status: GeneratedConversationsApi.StatusListConversations? = GeneratedConversationsApi.StatusListConversations.ACTIVE,
        keyword: kotlin.String? = null,
        groupFilter: GeneratedConversationsApi.GroupFilterListConversations? = GeneratedConversationsApi.GroupFilterListConversations.ALL,
        groupId: kotlin.Long? = null,
    ): ConversationSummaryList = runBlocking {
        delegate.listConversations(current, size, status, keyword, groupFilter, groupId)
    }

    /**
     * 查询活动会话 / List active conversations
     *
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun listActiveConversations(
    ): ConversationIds = runBlocking {
        delegate.listActiveConversations()
    }

    /**
     * 查询未读会话 / List unread conversations
     *
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun listUnreadConversations(
    ): ConversationIds = runBlocking {
        delegate.listUnreadConversations()
    }

    /**
     * 批量查询会话活动 / Query conversation activities
     *
     * @param input 批量查询会话活动 / Query conversation activities 的强类型请求体。 / Typed request body for queryConversationActivities.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun queryConversationActivities(
        input: ConversationActivityBatchInput,
    ): ConversationActivityList = runBlocking {
        delegate.queryConversationActivities(input)
    }

    /**
     * 推进会话已读游标 / Mark a conversation as read
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param input 推进会话已读游标 / Mark a conversation as read 的强类型请求体。 / Typed request body for markConversationRead.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun markConversationRead(
        conversationId: kotlin.String,
        input: ConversationReadReceiptInput,
    ): ConversationReadReceipt = runBlocking {
        delegate.markConversationRead(conversationId, input)
    }

    /**
     * 读取会话统计 / Get conversation statistics
     *
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getConversationStats(
    ): ConversationStats = runBlocking {
        delegate.getConversationStats()
    }

    /**
     * 读取会话标题 / Get conversation title
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getConversationTitle(
        conversationId: kotlin.String,
    ): ConversationTitle = runBlocking {
        delegate.getConversationTitle(conversationId)
    }

    /**
     * 更新会话标题 / Update conversation title
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param input 更新会话标题 / Update conversation title 的强类型请求体。 / Typed request body for updateConversationTitle.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun updateConversationTitle(
        conversationId: kotlin.String,
        input: ConversationTitleInput,
    ): ConversationMetadata = runBlocking {
        delegate.updateConversationTitle(conversationId, input)
    }

    /**
     * 更新会话状态 / Update conversation status
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param input 更新会话状态 / Update conversation status 的强类型请求体。 / Typed request body for updateConversationStatus.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun updateConversationStatus(
        conversationId: kotlin.String,
        input: ConversationStatusInput,
    ): Unit = runBlocking {
        delegate.updateConversationStatus(conversationId, input)
    }

    /**
     * 查询会话分组 / List conversation groups
     *
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun listConversationGroups(
    ): ConversationGroupList = runBlocking {
        delegate.listConversationGroups()
    }

    /**
     * 创建会话分组 / Create conversation group
     *
     * @param input 创建会话分组 / Create conversation group 的强类型请求体。 / Typed request body for createConversationGroup.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun createConversationGroup(
        input: ConversationGroupNameInput,
    ): ConversationGroup = runBlocking {
        delegate.createConversationGroup(input)
    }

    /**
     * 重命名会话分组 / Rename conversation group
     *
     * @param groupId 字段 groupId / group id field。
     * @param input 重命名会话分组 / Rename conversation group 的强类型请求体。 / Typed request body for renameConversationGroup.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun renameConversationGroup(
        groupId: kotlin.Long,
        input: ConversationGroupNameInput,
    ): ConversationGroup = runBlocking {
        delegate.renameConversationGroup(groupId, input)
    }

    /**
     * 删除会话分组 / Delete conversation group
     *
     * @param groupId 字段 groupId / group id field。
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun deleteConversationGroup(
        groupId: kotlin.Long,
    ): ConversationGroupDeleted = runBlocking {
        delegate.deleteConversationGroup(groupId)
    }

    /**
     * 移动会话分组 / Move conversation to group
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param input 移动会话分组 / Move conversation to group 的强类型请求体。 / Typed request body for moveConversationToGroup.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun moveConversationToGroup(
        conversationId: kotlin.String,
        input: UpdateConversationGroupInput,
    ): ConversationMetadata = runBlocking {
        delegate.moveConversationToGroup(conversationId, input)
    }

}
