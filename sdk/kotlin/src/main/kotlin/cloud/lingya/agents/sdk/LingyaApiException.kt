package cloud.lingya.agents.sdk

/**
 * 旧版带品牌前缀的异常名称。 / Legacy brand-prefixed exception name.
 *
 * @author 思追(shaco)
 */
@Deprecated("Use ApiException", ReplaceWith("ApiException(statusCode, responseBody)"))
public class LingyaApiException(
    statusCode: Int,
    responseBody: String?,
) : ApiException(statusCode, responseBody)
