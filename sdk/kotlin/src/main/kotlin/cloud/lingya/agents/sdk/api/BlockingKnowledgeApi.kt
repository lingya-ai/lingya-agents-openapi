package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.generated.api.KnowledgeApi as GeneratedKnowledgeApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking

/**
 * knowledge 分组的 Java 友好阻塞接口。 / Java-friendly blocking knowledge operations.
 *
 * @author 思追(shaco)
 */
public class BlockingKnowledgeApi internal constructor(
    private val delegate: KnowledgeApi,
) {
    /**
     * 批量读取引用元数据 / Get citation metadata in batch
     *
     * @param input 批量读取引用元数据 / Get citation metadata in batch 的强类型请求体。 / Typed request body for getCitationMetadataBatch.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getCitationMetadataBatch(
        input: kotlin.collections.List<ReturnedReference>,
    ): CitationMetadataList = runBlocking {
        delegate.getCitationMetadataBatch(input)
    }

    /**
     * 读取引用元数据 / Get citation metadata
     *
     * @param citationType 知识引用类型。 / Knowledge citation type.
     * @param referenceId 知识引用记录 ID。 / Knowledge-reference record ID.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getCitationMetadata(
        citationType: kotlin.String,
        referenceId: kotlin.Long,
    ): CitationMetadata = runBlocking {
        delegate.getCitationMetadata(citationType, referenceId)
    }

}
