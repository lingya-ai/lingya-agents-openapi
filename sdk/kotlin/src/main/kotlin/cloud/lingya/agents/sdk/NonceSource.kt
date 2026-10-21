package cloud.lingya.agents.sdk

/** Supplies a fresh unpadded Base64URL nonce for every signing attempt. */
public fun interface NonceSource {
    /** Returns a nonce representing 16 to 64 random bytes. */
    public fun nextNonce(): String
}
