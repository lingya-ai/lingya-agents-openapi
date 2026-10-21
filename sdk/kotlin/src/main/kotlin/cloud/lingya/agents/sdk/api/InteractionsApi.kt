package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.AgentsUserClient
import cloud.lingya.agents.sdk.bodyOrThrow
import cloud.lingya.agents.sdk.generated.api.InteractionsApi as GeneratedInteractionsApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.Flow

/**
 * interactions 分组的 channel 绑定异步接口。 / Channel-bound asynchronous interactions operations.
 *
 * `channelId` 来自根客户端，避免调用方法时传入与签名目标不一致的 channel。
 * / `channelId` comes from the root client so method calls cannot diverge from the signed channel.
 *
 * @author 思追(shaco)
 */
public class InteractionsApi internal constructor(
    private val channelId: String,
    private val delegate: GeneratedInteractionsApi,
    private val userClient: AgentsUserClient,
) {
    /**
     * 提交计划审批 / Submit plan approval
     *
     * @param input 提交计划审批 / Submit plan approval 的强类型请求体。 / Typed request body for approvePlan.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun approvePlan(
        input: PlanApprovalInput,
    ): OperationResult =
        delegate.approvePlan(channelId, input).bodyOrThrow()

    /**
     * 查询计划审批状态 / Get plan approval status
     *
     * @param planId 等待审批的计划 ID。 / Pending plan-approval ID.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getPlanStatus(
        planId: kotlin.String,
    ): PlanStatus =
        delegate.getPlanStatus(channelId, planId).bodyOrThrow()

    /**
     * 查询用户问答状态 / Get user-input status
     *
     * @param questionId 等待回答的问题 ID。 / Pending question ID.
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param messageId 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getUserInputStatus(
        questionId: kotlin.String,
        conversationId: kotlin.String,
        messageId: kotlin.String,
    ): UserInputStatus =
        delegate.getUserInputStatus(channelId, questionId, conversationId, messageId).bodyOrThrow()

    /**
     * 提交用户回答 / Submit a user answer
     *
     * @param input 提交用户回答 / Submit a user answer 的强类型请求体。 / Typed request body for answerUserInput.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun answerUserInput(
        input: UserInputAnswerInput,
    ): OperationResult =
        delegate.answerUserInput(channelId, input).bodyOrThrow()

    /**
     * 查询消息计划审批状态 / Get message plan status
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param messageId 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getMessagePlanStatus(
        conversationId: kotlin.String,
        messageId: kotlin.String,
    ): PlanStatus =
        delegate.getMessagePlanStatus(channelId, conversationId, messageId).bodyOrThrow()

}
