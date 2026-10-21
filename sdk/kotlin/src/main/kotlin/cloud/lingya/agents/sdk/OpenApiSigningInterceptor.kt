package cloud.lingya.agents.sdk

import okhttp3.Interceptor
import okhttp3.Response
import okhttp3.RequestBody.Companion.toRequestBody
import okio.Buffer
import java.nio.charset.StandardCharsets
import java.time.Clock
import java.util.Base64

internal class OpenApiSigningInterceptor(
    private val credentials: OpenApiCredentials,
    externalUserId: String,
    private val clock: Clock,
    private val nonceSource: NonceSource,
) : Interceptor {
    private val encodedUser: String

    init {
        val userBytes = externalUserId.toByteArray(StandardCharsets.UTF_8)
        require(userBytes.size in 1..MAX_USER_BYTES && 0.toByte() !in userBytes) {
            "externalUserId must be 1 to 256 UTF-8 bytes and must not contain NUL"
        }
        encodedUser = Base64.getUrlEncoder().withoutPadding().encodeToString(userBytes)
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val body = original.body
        require(body?.isDuplex() != true && body?.isOneShot() != true) {
            "signed request bodies must be repeatable"
        }
        val buffer = Buffer()
        body?.writeTo(buffer)
        val bodyBytes = buffer.readByteArray()
        require(bodyBytes.size <= MAX_BODY_BYTES) { "request body exceeds the 2 MiB signing limit" }
        require(original.header("Content-Encoding") == null) { "Content-Encoding is not supported" }

        val contentType = original.header("Content-Type") ?: body?.contentType()?.toString().orEmpty()
        val nonce = nonceSource.nextNonce()
        validateNonce(nonce)
        val input = SigningInput(
            accessKey = credentials.accessKey,
            timestamp = clock.instant().epochSecond,
            nonce = nonce,
            method = original.method,
            rawPath = original.url.encodedPath,
            rawQuery = original.url.encodedQuery.orEmpty(),
            encodedUser = encodedUser,
            contentType = contentType,
            body = bodyBytes,
        )
        val rebuiltBody = body?.let { bodyBytes.toRequestBody(it.contentType()) }
        val signed = original.newBuilder()
            .method(original.method, rebuiltBody)
            .header("X-OpenAPI-AK", credentials.accessKey)
            .header("X-OpenAPI-Timestamp", input.timestamp.toString())
            .header("X-OpenAPI-Nonce", nonce)
            .header("X-OpenAPI-User", encodedUser)
            .header("X-OpenAPI-Signature", credentials.sign(input))
            .apply { if (contentType.isNotEmpty()) header("Content-Type", contentType) }
            .build()
        return chain.proceed(signed)
    }

    private companion object {
        const val MAX_BODY_BYTES = 2 * 1024 * 1024
        const val MAX_USER_BYTES = 256

        fun validateNonce(nonce: String) {
            require(nonce.matches(Regex("[A-Za-z0-9_-]+"))) { "nonce must be unpadded Base64URL" }
            val bytes = try {
                Base64.getUrlDecoder().decode(nonce)
            } catch (exception: IllegalArgumentException) {
                throw IllegalArgumentException("nonce must be unpadded Base64URL", exception)
            }
            require(bytes.size in 16..64) { "nonce must encode 16 to 64 bytes" }
            require(Base64.getUrlEncoder().withoutPadding().encodeToString(bytes) == nonce) {
                "nonce must use canonical unpadded Base64URL encoding"
            }
        }
    }
}
