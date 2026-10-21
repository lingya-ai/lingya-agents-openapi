package cloud.lingya.agents.sdk

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import okhttp3.OkHttpClient
import java.time.Clock

/**
 * 旧版带品牌前缀的客户端名称。 / Legacy brand-prefixed client name.
 *
 * @author 思追(shaco)
 */
@Deprecated("Use AgentsClient", ReplaceWith("AgentsClient(baseUrl, channelId, credentials)"))
public class LingyaAgentsClient @JvmOverloads constructor(
    baseUrl: String,
    channelId: String,
    credentials: OpenApiCredentials,
    transport: OkHttpClient = OkHttpClient.Builder().build(),
    objectMapper: ObjectMapper = jacksonObjectMapper()
        .findAndRegisterModules()
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false),
    retryPolicy: RetryPolicy = RetryPolicy.NONE,
    clock: Clock = Clock.systemUTC(),
    nonceSource: NonceSource = SecureNonceSource(),
) : AgentsClient(baseUrl, channelId, credentials, transport, objectMapper, retryPolicy, clock, nonceSource)
