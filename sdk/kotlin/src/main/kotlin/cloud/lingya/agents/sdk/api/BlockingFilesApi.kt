package cloud.lingya.agents.sdk.api

import cloud.lingya.agents.sdk.generated.api.FilesApi as GeneratedFilesApi
import cloud.lingya.agents.sdk.generated.model.*
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking

/**
 * files 分组的 Java 友好阻塞接口。 / Java-friendly blocking files operations.
 *
 * @author 思追(shaco)
 */
public class BlockingFilesApi internal constructor(
    private val delegate: FilesApi,
) {
    /**
     * 创建预签名上传地址 / Create a presigned upload URL
     *
     * @param input 创建预签名上传地址 / Create a presigned upload URL 的强类型请求体。 / Typed request body for createPreSignedUpload.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun createPreSignedUpload(
        input: GeneratePreSignedUrlInput,
    ): GeneratePreSignedUrlOutput = runBlocking {
        delegate.createPreSignedUpload(input)
    }

    /**
     * 确认预签名上传 / Confirm a presigned upload
     *
     * @param input 确认预签名上传 / Confirm a presigned upload 的强类型请求体。 / Typed request body for confirmPreSignedUpload.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun confirmPreSignedUpload(
        input: ConfirmUploadInput,
    ): AgentFile = runBlocking {
        delegate.confirmPreSignedUpload(input)
    }

    /**
     * 按 MD5 复用文件 / Reuse a file by MD5
     *
     * @param input 按 MD5 复用文件 / Reuse a file by MD5 的强类型请求体。 / Typed request body for createFileByContentMd5.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun createFileByContentMd5(
        input: CreateFileInput,
    ): AgentFile = runBlocking {
        delegate.createFileByContentMd5(input)
    }

    /**
     * 检查 MD5 文件是否存在 / Check file existence by MD5
     *
     * @param contentMd5 文件内容 MD5。 / MD5 digest of the file content.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun fileExistsByContentMd5(
        contentMd5: kotlin.String,
    ): FileExists = runBlocking {
        delegate.fileExistsByContentMd5(contentMd5)
    }

    /**
     * 创建会话文件预览地址 / Create a conversation file preview URL
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param fileId 文件记录 ID。 / File record ID.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getConversationFilePreview(
        conversationId: kotlin.String,
        fileId: kotlin.Long,
    ): PreSignedReadUrl = runBlocking {
        delegate.getConversationFilePreview(conversationId, fileId)
    }

    /**
     * 创建计划快照预览地址 / Create a plan snapshot preview URL
     *
     * @param conversationId 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
     * @param messageId 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
     * @param fileId 文件记录 ID。 / File record ID.
     * @return 契约定义的强类型响应。 / The typed response defined by the contract.
     */
    public fun getPlanIntermediateFilePreview(
        conversationId: kotlin.String,
        messageId: kotlin.String,
        fileId: kotlin.Long,
    ): PreSignedReadUrl = runBlocking {
        delegate.getPlanIntermediateFilePreview(conversationId, messageId, fileId)
    }

}
