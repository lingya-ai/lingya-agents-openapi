package cloud.lingya.agents.sdk.event

import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.databind.DeserializationContext
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.util.TokenBuffer
import java.io.StringWriter

internal data class RawJsonDocument(
    val objectMapper: ObjectMapper,
    val rawJson: String,
)

internal fun JsonParser.captureRawJson(context: DeserializationContext): RawJsonDocument {
    val mapper = codec as? ObjectMapper ?: context.parser.codec as ObjectMapper
    val buffer = TokenBuffer(this, context)
    buffer.copyCurrentStructure(this)
    val writer = StringWriter()
    mapper.factory.createGenerator(writer).use(buffer::serialize)
    return RawJsonDocument(mapper, writer.toString())
}
