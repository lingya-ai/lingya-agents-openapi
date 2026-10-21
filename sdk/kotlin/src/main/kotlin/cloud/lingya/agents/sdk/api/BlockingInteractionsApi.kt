package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.generated.api.InteractionsApi as GeneratedInteractionsApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking

/**
 * interactions 分组的 Java 友好阻塞接口。 / Java-friendly blocking interactions operations.
 *
 * @author 思追(shaco)
 */
public class BlockingInteractionsApi internal constructor(
    private val delegate: InteractionsApi,
) {
    /**
     * 提交计划审批 / Submit plan approval
     *
     * @param input 提交计划审批 / Submit plan approval 的强类型请求体。 / Typed request body for approvePlan.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun approvePlan(
        input: PlanApprovalInput,
    ): OperationResult = runBlocking {
        delegate.approvePlan(input)
    }

    /**
     * 查询计划审批状态 / Get plan approval status
     *
     * @param planId 等待审批的计划 ID。 / Pending plan-approval ID.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getPlanStatus(
        planId: kotlin.String,
    ): PlanStatus = runBlocking {
        delegate.getPlanStatus(planId)
    }

    /**
     * 查询用户问答状态 / Get user-input status
     *
     * @param questionId 等待回答的问题 ID。 / Pending question ID.
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param messageId 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getUserInputStatus(
        questionId: kotlin.String,
        conversationId: kotlin.String,
        messageId: kotlin.String,
    ): UserInputStatus = runBlocking {
        delegate.getUserInputStatus(questionId, conversationId, messageId)
    }

    /**
     * 提交用户回答 / Submit a user answer
     *
     * @param input 提交用户回答 / Submit a user answer 的强类型请求体。 / Typed request body for answerUserInput.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun answerUserInput(
        input: UserInputAnswerInput,
    ): OperationResult = runBlocking {
        delegate.answerUserInput(input)
    }

    /**
     * 查询消息计划审批状态 / Get message plan status
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param messageId 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getMessagePlanStatus(
        conversationId: kotlin.String,
        messageId: kotlin.String,
    ): PlanStatus = runBlocking {
        delegate.getMessagePlanStatus(conversationId, messageId)
    }

}
