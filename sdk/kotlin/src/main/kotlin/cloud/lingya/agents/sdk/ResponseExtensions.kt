package cloud.lingya.agents.sdk

import retrofit2.Response

/** Returns a successful response body or throws [ApiException]. */
public fun <T : Any> Response<T>.bodyOrThrow(): T {
    if (!isSuccessful) throw ApiException(code(), errorBody()?.string(), requestId = headers()["X-Request-ID"])
    return body() ?: throw ApiException(code(), "Successful response did not contain a body")
}
