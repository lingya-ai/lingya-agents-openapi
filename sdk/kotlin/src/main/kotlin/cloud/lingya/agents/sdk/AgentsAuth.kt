package cloud.lingya.agents.sdk

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** Context for each fresh token issuance. */
public data class TokenContext(public val channelId: String)

/** Each invocation must return a newly issued token. */
public fun interface TokenProvider {
    public suspend fun getToken(context: TokenContext): String
}

/** Mutually exclusive authentication modes. Credentials/providers are never printed. */
public sealed class AgentsAuth private constructor() {
    public class Hmac(public val credentials: OpenApiCredentials, public val externalUserId: String) : AgentsAuth()
    public class Token(public val tokenProvider: TokenProvider) : AgentsAuth()
}

/** Options bind authentication and user identity at construction. */
public class AgentsClientOptions @JvmOverloads constructor(
    public val baseUrl: String,
    public val channelId: String,
    public val auth: AgentsAuth,
    public val transport: okhttp3.OkHttpClient = okhttp3.OkHttpClient(),
)


/** Cancellation stops waiting even if custom issuer code delays cooperative cancellation. */
internal suspend fun freshToken(provider: TokenProvider, channelId: String): String = suspendCancellableCoroutine { continuation ->
    val scope = CoroutineScope(continuation.context.minusKey(Job) + SupervisorJob())
    val task = scope.launch {
        try {
            val token = provider.getToken(TokenContext(channelId))
            if (continuation.isActive) continuation.resume(token)
        } catch (error: kotlinx.coroutines.CancellationException) {
            if (continuation.isActive) continuation.cancel(error)
        } catch (error: Exception) {
            if (continuation.isActive) continuation.resumeWithException(AuthenticationIOException("OpenAPI token provider failed"))
        } finally { scope.cancel() }
    }
    continuation.invokeOnCancellation { task.cancel() }
}
