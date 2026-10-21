package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.generated.api.WorkspaceApi as GeneratedWorkspaceApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking

/**
 * workspace 分组的 Java 友好阻塞接口。 / Java-friendly blocking workspace operations.
 *
 * @author 思追(shaco)
 */
public class BlockingWorkspaceApi internal constructor(
    private val delegate: WorkspaceApi,
) {
    /**
     * 分页查询工作区制品 / List workspace artifacts
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param current 从 0 开始的页码。 / Zero-based page index.
     * @param size 单页记录数。 / Number of records per page.
     * @param orderBy 排序字段列表。 / Ordered list of sort fields.
     * @param orderDirection 排序方向。 / Sort direction.
     * @param orderNullHandling 空值排序策略。 / Null ordering strategy.
     * @param keyword 标题或正文检索关键字。 / Title or content search keyword.
     * @param prefix 工作区相对路径前缀。 / Workspace-relative path prefix.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun listWorkspaceArtifacts(
        conversationId: kotlin.String,
        current: kotlin.Int? = null,
        size: kotlin.Int? = 30,
        orderBy: kotlin.collections.List<kotlin.String>? = null,
        orderDirection: GeneratedWorkspaceApi.OrderDirectionListWorkspaceArtifacts? = GeneratedWorkspaceApi.OrderDirectionListWorkspaceArtifacts.ASC,
        orderNullHandling: GeneratedWorkspaceApi.OrderNullHandlingListWorkspaceArtifacts? = GeneratedWorkspaceApi.OrderNullHandlingListWorkspaceArtifacts.NATIVE,
        keyword: kotlin.String? = null,
        prefix: kotlin.String? = null,
    ): WorkspaceArtifactList = runBlocking {
        delegate.listWorkspaceArtifacts(conversationId, current, size, orderBy, orderDirection, orderNullHandling, keyword, prefix)
    }

    /**
     * 创建工作区文件预览地址 / Create a workspace file preview URL
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param path 工作区相对文件路径。 / Workspace-relative file path.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getWorkspaceFilePreview(
        conversationId: kotlin.String,
        path: kotlin.String,
    ): PreSignedReadUrl = runBlocking {
        delegate.getWorkspaceFilePreview(conversationId, path)
    }

}
