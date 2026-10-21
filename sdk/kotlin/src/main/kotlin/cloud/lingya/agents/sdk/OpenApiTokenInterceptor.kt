package cloud.lingya.agents.sdk

import java.io.IOException
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

/** Run on OkHttp's worker; no caching, retry, or HMAC fallback. */
internal class OpenApiTokenInterceptor(
    private val channelId: String,
    private val provider: TokenProvider,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        if (chain.call().isCanceled()) throw IOException("Request canceled")
        if (request.url.encodedPath.trimEnd('/').endsWith("/presign")) {
            throw AuthenticationIOException("presign requires HMAC authentication")
        }
        if (request.headers.names().any { it.startsWith("X-OpenAPI-", ignoreCase = true) }) {
            throw AuthenticationIOException("Authentication headers are managed by the SDK")
        }
        val token = try {
            runBlocking {
                val watcher = launch {
                    while (isActive) {
                        if (chain.call().isCanceled()) this@runBlocking.cancel()
                        delay(25)
                    }
                }
                try { freshToken(provider, channelId) } finally { watcher.cancel() }
            }
        } catch (_: Exception) {
            throw AuthenticationIOException("OpenAPI token provider failed")
        }
        if (chain.call().isCanceled()) throw IOException("Request canceled")
        if (token.isEmpty() || token.any { it.code !in 33..126 }) throw AuthenticationIOException("Invalid OpenAPI token")
        return chain.proceed(request.newBuilder().header("X-OpenAPI-Token", token)
            .tag(TokenAttempt::class.java, TokenAttempt())
            .header("Cache-Control", "no-store").build())
    }
}

internal class TokenAttempt {
    val sent = AtomicBoolean()
}

/** OkHttp can follow up 503/421 responses even with connection retries disabled. */
internal class TokenAttemptInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val attempt = chain.request().tag(TokenAttempt::class.java)
            ?: throw IOException("Missing token request attempt")
        if (!attempt.sent.compareAndSet(false, true)) {
            throw IOException("Automatic replay of a single-use token request is disabled")
        }
        return chain.proceed(chain.request())
    }
}
