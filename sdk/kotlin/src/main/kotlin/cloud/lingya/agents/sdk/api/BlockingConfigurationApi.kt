package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.generated.api.ConfigurationApi as GeneratedConfigurationApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking

/**
 * configuration 分组的 Java 友好阻塞接口。 / Java-friendly blocking configuration operations.
 *
 * @author 思追(shaco)
 */
public class BlockingConfigurationApi internal constructor(
    private val delegate: ConfigurationApi,
) {
    /**
     * 读取 Agent 配置 / Get Agent configuration
     *
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getAgentsConfig(
    ): AgentsConfig = runBlocking {
        delegate.getAgentsConfig()
    }

    /**
     * 读取会话配置 / Get conversation configuration
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getConversationConfig(
        conversationId: kotlin.String,
    ): ConversationConfig = runBlocking {
        delegate.getConversationConfig(conversationId)
    }

    /**
     * 签发一次性短期渠道令牌 / Create a single-use short-lived channel token
     *
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun createOpenApiToken(
    ): OpenApiToken = runBlocking {
        delegate.createOpenApiToken()
    }

}
