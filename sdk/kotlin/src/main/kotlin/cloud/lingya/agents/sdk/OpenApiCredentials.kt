package cloud.lingya.agents.sdk

import java.nio.charset.StandardCharsets

/**
 * HMAC credentials for a Lingya Agents OpenAPI channel.
 *
 * The secret is deliberately inaccessible and is never included in [toString].
 */
public class OpenApiCredentials(
    public val accessKey: String,
    secret: String,
) {
    private val secretBytes: ByteArray = secret.toByteArray(StandardCharsets.UTF_8)

    init {
        require(ACCESS_KEY_PATTERN.matches(accessKey)) {
            "accessKey must contain exactly 32 Base64URL-safe characters"
        }
        require(secretBytes.isNotEmpty()) { "secret must not be empty" }
    }

    internal fun sign(input: SigningInput): String = OpenApiSigner.sign(secretBytes, input)

    override fun toString(): String = "OpenApiCredentials(accessKey=$accessKey, secret=<redacted>)"

    private companion object {
        val ACCESS_KEY_PATTERN = Regex("[A-Za-z0-9_-]{32}")
    }
}
