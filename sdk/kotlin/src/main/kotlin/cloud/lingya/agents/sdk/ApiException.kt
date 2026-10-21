package cloud.lingya.agents.sdk
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
internal data class ErrorPayload(val code: String? = null, val message: String? = null, val fields: List<ApiException.FieldError> = emptyList())
private fun errorPayload(body: String?): ErrorPayload? = runCatching { body?.let { jacksonObjectMapper().configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false).readValue(it, ErrorPayload::class.java) } }.getOrNull()
/** Uniform error. Status zero means no HTTP response was available. */
public open class ApiException @JvmOverloads constructor(
    public val statusCode: Int, public val responseBody: String?, public val kind: String = "http",
    public val requestId: String? = null, cause: Throwable? = null,
) : RuntimeException(errorPayload(responseBody)?.message ?: "Lingya Agents API $kind $statusCode", cause) {
    private val decoded = errorPayload(responseBody)
    public val code: String? get() = decoded?.code
    public val fields: List<FieldError> get() = decoded?.fields ?: emptyList()
    public data class FieldError(public val field: String, public val message: String)
}
