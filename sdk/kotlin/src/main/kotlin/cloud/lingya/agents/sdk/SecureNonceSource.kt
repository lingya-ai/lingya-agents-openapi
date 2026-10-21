package cloud.lingya.agents.sdk

import java.security.SecureRandom
import java.util.Base64

/** Produces 32-byte cryptographically secure nonces. */
public class SecureNonceSource : NonceSource {
    private val random = SecureRandom()

    override fun nextNonce(): String {
        val bytes = ByteArray(32)
        random.nextBytes(bytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }
}
