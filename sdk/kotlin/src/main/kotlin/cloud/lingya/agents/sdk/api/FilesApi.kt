package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.AgentsUserClient
import cloud.lingya.agents.sdk.bodyOrThrow
import cloud.lingya.agents.sdk.generated.api.FilesApi as GeneratedFilesApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.Flow

/**
 * files 分组的 channel 绑定异步接口。 / Channel-bound asynchronous files operations.
 *
 * `channelId` 来自根客户端，避免调用方法时传入与签名目标不一致的 channel。
 * / `channelId` comes from the root client so method calls cannot diverge from the signed channel.
 *
 * @author 思追(shaco)
 */
public class FilesApi internal constructor(
    private val channelId: String,
    private val delegate: GeneratedFilesApi,
    private val userClient: AgentsUserClient,
) {
    /**
     * 创建预签名上传地址 / Create a presigned upload URL
     *
     * @param input 创建预签名上传地址 / Create a presigned upload URL 的强类型请求体。 / Typed request body for createPreSignedUpload.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun createPreSignedUpload(
        input: GeneratePreSignedUrlInput,
    ): GeneratePreSignedUrlOutput =
        delegate.createPreSignedUpload(channelId, input).bodyOrThrow()

    /**
     * 确认预签名上传 / Confirm a presigned upload
     *
     * @param input 确认预签名上传 / Confirm a presigned upload 的强类型请求体。 / Typed request body for confirmPreSignedUpload.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun confirmPreSignedUpload(
        input: ConfirmUploadInput,
    ): AgentFile =
        delegate.confirmPreSignedUpload(channelId, input).bodyOrThrow()

    /**
     * 按 MD5 复用文件 / Reuse a file by MD5
     *
     * @param input 按 MD5 复用文件 / Reuse a file by MD5 的强类型请求体。 / Typed request body for createFileByContentMd5.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun createFileByContentMd5(
        input: CreateFileInput,
    ): AgentFile =
        delegate.createFileByContentMd5(channelId, input).bodyOrThrow()

    /**
     * 检查 MD5 文件是否存在 / Check file existence by MD5
     *
     * @param contentMd5 文件内容 MD5。 / MD5 digest of the file content.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun fileExistsByContentMd5(
        contentMd5: kotlin.String,
    ): FileExists =
        delegate.fileExistsByContentMd5(channelId, contentMd5).bodyOrThrow()

    /**
     * 创建会话文件预览地址 / Create a conversation file preview URL
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param fileId 文件记录 ID。 / File record ID.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getConversationFilePreview(
        conversationId: kotlin.String,
        fileId: kotlin.Long,
    ): PreSignedReadUrl =
        delegate.getConversationFilePreview(channelId, conversationId, fileId).bodyOrThrow()

    /**
     * 创建计划快照预览地址 / Create a plan snapshot preview URL
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param messageId 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
     * @param fileId 文件记录 ID。 / File record ID.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public suspend fun getPlanIntermediateFilePreview(
        conversationId: kotlin.String,
        messageId: kotlin.String,
        fileId: kotlin.Long,
    ): PreSignedReadUrl =
        delegate.getPlanIntermediateFilePreview(channelId, conversationId, messageId, fileId).bodyOrThrow()

}
