package cloud.lingya.agents.sdk

import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

internal class IdempotentRetryInterceptor(private val policy: RetryPolicy) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        if (request.method != "GET" && request.method != "HEAD") return chain.proceed(request)

        var lastFailure: IOException? = null
        repeat(policy.maxAttempts) { attempt ->
            try {
                val response = chain.proceed(request)
                if (attempt + 1 == policy.maxAttempts || response.code !in policy.retryStatusCodes) return response
                response.close()
            } catch (exception: IOException) {
                lastFailure = exception
                if (attempt + 1 == policy.maxAttempts) throw exception
            }
        }
        throw lastFailure ?: IOException("request retry attempts exhausted")
    }
}
