package cloud.lingya.agents.sdk

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.withTimeout
import okhttp3.Headers
import java.net.URLDecoder

/** Total timeout includes token acquisition and response consumption. Null disables it. */
public data class RequestOptions @JvmOverloads constructor(
    public val timeoutMs: Long? = null,
    public val idleTimeoutMs: Long? = null,
    public val onConnectionEvent: ((ConnectionEvent) -> Unit)? = null,
    internal val connectionId: String = java.util.UUID.randomUUID().toString(),
) { init { require(timeoutMs == null || timeoutMs > 0); require(idleTimeoutMs == null || idleTimeoutMs > 0) } }
public data class ConnectionEvent(public val type: String, public val transport: String, public val requestId: String? = null, public val reason: String? = null, public val closeCode: Int? = null, public val connectionId: String? = null)
public data class StreamCloseInfo(public val reason: String, public val error: Throwable? = null, public val closeCode: Int? = null)
public data class DownloadResponse(public val bytes: ByteArray, public val filename: String?, public val contentType: String?, public val headers: Headers, public val status: Int, public val requestId: String?)
internal suspend fun <T> runRequest(options: RequestOptions, operation: suspend () -> T): T = try {
    options.timeoutMs?.let { withTimeout(it) { operation() } } ?: operation()
} catch (error: TimeoutCancellationException) { throw ApiException(0, null, "timeout")
} catch (error: CancellationException) { throw error
} catch (error: ApiException) { throw error
} catch (error: com.fasterxml.jackson.core.JsonProcessingException) { throw ApiException(0, null, "protocol", cause = error)
} catch (error: AuthenticationIOException) { throw ApiException(0, null, "authentication", cause = error)
} catch (error: java.net.SocketTimeoutException) { throw ApiException(0, null, "timeout", cause = error)
} catch (error: java.io.InterruptedIOException) { throw ApiException(0, null, "timeout", cause = error)
} catch (error: java.io.IOException) { throw ApiException(0, null, "network", cause = error) }
internal fun filename(headers: Headers): String? {
    val value = headers["Content-Disposition"] ?: return null
    val encoded = Regex("filename\\*=UTF-8''([^;]+)", RegexOption.IGNORE_CASE).find(value)?.groupValues?.get(1)
    if (encoded != null) return runCatching { URLDecoder.decode(encoded.replace("+", "%2B"), "UTF-8") }.getOrNull()
    return Regex("filename=\"([^\"]*)\"|filename=([^;\\s]+)", RegexOption.IGNORE_CASE).find(value)?.groupValues?.drop(1)?.firstOrNull { it.isNotEmpty() }
}

internal class AuthenticationIOException(message: String) : java.io.IOException(message)
internal fun RequestOptions.notify(event: ConnectionEvent) { runCatching { onConnectionEvent?.invoke(event.copy(connectionId = connectionId)) } }

/** Recognizes native coroutine cancellation and the SDK classification. */
public fun isCancellation(error: Throwable): Boolean = error is CancellationException || error is ApiException && error.kind == "cancelled"
