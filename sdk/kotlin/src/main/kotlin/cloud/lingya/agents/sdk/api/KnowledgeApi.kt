package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.AgentsUserClient
import cloud.lingya.agents.sdk.bodyOrThrow
import cloud.lingya.agents.sdk.generated.api.KnowledgeApi as GeneratedKnowledgeApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.Flow

/**
 * knowledge 分组的 channel 绑定异步接口。 / Channel-bound asynchronous knowledge operations.
 *
 * `channelId` 来自根客户端，避免调用方法时传入与签名目标不一致的 channel。
 * / `channelId` comes from the root client so method calls cannot diverge from the signed channel.
 *
 * @author 思追(shaco)
 */
public class KnowledgeApi internal constructor(
    private val channelId: String,
    private val delegate: GeneratedKnowledgeApi,
    private val userClient: AgentsUserClient,
) {
    /**
     * 批量读取引用元数据 / Get citation metadata in batch
     *
     * @param input 批量读取引用元数据 / Get citation metadata in batch 的强类型请求体。 / Typed request body for getCitationMetadataBatch.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getCitationMetadataBatch(
        input: kotlin.collections.List<ReturnedReference>,
    ): CitationMetadataList =
        delegate.getCitationMetadataBatch(channelId, input).bodyOrThrow()

    /**
     * 读取引用元数据 / Get citation metadata
     *
     * @param citationType 知识引用类型。 / Knowledge citation type.
     * @param referenceId 知识引用记录 ID。 / Knowledge-reference record ID.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getCitationMetadata(
        citationType: kotlin.String,
        referenceId: kotlin.Long,
    ): CitationMetadata =
        delegate.getCitationMetadata(channelId, citationType, referenceId).bodyOrThrow()

}
