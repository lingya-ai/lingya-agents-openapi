package cloud.lingya.agents.sdk

import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import java.time.Clock

/** HMAC or single-use token client with backward-compatible credential constructors. */
public open class AgentsClient private constructor(
    baseUrl: String,
    public val channelId: String,
    private val credentials: OpenApiCredentials?,
    private val transport: OkHttpClient,
    private val objectMapper: ObjectMapper,
    private val retryPolicy: RetryPolicy,
    private val clock: Clock,
    private val nonceSource: NonceSource,
    private val auth: AgentsAuth?,
) {
    internal val baseUrl: HttpUrl = normalizeBaseUrl(baseUrl)

    init {
        require(channelId.isNotBlank()) { "channelId must not be blank" }
        require((credentials == null) != (auth == null)) { "Provide either credentials or auth" }
    }

    /** Original credential constructor, including its JVM default-argument signature. */
    @JvmOverloads
    public constructor(
        baseUrl: String,
        channelId: String,
        credentials: OpenApiCredentials,
        transport: OkHttpClient = OkHttpClient.Builder().build(),
        objectMapper: ObjectMapper = defaultObjectMapper(),
        retryPolicy: RetryPolicy = RetryPolicy.NONE,
        clock: Clock = Clock.systemUTC(),
        nonceSource: NonceSource = SecureNonceSource(),
    ) : this(baseUrl, channelId, credentials, transport, objectMapper, retryPolicy, clock, nonceSource, null)

    /** Construct an identity-bound HMAC or token client. */
    public constructor(options: AgentsClientOptions) : this(
        options.baseUrl, options.channelId, null, options.transport,
        defaultObjectMapper(), RetryPolicy.NONE, Clock.systemUTC(), SecureNonceSource(), options.auth,
    )

    private val bound: AgentsUserClient by lazy {
        when (val mode = auth) {
            is AgentsAuth.Hmac -> signedUser(mode.credentials, mode.externalUserId)
            is AgentsAuth.Token -> {
                val client = transport.newBuilder().retryOnConnectionFailure(false)
                    .followRedirects(false).followSslRedirects(false)
                    .authenticator(okhttp3.Authenticator.NONE).proxyAuthenticator(okhttp3.Authenticator.NONE)
                    .addInterceptor(OpenApiTokenInterceptor(channelId, mode.tokenProvider))
                    .addNetworkInterceptor(TokenAttemptInterceptor()).build()
                AgentsUserClient(this@AgentsClient.baseUrl, channelId, client, objectMapper, mode.tokenProvider)
            }
            null -> error("Call forUser before using a legacy channel client")
        }
    }

    /** Java-friendly blocking API for an identity-bound options client. */
    public fun blocking(): BlockingAgentsUserClient = BlockingAgentsUserClient(bound)

    /** Creates a client that signs every call with one external user identity. */
    public fun forUser(externalUserId: String): AgentsUserClient {
        check(auth == null) { "Auth already binds identity; create a new client to switch users" }
        return signedUser(requireNotNull(credentials), externalUserId)
    }

    private fun signedUser(credentials: OpenApiCredentials, externalUserId: String): AgentsUserClient {
        val builder = transport.newBuilder().retryOnConnectionFailure(false)
        if (retryPolicy.maxAttempts > 1) builder.addInterceptor(IdempotentRetryInterceptor(retryPolicy))
        builder.addNetworkInterceptor(OpenApiSigningInterceptor(credentials, externalUserId, clock, nonceSource))
        return AgentsUserClient(baseUrl, channelId, builder.build(), objectMapper)
    }

    /** Returns the Java-friendly blocking facade for one external user. */
    public fun blockingForUser(externalUserId: String): BlockingAgentsUserClient =
        BlockingAgentsUserClient(forUser(externalUserId))

    /** Identity-bound chat API. */
    public val chat: cloud.lingya.agents.sdk.api.ChatApi get() = bound.chat

    /** Identity-bound configuration API. */
    public val configuration: cloud.lingya.agents.sdk.api.ConfigurationApi get() = bound.configuration

    /** Identity-bound conversations API. */
    public val conversations: cloud.lingya.agents.sdk.api.ConversationsApi get() = bound.conversations

    /** Identity-bound events API. */
    public val events: cloud.lingya.agents.sdk.api.EventsApi get() = bound.events

    /** Identity-bound files API. */
    public val files: cloud.lingya.agents.sdk.api.FilesApi get() = bound.files

    /** Identity-bound interactions API. */
    public val interactions: cloud.lingya.agents.sdk.api.InteractionsApi get() = bound.interactions

    /** Identity-bound knowledge API. */
    public val knowledge: cloud.lingya.agents.sdk.api.KnowledgeApi get() = bound.knowledge

    /** Identity-bound messages API. */
    public val messages: cloud.lingya.agents.sdk.api.MessagesApi get() = bound.messages

    /** Identity-bound sql API. */
    public val sql: cloud.lingya.agents.sdk.api.SqlApi get() = bound.sql

    /** Identity-bound workspace API. */
    public val workspace: cloud.lingya.agents.sdk.api.WorkspaceApi get() = bound.workspace

    private companion object {
        fun normalizeBaseUrl(value: String): HttpUrl = (if (value.endsWith('/')) value else "$value/").toHttpUrl()

        fun defaultObjectMapper(): ObjectMapper = jacksonObjectMapper()
            .findAndRegisterModules()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
    }
}
