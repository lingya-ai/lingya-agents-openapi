package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.AgentsUserClient
import cloud.lingya.agents.sdk.bodyOrThrow
import cloud.lingya.agents.sdk.generated.api.ConfigurationApi as GeneratedConfigurationApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.Flow

/**
 * configuration 分组的 channel 绑定异步接口。 / Channel-bound asynchronous configuration operations.
 *
 * `channelId` 来自根客户端，避免调用方法时传入与签名目标不一致的 channel。
 * / `channelId` comes from the root client so method calls cannot diverge from the signed channel.
 *
 * @author 思追(shaco)
 */
public class ConfigurationApi internal constructor(
    private val channelId: String,
    private val delegate: GeneratedConfigurationApi,
    private val userClient: AgentsUserClient,
) {
    /**
     * 读取 Agent 配置 / Get Agent configuration
     *
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getAgentsConfig(
    ): AgentsConfig =
        delegate.getAgentsConfig(channelId).bodyOrThrow()

    /**
     * 读取会话配置 / Get conversation configuration
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getConversationConfig(
        conversationId: kotlin.String,
    ): ConversationConfig =
        delegate.getConversationConfig(channelId, conversationId).bodyOrThrow()

    /**
     * 签发一次性短期渠道令牌 / Create a single-use short-lived channel token
     *
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun createOpenApiToken(
    ): OpenApiToken =
        delegate.createOpenApiToken(channelId).bodyOrThrow()

}
