package cloud.lingya.agents.sdk

/** Optional retry policy, restricted to idempotent reads. */
public data class RetryPolicy(
    public val maxAttempts: Int = 1,
    public val retryStatusCodes: Set<Int> = setOf(429, 502, 503, 504),
) {
    init {
        require(maxAttempts >= 1) { "maxAttempts must be at least 1" }
    }

    public companion object {
        /** Disables SDK-level retries. */
        @JvmField
        public val NONE: RetryPolicy = RetryPolicy()
    }
}
