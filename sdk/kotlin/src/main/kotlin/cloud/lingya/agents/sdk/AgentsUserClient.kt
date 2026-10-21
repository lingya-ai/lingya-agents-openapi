package cloud.lingya.agents.sdk

import cloud.lingya.agents.sdk.event.AiChatBriefEvent
import cloud.lingya.agents.sdk.event.AiChatEventDecoder
import cloud.lingya.agents.sdk.event.SseEventParser
import cloud.lingya.agents.sdk.api.ChatApi
import cloud.lingya.agents.sdk.api.ConfigurationApi
import cloud.lingya.agents.sdk.api.ConversationsApi
import cloud.lingya.agents.sdk.api.EventsApi
import cloud.lingya.agents.sdk.api.FilesApi
import cloud.lingya.agents.sdk.api.InteractionsApi
import cloud.lingya.agents.sdk.api.KnowledgeApi
import cloud.lingya.agents.sdk.api.MessagesApi
import cloud.lingya.agents.sdk.api.SqlApi
import cloud.lingya.agents.sdk.api.WorkspaceApi
import cloud.lingya.agents.sdk.generated.model.AiChatInput
import cloud.lingya.agents.sdk.generated.model.AiChatStreamInput
import cloud.lingya.agents.sdk.generated.model.AiChatSubmission
import cloud.lingya.agents.sdk.generated.model.ChatStreamProbeEvent
import cloud.lingya.agents.sdk.generated.model.ChatStreamProbeInput
import com.fasterxml.jackson.databind.ObjectMapper
import kotlinx.coroutines.launch
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.channels.trySendBlocking
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.transformWhile
import kotlinx.coroutines.flow.onCompletion
import okhttp3.Call
import okhttp3.Callback
import okhttp3.HttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import retrofit2.Retrofit
import retrofit2.converter.jackson.JacksonConverterFactory
import java.io.IOException

/**
 * 绑定一个 channel 和外部用户的签名协程客户端。 / Signed coroutine client scoped to one channel and external user.
 *
 * 业务方法从本客户端读取 `channelId`，调用者不应在每次请求中重复提供。
 * / Business operations read `channelId` from this client instead of accepting it per request.
 *
 * @author 思追(shaco)
 */
public class AgentsUserClient internal constructor(
    private val baseUrl: HttpUrl,
    public val channelId: String,
    private val transport: OkHttpClient,
    private val objectMapper: ObjectMapper,
    private val tokenProvider: TokenProvider? = null,
) {
    internal suspend fun <T> execute(options: RequestOptions, operation: suspend (AgentsApis) -> T): T = runRequest(options) {
        val apis = if (options.timeoutMs == null) lowLevel else AgentsApis(Retrofit.Builder().baseUrl(baseUrl)
            .client(transport.newBuilder().callTimeout(options.timeoutMs, java.util.concurrent.TimeUnit.MILLISECONDS).build())
            .addConverterFactory(JacksonConverterFactory.create(objectMapper)).build())
        operation(apis)
    }

    /** 供迁移和高级协议调试使用的生成 API。 / Generated APIs for migration and protocol-level debugging. */
    public val lowLevel: AgentsApis = AgentsApis(
        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(transport)
            .addConverterFactory(JacksonConverterFactory.create(objectMapper))
            .build(),
    )

    /** @suppress */
    @Deprecated("Use lowLevel only for compatibility; prefer the channel-bound groups")
    public val apis: AgentsApis
        get() = lowLevel

    /** 创建聊天和消费实时事件。 / Creates chats and consumes live events. */
    public val chat: ChatApi = ChatApi(channelId, lowLevel.chat, this)

    /** 读取 Agent 和会话配置。 / Reads Agent and conversation configuration. */
    public val configuration: ConfigurationApi = ConfigurationApi(channelId, lowLevel.configuration, this)

    /** 管理会话、状态和分享。 / Manages conversations, state, and sharing. */
    public val conversations: ConversationsApi = ConversationsApi(channelId, lowLevel.conversations, this)

    /** 读取持久化聊天事件。 / Reads persisted chat events. */
    public val events: EventsApi = EventsApi(channelId, lowLevel.events, this)

    /** 管理文件和预签名地址。 / Manages files and presigned URLs. */
    public val files: FilesApi = FilesApi(channelId, lowLevel.files, this)

    /** 处理计划审批和用户回答。 / Handles plan approvals and user answers. */
    public val interactions: InteractionsApi = InteractionsApi(channelId, lowLevel.interactions, this)

    /** 读取知识引用元数据。 / Reads knowledge citation metadata. */
    public val knowledge: KnowledgeApi = KnowledgeApi(channelId, lowLevel.knowledge, this)

    /** 读取消息和异步任务。 / Reads messages and asynchronous tasks. */
    public val messages: MessagesApi = MessagesApi(channelId, lowLevel.messages, this)

    /** 查询和导出 SQL 结果。 / Reads and exports SQL results. */
    public val sql: SqlApi = SqlApi(channelId, lowLevel.sql, this)

    /** 浏览会话工作区制品。 / Browses conversation workspace artifacts. */
    public val workspace: WorkspaceApi = WorkspaceApi(channelId, lowLevel.workspace, this)

    /** @suppress */
    @Deprecated("Use chat.createChat(input)", ReplaceWith("chat.createChat(input)"))
    public suspend fun createChat(input: AiChatInput): AiChatSubmission =
        chat.createChat(input)

    /** @suppress */
    @Deprecated("Use chat.continueChat(conversationId, input)", ReplaceWith("chat.continueChat(conversationId, input)"))
    public suspend fun continueChat(conversationId: String, input: AiChatInput): AiChatSubmission =
        chat.continueChat(conversationId, input)

    /** @suppress */
    @Deprecated("Use chat.streamChatEvents(conversationId, AiChatStreamInput(messageId), requestId)")
    @JvmOverloads
    public fun streamChatEvents(
        conversationId: String,
        messageId: String,
        requestId: String? = null,
    ): Flow<AiChatBriefEvent> = chat.streamChatEvents(conversationId, AiChatStreamInput(messageId), requestId)

    internal fun streamChatEventsInternal(
        conversationId: String,
        input: AiChatStreamInput,
        requestId: String? = null,
        options: RequestOptions = RequestOptions(),
    ): Flow<AiChatBriefEvent> {
        val url = baseUrl.newBuilder()
            .addPathSegments("api/agents/channel/openapi/v1")
            .addPathSegment(channelId)
            .addPathSegments("chat/conversations")
            .addPathSegment(conversationId)
            .addPathSegment("stream")
            .build()
        val bodyBytes = objectMapper.writeValueAsBytes(input)
        val request = Request.Builder()
            .url(url)
            .post(bodyBytes.toRequestBody(JSON_MEDIA_TYPE))
            .header("Accept", "text/event-stream")
            .apply { if (requestId != null) header("X-Request-ID", requestId) }
            .build()
        val decoder = AiChatEventDecoder(objectMapper)
        var ended = false
        return streamData(request, options).map(decoder::decode).transformWhile { event ->
            if (event.type == "end") ended = true
            emit(event)
            !ended
        }.onCompletion { cause -> if (cause == null && !ended) throw ApiException(0, null, "unexpected_eof") }
    }

    /** @suppress */
    @Deprecated("Use chat.probeEventStream(ChatStreamProbeInput(probeId), requestId)")
    @JvmOverloads
    public fun probeEventStream(
        probeId: String,
        requestId: String? = null,
    ): Flow<ChatStreamProbeEvent> = chat.probeEventStream(ChatStreamProbeInput(probeId), requestId)

    internal fun probeEventStreamInternal(
        input: ChatStreamProbeInput,
        requestId: String? = null,
        options: RequestOptions = RequestOptions(),
    ): Flow<ChatStreamProbeEvent> {
        val url = baseUrl.newBuilder()
            .addPathSegments("api/agents/channel/openapi/v1")
            .addPathSegment(channelId)
            .addPathSegments("chat/stream-probe")
            .build()
        val bodyBytes = objectMapper.writeValueAsBytes(input)
        val request = Request.Builder()
            .url(url)
            .post(bodyBytes.toRequestBody(JSON_MEDIA_TYPE))
            .header("Accept", "text/event-stream")
            .apply { if (requestId != null) header("X-Request-ID", requestId) }
            .build()
        return streamData(request, options).map { objectMapper.readValue(it, ChatStreamProbeEvent::class.java) }
    }

    private fun streamData(request: Request, options: RequestOptions): Flow<String> = flow {
        runRequest(options) { emitAll(streamDataSource(request, options)) }
    }

    private fun streamDataSource(request: Request, options: RequestOptions): Flow<String> = callbackFlow {
        val client = transport.newBuilder().apply {
            options.timeoutMs?.let { callTimeout(it, java.util.concurrent.TimeUnit.MILLISECONDS) }
            readTimeout(options.idleTimeoutMs ?: 0, java.util.concurrent.TimeUnit.MILLISECONDS)
        }.build()
        val call = client.newCall(request)
        call.enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                if (!call.isCanceled()) close(e)
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (!response.isSuccessful) {
                        close(ApiException(response.code, response.body.string(), requestId = response.header("X-Request-ID")))
                        return
                    }
                    if (response.header("Content-Type")?.substringBefore(';')?.trim()?.lowercase() != "text/event-stream") { close(ApiException(response.code, null, "protocol")); return }
                    options.notify(ConnectionEvent("opened", "sse", response.header("X-Request-ID")))
                    try {
                        val parser = SseEventParser()
                        val reader = response.body.byteStream().bufferedReader(Charsets.UTF_8)
                        while (true) {
                            val line = reader.readLine() ?: break
                            if (line.startsWith(':')) options.notify(ConnectionEvent(if (line.trim() == ":ready") "ready" else "heartbeat", "sse"))
                            parser.accept(line)?.let {
                                val end = objectMapper.readValue(it, StreamEventType::class.java).type == "end"
                                if (end) { response.close(); call.cancel() }
                                trySendBlocking(it).getOrThrow()
                                if (end) { close(); return }
                            }
                        }
                        parser.finish()?.let { trySendBlocking(it).getOrThrow() }
                        close()
                    } catch (exception: Exception) {
                        if (!call.isCanceled()) close(exception)
                    }
                }
            }
        })
        awaitClose { call.cancel(); options.notify(ConnectionEvent("closed", "sse")) }
    }

    internal fun subscribeChatEventsInternal(conversationId: String, input: AiChatStreamInput, transportName: String, options: RequestOptions): ChatSubscription {
        require(transportName == "sse" || transportName == "websocket")
        val connectionOptions = options.copy(connectionId = java.util.UUID.randomUUID().toString())
        val sourceOptions = connectionOptions.copy(onConnectionEvent = { event -> if (event.type != "closed") connectionOptions.notify(event) })
        return ChatSubscription(if (transportName == "sse") streamChatEventsInternal(conversationId, input, options = sourceOptions) else websocketEvents(conversationId, input, sourceOptions), connectionOptions, transportName)
    }

    private fun websocketEvents(conversationId: String, input: AiChatStreamInput, options: RequestOptions): Flow<AiChatBriefEvent> = flow {
        runRequest(options) {
            val token = try { tokenProvider?.let { freshToken(it, channelId) } }
            catch (error: kotlinx.coroutines.CancellationException) { throw error }
            catch (error: Exception) { throw ApiException(0, null, "authentication") }
            if (token != null && (token.isEmpty() || token.any { it.code !in 33..126 })) throw ApiException(0, null, "authentication")
            val url = baseUrl.newBuilder().addPathSegments("api/agents/channel/openapi/v1").addPathSegment(channelId)
                .addPathSegments("chat/conversations").addPathSegment(conversationId).addPathSegments("stream/ws").addQueryParameter("messageId", input.messageId).build()
            val request = Request.Builder().url(url).apply { if (token != null) header("Sec-WebSocket-Protocol", "xlt-openapi-token.$token") }.build()
            val client = transport.newBuilder().apply {
                interceptors().removeAll { it is OpenApiTokenInterceptor }
                networkInterceptors().removeAll { it is TokenAttemptInterceptor }
            }.build()
            emitAll(callbackFlow {
                var ready = false
                val activity = kotlinx.coroutines.channels.Channel<Unit>(kotlinx.coroutines.channels.Channel.CONFLATED)
                val idleWatcher = options.idleTimeoutMs?.let { idle ->
                    launch { while (true) { if (kotlinx.coroutines.withTimeoutOrNull(idle) { activity.receive() } == null) { close(ApiException(0, null, "timeout")); break } } }
                }
                val socket = client.newWebSocket(request, object : okhttp3.WebSocketListener() {
                    override fun onOpen(webSocket: okhttp3.WebSocket, response: Response) { options.notify(ConnectionEvent("opened", "websocket", response.header("X-Request-ID"))) }
                    override fun onMessage(webSocket: okhttp3.WebSocket, text: String) {
                        activity.trySend(Unit)
                        try {
                            val frame = objectMapper.readValue(text, WebSocketEnvelope::class.java)
                            if (frame.id != input.messageId) throw ApiException(0, null, "protocol")
                            when (frame.event) {
                                "ready" -> { ready = true; options.notify(ConnectionEvent("ready", "websocket")) }
                                "complete" -> { webSocket.close(1000, "complete"); close(TransportCompleted("complete")) }
                                "transport-error" -> { webSocket.close(1000, "error"); close(ApiException(0, frame.data?.rawJson, "protocol")) }
                                else -> {
                                    if (!ready) throw ApiException(0, null, "protocol")
                                    val event = AiChatEventDecoder(objectMapper).decode(frame.data?.rawJson ?: throw ApiException(0, null, "protocol"))
                                    if (event.type == "end") webSocket.close(1000, "end")
                                    if (!trySend(event).isSuccess) { webSocket.cancel(); throw ApiException(0, null, "protocol") }
                                    if (event.type == "end") close()
                                }
                            }
                        } catch (error: Exception) { webSocket.cancel(); close(if (error is ApiException) error else ApiException(0, null, "protocol", cause = error)) }
                    }
                    override fun onMessage(webSocket: okhttp3.WebSocket, bytes: okio.ByteString) { webSocket.cancel(); close(ApiException(0, null, "protocol")) }
                    override fun onClosing(webSocket: okhttp3.WebSocket, code: Int, reason: String) { webSocket.close(code, reason); if (code == 1000) close(TransportCompleted("normal")) else close(ApiException(0, null, "unexpected_eof")) }
                    override fun onFailure(webSocket: okhttp3.WebSocket, t: Throwable, response: Response?) { close(ApiException(response?.code ?: 0, null, "network", response?.header("X-Request-ID"))) }
                })
                awaitClose { idleWatcher?.cancel(); activity.close(); socket.cancel() }
            })
        }
    }

    private companion object {
        val JSON_MEDIA_TYPE = "application/json".toMediaType()
    }
}

private data class StreamEventType(val type: String = "")
