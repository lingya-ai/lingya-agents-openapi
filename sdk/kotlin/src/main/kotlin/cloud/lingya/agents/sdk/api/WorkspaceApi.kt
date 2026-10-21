package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.AgentsUserClient
import cloud.lingya.agents.sdk.bodyOrThrow
import cloud.lingya.agents.sdk.generated.api.WorkspaceApi as GeneratedWorkspaceApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.Flow

/**
 * workspace 分组的 channel 绑定异步接口。 / Channel-bound asynchronous workspace operations.
 *
 * `channelId` 来自根客户端，避免调用方法时传入与签名目标不一致的 channel。
 * / `channelId` comes from the root client so method calls cannot diverge from the signed channel.
 *
 * @author 思追(shaco)
 */
public class WorkspaceApi internal constructor(
    private val channelId: String,
    private val delegate: GeneratedWorkspaceApi,
    private val userClient: AgentsUserClient,
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
    public suspend fun listWorkspaceArtifacts(
        conversationId: kotlin.String,
        current: kotlin.Int? = null,
        size: kotlin.Int? = 30,
        orderBy: kotlin.collections.List<kotlin.String>? = null,
        orderDirection: GeneratedWorkspaceApi.OrderDirectionListWorkspaceArtifacts? = GeneratedWorkspaceApi.OrderDirectionListWorkspaceArtifacts.ASC,
        orderNullHandling: GeneratedWorkspaceApi.OrderNullHandlingListWorkspaceArtifacts? = GeneratedWorkspaceApi.OrderNullHandlingListWorkspaceArtifacts.NATIVE,
        keyword: kotlin.String? = null,
        prefix: kotlin.String? = null,
    ): WorkspaceArtifactList =
        delegate.listWorkspaceArtifacts(channelId, conversationId, current, size, orderBy, orderDirection, orderNullHandling, keyword, prefix).bodyOrThrow()

    /**
     * 创建工作区文件预览地址 / Create a workspace file preview URL
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param path 工作区相对文件路径。 / Workspace-relative file path.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getWorkspaceFilePreview(
        conversationId: kotlin.String,
        path: kotlin.String,
    ): PreSignedReadUrl =
        delegate.getWorkspaceFilePreview(channelId, conversationId, path).bodyOrThrow()

}
