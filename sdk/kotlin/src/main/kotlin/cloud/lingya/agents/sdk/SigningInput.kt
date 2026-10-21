package cloud.lingya.agents.sdk

/** Fields included in an `OPENAPI-HMAC-SHA256-V1` signature. */
public data class SigningInput(
    public val accessKey: String,
    public val timestamp: Long,
    public val nonce: String,
    public val method: String,
    public val rawPath: String,
    public val rawQuery: String,
    public val encodedUser: String,
    public val contentType: String,
    public val body: ByteArray,
)
