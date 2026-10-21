package cloud.lingya.agents.sdk.event

import cloud.lingya.agents.sdk.generated.model.AskUserQuestionExtensionToolExtension
import cloud.lingya.agents.sdk.generated.model.ImageGenerationExtensionToolExtension
import cloud.lingya.agents.sdk.generated.model.JsRunScriptExtensionToolExtension
import cloud.lingya.agents.sdk.generated.model.JsRunScriptResultExtensionToolExtension
import cloud.lingya.agents.sdk.generated.model.MathFormulaExtensionToolExtension
import cloud.lingya.agents.sdk.generated.model.MathResultExtensionToolExtension
import cloud.lingya.agents.sdk.generated.model.PlanApprovalExtensionToolExtension
import cloud.lingya.agents.sdk.generated.model.SkillResourceExtensionToolExtension
import cloud.lingya.agents.sdk.generated.model.SqlChartResultExtensionToolExtension
import cloud.lingya.agents.sdk.generated.model.SqlQueryExtensionToolExtension
import cloud.lingya.agents.sdk.generated.model.SqlQueryResultExtensionToolExtension
import cloud.lingya.agents.sdk.generated.model.TaskProgressExtensionToolExtension
import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.databind.DeserializationContext
import com.fasterxml.jackson.databind.JsonDeserializer
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.annotation.JsonDeserialize

/** 工具事件携带的强类型扩展。 / Strongly typed extension attached to a tool event. */
@JsonDeserialize(using = ToolExtensionDeserializer::class)
public sealed interface ToolExtension {
    /** 扩展类别判别值。 / Extension category discriminator. */
    public val category: String

    /** 计划审批扩展。 / Plan-approval extension. */
    public data class PlanApproval(public val value: PlanApprovalExtensionToolExtension) : ToolExtension { override val category: String = "planApproval" }
    /** 用户问答扩展。 / User-question extension. */
    public data class AskUserQuestion(public val value: AskUserQuestionExtensionToolExtension) : ToolExtension { override val category: String = "askUserQuestion" }
    /** 图片生成扩展。 / Image-generation extension. */
    public data class ImageGeneration(public val value: ImageGenerationExtensionToolExtension) : ToolExtension { override val category: String = "imageGeneration" }
    /** SQL 请求扩展。 / SQL-query extension. */
    public data class SqlQuery(public val value: SqlQueryExtensionToolExtension) : ToolExtension { override val category: String = "sqlQuery" }
    /** SQL 结果扩展。 / SQL-result extension. */
    public data class SqlQueryResult(public val value: SqlQueryResultExtensionToolExtension) : ToolExtension { override val category: String = "sqlQueryResult" }
    /** SQL 图表扩展。 / SQL-chart extension. */
    public data class SqlChartResult(public val value: SqlChartResultExtensionToolExtension) : ToolExtension { override val category: String = "sqlChartResult" }
    /** 数学公式扩展。 / Mathematical-expression extension. */
    public data class MathFormula(public val value: MathFormulaExtensionToolExtension) : ToolExtension { override val category: String = "mathFormula" }
    /** 数学结果扩展。 / Mathematical-result extension. */
    public data class MathResult(public val value: MathResultExtensionToolExtension) : ToolExtension { override val category: String = "mathResult" }
    /** JavaScript 脚本扩展。 / JavaScript-source extension. */
    public data class JsRunScript(public val value: JsRunScriptExtensionToolExtension) : ToolExtension { override val category: String = "jsRunScript" }
    /** JavaScript 结果扩展。 / JavaScript-result extension. */
    public data class JsRunScriptResult(public val value: JsRunScriptResultExtensionToolExtension) : ToolExtension { override val category: String = "jsRunScriptResult" }
    /** Skill 资源变更扩展。 / Skill-resource mutation extension. */
    public data class SkillResource(public val value: SkillResourceExtensionToolExtension) : ToolExtension { override val category: String = "skillResource" }
    /** 任务进度扩展。 / Task-progress extension. */
    public data class TaskProgress(public val value: TaskProgressExtensionToolExtension) : ToolExtension { override val category: String = "taskProgress" }

    /** 未知扩展，保留完整原始 JSON。 / Unknown extension retaining its complete raw JSON. */
    public data class Unknown(override val category: String, public val rawJson: String) : ToolExtension
}

internal class ToolExtensionDeserializer : JsonDeserializer<ToolExtension>() {
    override fun deserialize(parser: JsonParser, context: DeserializationContext): ToolExtension {
        val document = parser.captureRawJson(context)
        return decodeToolExtension(document.objectMapper, document.rawJson)
    }
}

private fun decodeToolExtension(mapper: ObjectMapper, rawJson: String): ToolExtension {
    val category = mapper.readValue(rawJson, ExtensionCategoryEnvelope::class.java).category
    return when (category) {
        "planApproval" -> ToolExtension.PlanApproval(mapper.readValue(rawJson, PlanApprovalExtensionToolExtension::class.java))
        "askUserQuestion" -> ToolExtension.AskUserQuestion(mapper.readValue(rawJson, AskUserQuestionExtensionToolExtension::class.java))
        "imageGeneration" -> ToolExtension.ImageGeneration(mapper.readValue(rawJson, ImageGenerationExtensionToolExtension::class.java))
        "sqlQuery" -> ToolExtension.SqlQuery(mapper.readValue(rawJson, SqlQueryExtensionToolExtension::class.java))
        "sqlQueryResult" -> ToolExtension.SqlQueryResult(mapper.readValue(rawJson, SqlQueryResultExtensionToolExtension::class.java))
        "sqlChartResult" -> ToolExtension.SqlChartResult(mapper.readValue(rawJson, SqlChartResultExtensionToolExtension::class.java))
        "mathFormula" -> ToolExtension.MathFormula(mapper.readValue(rawJson, MathFormulaExtensionToolExtension::class.java))
        "mathResult" -> ToolExtension.MathResult(mapper.readValue(rawJson, MathResultExtensionToolExtension::class.java))
        "jsRunScript" -> ToolExtension.JsRunScript(mapper.readValue(rawJson, JsRunScriptExtensionToolExtension::class.java))
        "jsRunScriptResult" -> ToolExtension.JsRunScriptResult(mapper.readValue(rawJson, JsRunScriptResultExtensionToolExtension::class.java))
        "skillResource" -> ToolExtension.SkillResource(mapper.readValue(rawJson, SkillResourceExtensionToolExtension::class.java))
        "taskProgress" -> ToolExtension.TaskProgress(mapper.readValue(rawJson, TaskProgressExtensionToolExtension::class.java))
        else -> ToolExtension.Unknown(category, rawJson)
    }
}

private data class ExtensionCategoryEnvelope(val category: String = "")
