//! `type` 与 `category` 判别的强类型事件模型。

use serde::Deserialize;
use serde_json::value::RawValue;

use crate::client::LingyaError;
use crate::models;

/// 13 种已知聊天事件，以及保留完整 JSON 的未知事件。
#[derive(Clone, Debug, PartialEq)]
pub enum LingyaAiChatBriefEvent {
    /// 用户查询事件。
    UserQuery(models::AiChatUserQueryBriefEvent),
    /// 上下文压缩开始事件。
    CompressorContextStart(models::AiChatCompressorContextStartBriefEvent),
    /// 上下文压缩结束事件。
    CompressorContextEnd(models::AiChatCompressorContextEndBriefEvent),
    /// 上下文压缩警告事件。
    CompactorWarning(models::AiChatCompactorWarningBriefEvent),
    /// 人工中断事件。
    ManualInterrupt(models::AiChatManualInterruptBriefEvent),
    /// 服务端错误事件。
    Error(models::AiChatErrorBriefEvent),
    /// 推理开始事件。
    Start(models::AiChatStartBriefEvent),
    /// 思考过程事件。
    Think(models::AiChatThinkBriefEvent),
    /// 消息事件。
    Message(models::AiChatMessageBriefEvent),
    /// 工具执行事件。
    ToolExecution(ToolExecutionEvent),
    /// 子 Agent 工具调用事件。
    ToolExecutionSubAgentCall(models::AiChatSubAgentCallBriefEvent),
    /// 等待用户输入事件。
    ToolExecutionAwaitingUserInput(models::AiChatAwaitingInputBriefEvent),
    /// 推理结束事件。
    End(models::AiChatEndBriefEvent),
    /// 契约尚未认识的事件。
    Unknown(models::UnknownAiChatBriefEvent),
}

impl LingyaAiChatBriefEvent {
    /// 返回稳定的协议判别值。
    pub fn event_type(&self) -> &str {
        match self {
            Self::UserQuery(_) => "user-query",
            Self::CompressorContextStart(_) => "compressor-context-start",
            Self::CompressorContextEnd(_) => "compressor-context-end",
            Self::CompactorWarning(_) => "compactor-warning",
            Self::ManualInterrupt(_) => "manual-interrupt",
            Self::Error(_) => "error",
            Self::Start(_) => "start",
            Self::Think(_) => "think",
            Self::Message(_) => "message",
            Self::ToolExecution(_) => "tool-execution",
            Self::ToolExecutionSubAgentCall(_) => "tool-execution-sub-agent-call",
            Self::ToolExecutionAwaitingUserInput(_) => "tool-execution-awaiting-user-input",
            Self::End(_) => "end",
            Self::Unknown(event) => &event.r#type,
        }
    }
}

/// 工具执行事件的公开强类型结构。
#[derive(Clone, Debug, PartialEq)]
pub struct ToolExecutionEvent {
    /// 工具调用 ID。
    pub tool_id: String,
    /// 工具名称。
    pub tool_name: String,
    /// 当前执行状态。
    pub status: String,
    /// 当前动作。
    pub action: String,
    /// 可选摘要。
    pub summary: Option<String>,
    /// 与 category 对应的工具扩展。
    pub extension: Option<LingyaToolExtension>,
}

/// 12 种已知工具扩展，以及保留完整 JSON 的未知扩展。
#[derive(Clone, Debug, PartialEq)]
pub enum LingyaToolExtension {
    /// 计划审批扩展。
    PlanApproval(models::PlanApprovalExtensionToolExtension),
    /// 用户问答扩展。
    AskUserQuestion(models::AskUserQuestionExtensionToolExtension),
    /// 图片生成扩展。
    ImageGeneration(models::ImageGenerationExtensionToolExtension),
    /// SQL 查询扩展。
    SqlQuery(models::SqlQueryExtensionToolExtension),
    /// SQL 查询结果扩展。
    SqlQueryResult(models::SqlQueryResultExtensionToolExtension),
    /// SQL 图表扩展。
    SqlChartResult(models::SqlChartResultExtensionToolExtension),
    /// 数学公式扩展。
    MathFormula(models::MathFormulaExtensionToolExtension),
    /// 数学结果扩展。
    MathResult(models::MathResultExtensionToolExtension),
    /// JavaScript 执行扩展。
    JsRunScript(models::JsRunScriptExtensionToolExtension),
    /// JavaScript 结果扩展。
    JsRunScriptResult(models::JsRunScriptResultExtensionToolExtension),
    /// Skill 资源扩展。
    SkillResource(models::SkillResourceExtensionToolExtension),
    /// 任务进度扩展。
    TaskProgress(models::TaskProgressExtensionToolExtension),
    /// 契约尚未认识的工具扩展。
    Unknown(models::UnknownToolExtension),
}

/// 13 种已知聊天事件及未知事件后备类型。 / Known chat events plus the unknown fallback.
pub type AiChatBriefEvent = LingyaAiChatBriefEvent;
/// 已知工具扩展及未知扩展后备类型。 / Known tool extensions plus the unknown fallback.
pub type ToolExtension = LingyaToolExtension;

/// 按 `type` 解码聊天事件，未知分支保留输入 JSON 原文。
pub fn decode_ai_chat_brief_event(raw_json: &str) -> Result<LingyaAiChatBriefEvent, LingyaError> {
    #[derive(Deserialize)]
    struct Envelope {
        #[serde(rename = "type")]
        event_type: String,
    }

    let event_type = serde_json::from_str::<Envelope>(raw_json)?.event_type;
    let event = match event_type.as_str() {
        "user-query" => LingyaAiChatBriefEvent::UserQuery(serde_json::from_str(raw_json)?),
        "compressor-context-start" => {
            LingyaAiChatBriefEvent::CompressorContextStart(serde_json::from_str(raw_json)?)
        }
        "compressor-context-end" => {
            LingyaAiChatBriefEvent::CompressorContextEnd(serde_json::from_str(raw_json)?)
        }
        "compactor-warning" => {
            LingyaAiChatBriefEvent::CompactorWarning(serde_json::from_str(raw_json)?)
        }
        "manual-interrupt" => {
            LingyaAiChatBriefEvent::ManualInterrupt(serde_json::from_str(raw_json)?)
        }
        "error" => LingyaAiChatBriefEvent::Error(serde_json::from_str(raw_json)?),
        "start" => LingyaAiChatBriefEvent::Start(serde_json::from_str(raw_json)?),
        "think" => LingyaAiChatBriefEvent::Think(serde_json::from_str(raw_json)?),
        "message" => LingyaAiChatBriefEvent::Message(serde_json::from_str(raw_json)?),
        "tool-execution" => LingyaAiChatBriefEvent::ToolExecution(decode_tool_execution(raw_json)?),
        "tool-execution-sub-agent-call" => {
            LingyaAiChatBriefEvent::ToolExecutionSubAgentCall(serde_json::from_str(raw_json)?)
        }
        "tool-execution-awaiting-user-input" => {
            LingyaAiChatBriefEvent::ToolExecutionAwaitingUserInput(serde_json::from_str(raw_json)?)
        }
        "end" => LingyaAiChatBriefEvent::End(serde_json::from_str(raw_json)?),
        _ => LingyaAiChatBriefEvent::Unknown(models::UnknownAiChatBriefEvent::new(
            event_type,
            raw_json.to_owned(),
        )),
    };
    Ok(event)
}

/// 按 `category` 解码工具扩展，未知分支保留输入 JSON 原文。
pub fn decode_tool_extension(raw_json: &str) -> Result<LingyaToolExtension, LingyaError> {
    #[derive(Deserialize)]
    struct Envelope {
        category: String,
    }

    let category = serde_json::from_str::<Envelope>(raw_json)?.category;
    let extension = match category.as_str() {
        "planApproval" => LingyaToolExtension::PlanApproval(serde_json::from_str(raw_json)?),
        "askUserQuestion" => LingyaToolExtension::AskUserQuestion(serde_json::from_str(raw_json)?),
        "imageGeneration" => LingyaToolExtension::ImageGeneration(serde_json::from_str(raw_json)?),
        "sqlQuery" => LingyaToolExtension::SqlQuery(serde_json::from_str(raw_json)?),
        "sqlQueryResult" => LingyaToolExtension::SqlQueryResult(serde_json::from_str(raw_json)?),
        "sqlChartResult" => LingyaToolExtension::SqlChartResult(serde_json::from_str(raw_json)?),
        "mathFormula" => LingyaToolExtension::MathFormula(serde_json::from_str(raw_json)?),
        "mathResult" => LingyaToolExtension::MathResult(serde_json::from_str(raw_json)?),
        "jsRunScript" => LingyaToolExtension::JsRunScript(serde_json::from_str(raw_json)?),
        "jsRunScriptResult" => {
            LingyaToolExtension::JsRunScriptResult(serde_json::from_str(raw_json)?)
        }
        "skillResource" => LingyaToolExtension::SkillResource(serde_json::from_str(raw_json)?),
        "taskProgress" => LingyaToolExtension::TaskProgress(serde_json::from_str(raw_json)?),
        _ => LingyaToolExtension::Unknown(models::UnknownToolExtension::new(
            category,
            raw_json.to_owned(),
        )),
    };
    Ok(extension)
}

fn decode_tool_execution(raw_json: &str) -> Result<ToolExecutionEvent, LingyaError> {
    #[derive(Deserialize)]
    struct RawToolExecutionEvent {
        #[serde(rename = "toolId")]
        tool_id: String,
        #[serde(rename = "toolName")]
        tool_name: String,
        status: String,
        action: String,
        summary: Option<String>,
        extension: Option<Box<RawValue>>,
    }

    let event = serde_json::from_str::<RawToolExecutionEvent>(raw_json)?;
    Ok(ToolExecutionEvent {
        tool_id: event.tool_id,
        tool_name: event.tool_name,
        status: event.status,
        action: event.action,
        summary: event.summary,
        extension: event
            .extension
            .map(|extension| decode_tool_extension(extension.get()))
            .transpose()?,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        decode_ai_chat_brief_event, decode_tool_extension, LingyaAiChatBriefEvent,
        LingyaToolExtension,
    };

    #[test]
    fn preserves_unknown_event_json() {
        let raw = r#"{"type":"future-event","value":42}"#;
        let event = decode_ai_chat_brief_event(raw).unwrap();
        match event {
            LingyaAiChatBriefEvent::Unknown(event) => {
                assert_eq!(event.r#type, "future-event");
                assert_eq!(event.raw_json, raw);
            }
            _ => panic!("expected unknown event"),
        }
    }

    #[test]
    fn preserves_unknown_tool_extension_json() {
        let raw = r#"{"category":"futureTool","value":42}"#;
        let extension = decode_tool_extension(raw).unwrap();
        match extension {
            LingyaToolExtension::Unknown(extension) => {
                assert_eq!(extension.category, "futureTool");
                assert_eq!(extension.raw_json, raw);
            }
            _ => panic!("expected unknown tool extension"),
        }
    }
}
