package cloud.lingya.agents.sdk
import cloud.lingya.agents.sdk.event.AiChatBriefEvent
import cloud.lingya.agents.sdk.event.captureRawJson
import com.fasterxml.jackson.databind.annotation.JsonDeserialize
import com.fasterxml.jackson.databind.JsonDeserializer
import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.databind.DeserializationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.*
internal class TransportCompleted(val reason: String) : RuntimeException()
internal data class WebSocketEnvelope(val id: String = "", val event: String = "", @JsonDeserialize(using = FrameDataDecoder::class) val data: FrameData? = null)
internal data class FrameData(val rawJson: String)
internal class FrameDataDecoder : JsonDeserializer<FrameData>() { override fun deserialize(parser: JsonParser, context: DeserializationContext): FrameData = FrameData(parser.captureRawJson(context).rawJson) }
/** Owns one connection. Collect events once, or close explicitly. No reconnect policy. */
public class ChatSubscription internal constructor(source: Flow<AiChatBriefEvent>, options: RequestOptions, transport: String) : AutoCloseable {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val channel = Channel<AiChatBriefEvent>(64)
    private val completion = CompletableDeferred<StreamCloseInfo>()
    public val closed: Deferred<StreamCloseInfo> get() = completion
    public val events: Flow<AiChatBriefEvent> = channel.receiveAsFlow().onCompletion { close() }
    init {
        scope.launch {
            var reason = "normal"
            var failure: Throwable? = null
            try { source.collect { event -> if (event.type == "end") reason = "end"; channel.send(event) } }
            catch (error: TransportCompleted) { reason = error.reason }
            catch (error: CancellationException) { reason = "closed" }
            catch (error: Throwable) { failure = error; reason = if (error is ApiException && error.kind == "timeout") "timeout" else "error" }
            finally {
                channel.close(failure)
                completion.complete(StreamCloseInfo(reason, failure))
                runCatching { options.notify(ConnectionEvent("closed", transport, reason = reason)) }
                scope.cancel()
            }
        }
    }
    public override fun close() { scope.cancel() }
}
