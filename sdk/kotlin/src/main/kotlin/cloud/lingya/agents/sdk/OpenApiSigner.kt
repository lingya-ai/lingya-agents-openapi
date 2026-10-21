package cloud.lingya.agents.sdk

import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/** Creates canonical requests and HMAC signatures for the public API protocol. */
public object OpenApiSigner {
    public const val VERSION: String = "OPENAPI-HMAC-SHA256-V1"

    /** Returns the exact newline-delimited text authenticated by the protocol. */
    public fun canonicalRequest(input: SigningInput): String =
        listOf(
            VERSION,
            input.accessKey,
            input.timestamp.toString(),
            input.nonce,
            input.method.uppercase(),
            input.rawPath,
            input.rawQuery,
            input.encodedUser,
            input.contentType,
            sha256Hex(input.body),
        ).joinToString("\n")

    internal fun sign(secret: ByteArray, input: SigningInput): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret, "HmacSHA256"))
        return mac.doFinal(canonicalRequest(input).toByteArray(StandardCharsets.UTF_8)).toHexLower()
    }

    private fun sha256Hex(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(bytes).toHexLower()

    private fun ByteArray.toHexLower(): String = joinToString("") { byte -> "%02x".format(byte.toInt() and 0xff) }
}
