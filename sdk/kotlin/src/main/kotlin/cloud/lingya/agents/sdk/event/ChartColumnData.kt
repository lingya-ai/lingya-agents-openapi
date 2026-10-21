package cloud.lingya.agents.sdk.event

import cloud.lingya.agents.sdk.generated.model.BooleanChartColumn
import cloud.lingya.agents.sdk.generated.model.DecimalChartColumn
import cloud.lingya.agents.sdk.generated.model.DoubleChartColumn
import cloud.lingya.agents.sdk.generated.model.InstantChartColumn
import cloud.lingya.agents.sdk.generated.model.IntegerChartColumn
import cloud.lingya.agents.sdk.generated.model.LocalDateChartColumn
import cloud.lingya.agents.sdk.generated.model.LocalDateTimeChartColumn
import cloud.lingya.agents.sdk.generated.model.LocalTimeChartColumn
import cloud.lingya.agents.sdk.generated.model.StringChartColumn
import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.databind.DeserializationContext
import com.fasterxml.jackson.databind.JsonDeserializer
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.annotation.JsonDeserialize

/** SQL 图表数据集中的强类型列。 / Strongly typed column in an SQL chart dataset. */
@JsonDeserialize(using = ChartColumnDataDeserializer::class)
public sealed interface ChartColumnData {
    /** SQL 列类型。 / SQL column type. */
    public val type: String

    /** 字符串列。 / String column. */
    public data class StringValues(public val value: StringChartColumn) : ChartColumnData { override val type: String = "STRING" }
    /** 整数或长整数列。 / Integer or long column. */
    public data class IntegerValues(public val value: IntegerChartColumn) : ChartColumnData { override val type: String = value.type.value }
    /** 精确十进制列。 / Exact decimal column. */
    public data class DecimalValues(public val value: DecimalChartColumn) : ChartColumnData { override val type: String = "DECIMAL" }
    /** 浮点列。 / Floating-point column. */
    public data class DoubleValues(public val value: DoubleChartColumn) : ChartColumnData { override val type: String = "DOUBLE" }
    /** 布尔列。 / Boolean column. */
    public data class BooleanValues(public val value: BooleanChartColumn) : ChartColumnData { override val type: String = "BOOLEAN" }
    /** 本地日期列。 / Local-date column. */
    public data class LocalDateValues(public val value: LocalDateChartColumn) : ChartColumnData { override val type: String = "LOCAL_DATE" }
    /** 本地日期时间列。 / Local-date-time column. */
    public data class LocalDateTimeValues(public val value: LocalDateTimeChartColumn) : ChartColumnData { override val type: String = "LOCAL_DATE_TIME" }
    /** 本地时间列。 / Local-time column. */
    public data class LocalTimeValues(public val value: LocalTimeChartColumn) : ChartColumnData { override val type: String = "LOCAL_TIME" }
    /** UTC 时刻列。 / UTC-instant column. */
    public data class InstantValues(public val value: InstantChartColumn) : ChartColumnData { override val type: String = "INSTANT" }
    /** 未知列类型。 / Unknown future column type. */
    public data class Unknown(override val type: String, public val rawJson: String) : ChartColumnData
}

internal class ChartColumnDataDeserializer : JsonDeserializer<ChartColumnData>() {
    override fun deserialize(parser: JsonParser, context: DeserializationContext): ChartColumnData {
        val document = parser.captureRawJson(context)
        return decodeChartColumn(document.objectMapper, document.rawJson)
    }
}

private fun decodeChartColumn(mapper: ObjectMapper, rawJson: String): ChartColumnData {
    val type = mapper.readValue(rawJson, ColumnTypeEnvelope::class.java).type
    return when (type) {
        "STRING" -> ChartColumnData.StringValues(mapper.readValue(rawJson, StringChartColumn::class.java))
        "INTEGER", "LONG" -> ChartColumnData.IntegerValues(mapper.readValue(rawJson, IntegerChartColumn::class.java))
        "DECIMAL" -> ChartColumnData.DecimalValues(mapper.readValue(rawJson, DecimalChartColumn::class.java))
        "DOUBLE" -> ChartColumnData.DoubleValues(mapper.readValue(rawJson, DoubleChartColumn::class.java))
        "BOOLEAN" -> ChartColumnData.BooleanValues(mapper.readValue(rawJson, BooleanChartColumn::class.java))
        "LOCAL_DATE" -> ChartColumnData.LocalDateValues(mapper.readValue(rawJson, LocalDateChartColumn::class.java))
        "LOCAL_DATE_TIME" -> ChartColumnData.LocalDateTimeValues(mapper.readValue(rawJson, LocalDateTimeChartColumn::class.java))
        "LOCAL_TIME" -> ChartColumnData.LocalTimeValues(mapper.readValue(rawJson, LocalTimeChartColumn::class.java))
        "INSTANT" -> ChartColumnData.InstantValues(mapper.readValue(rawJson, InstantChartColumn::class.java))
        else -> ChartColumnData.Unknown(type, rawJson)
    }
}

private data class ColumnTypeEnvelope(val type: String = "")
