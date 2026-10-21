"""Strong discriminated event and tool-extension decoding."""

from typing import Union, cast

from pydantic import BaseModel

from lingya_agents_sdk.models.ai_chat_awaiting_input_brief_event import AiChatAwaitingInputBriefEvent
from lingya_agents_sdk.models.ai_chat_compactor_warning_brief_event import AiChatCompactorWarningBriefEvent
from lingya_agents_sdk.models.ai_chat_compressor_context_end_brief_event import AiChatCompressorContextEndBriefEvent
from lingya_agents_sdk.models.ai_chat_compressor_context_start_brief_event import AiChatCompressorContextStartBriefEvent
from lingya_agents_sdk.models.ai_chat_end_brief_event import AiChatEndBriefEvent
from lingya_agents_sdk.models.ai_chat_error_brief_event import AiChatErrorBriefEvent
from lingya_agents_sdk.models.ai_chat_manual_interrupt_brief_event import AiChatManualInterruptBriefEvent
from lingya_agents_sdk.models.ai_chat_message_brief_event import AiChatMessageBriefEvent
from lingya_agents_sdk.models.ai_chat_start_brief_event import AiChatStartBriefEvent
from lingya_agents_sdk.models.ai_chat_sub_agent_call_brief_event import AiChatSubAgentCallBriefEvent
from lingya_agents_sdk.models.ai_chat_think_brief_event import AiChatThinkBriefEvent
from lingya_agents_sdk.models.ai_chat_tool_execution_brief_event import AiChatToolExecutionBriefEvent
from lingya_agents_sdk.models.ai_chat_user_query_brief_event import AiChatUserQueryBriefEvent
from lingya_agents_sdk.models.ask_user_question_extension_tool_extension import AskUserQuestionExtensionToolExtension
from lingya_agents_sdk.models.image_generation_extension_tool_extension import ImageGenerationExtensionToolExtension
from lingya_agents_sdk.models.js_run_script_extension_tool_extension import JsRunScriptExtensionToolExtension
from lingya_agents_sdk.models.js_run_script_result_extension_tool_extension import (
    JsRunScriptResultExtensionToolExtension,
)
from lingya_agents_sdk.models.math_formula_extension_tool_extension import MathFormulaExtensionToolExtension
from lingya_agents_sdk.models.math_result_extension_tool_extension import MathResultExtensionToolExtension
from lingya_agents_sdk.models.plan_approval_extension_tool_extension import PlanApprovalExtensionToolExtension
from lingya_agents_sdk.models.skill_resource_extension_tool_extension import SkillResourceExtensionToolExtension
from lingya_agents_sdk.models.sql_chart_result_extension_tool_extension import SqlChartResultExtensionToolExtension
from lingya_agents_sdk.models.sql_query_extension_tool_extension import SqlQueryExtensionToolExtension
from lingya_agents_sdk.models.sql_query_result_extension_tool_extension import SqlQueryResultExtensionToolExtension
from lingya_agents_sdk.models.task_progress_extension_tool_extension import TaskProgressExtensionToolExtension
from lingya_agents_sdk.models.unknown_ai_chat_brief_event import UnknownAiChatBriefEvent
from lingya_agents_sdk.models.unknown_tool_extension import UnknownToolExtension

AiChatBriefEvent = Union[
    AiChatUserQueryBriefEvent,
    AiChatCompressorContextStartBriefEvent,
    AiChatCompressorContextEndBriefEvent,
    AiChatCompactorWarningBriefEvent,
    AiChatManualInterruptBriefEvent,
    AiChatErrorBriefEvent,
    AiChatStartBriefEvent,
    AiChatThinkBriefEvent,
    AiChatMessageBriefEvent,
    AiChatToolExecutionBriefEvent,
    AiChatSubAgentCallBriefEvent,
    AiChatAwaitingInputBriefEvent,
    AiChatEndBriefEvent,
    UnknownAiChatBriefEvent,
]

ToolExtension = Union[
    PlanApprovalExtensionToolExtension,
    AskUserQuestionExtensionToolExtension,
    ImageGenerationExtensionToolExtension,
    SqlQueryExtensionToolExtension,
    SqlQueryResultExtensionToolExtension,
    SqlChartResultExtensionToolExtension,
    MathFormulaExtensionToolExtension,
    MathResultExtensionToolExtension,
    JsRunScriptExtensionToolExtension,
    JsRunScriptResultExtensionToolExtension,
    SkillResourceExtensionToolExtension,
    TaskProgressExtensionToolExtension,
    UnknownToolExtension,
]


class _EventEnvelope(BaseModel):
    type: str


def decode_ai_chat_brief_event(raw_json: str) -> AiChatBriefEvent:
    """按 type 解码事件，未知分支保留完整 JSON。 / Decode by type with an exact fallback.

    Args:
        raw_json: 一个完整事件对象的 JSON 原文。

    Returns:
        15 种已知事件之一，或包含 type 与输入原文的未知事件。
    """
    event_type = _EventEnvelope.model_validate_json(raw_json).type
    model = _event_model(event_type)
    if model is None:
        return UnknownAiChatBriefEvent(type=event_type, rawJson=raw_json)
    return cast(AiChatBriefEvent, model.model_validate_json(raw_json))


def decode_tool_extension(raw_json: str) -> ToolExtension:
    """按 category 解码工具扩展。 / Decode an extension by category.

    Args:
        raw_json: 一个完整工具扩展对象的 JSON 原文。

    Returns:
        12 种已知扩展之一，或包含 category 与输入原文的未知扩展。
    """
    category = _ToolExtensionEnvelope.model_validate_json(raw_json).category
    model = _tool_extension_model(category)
    if model is None:
        return UnknownToolExtension(category=category, rawJson=raw_json)
    return cast(ToolExtension, model.model_validate_json(raw_json))


class _ToolExtensionEnvelope(BaseModel):
    category: str


def _event_model(event_type: str) -> type[BaseModel] | None:
    match event_type:
        case "user-query":
            return AiChatUserQueryBriefEvent
        case "compressor-context-start":
            return AiChatCompressorContextStartBriefEvent
        case "compressor-context-end":
            return AiChatCompressorContextEndBriefEvent
        case "compactor-warning":
            return AiChatCompactorWarningBriefEvent
        case "manual-interrupt":
            return AiChatManualInterruptBriefEvent
        case "error":
            return AiChatErrorBriefEvent
        case "start":
            return AiChatStartBriefEvent
        case "think":
            return AiChatThinkBriefEvent
        case "message":
            return AiChatMessageBriefEvent
        case "tool-execution":
            return AiChatToolExecutionBriefEvent
        case "tool-execution-sub-agent-call":
            return AiChatSubAgentCallBriefEvent
        case "tool-execution-awaiting-user-input":
            return AiChatAwaitingInputBriefEvent
        case "end":
            return AiChatEndBriefEvent
        case _:
            return None


def _tool_extension_model(category: str) -> type[BaseModel] | None:
    model = {
        "planApproval": PlanApprovalExtensionToolExtension,
        "askUserQuestion": AskUserQuestionExtensionToolExtension,
        "imageGeneration": ImageGenerationExtensionToolExtension,
        "sqlQuery": SqlQueryExtensionToolExtension,
        "sqlQueryResult": SqlQueryResultExtensionToolExtension,
        "sqlChartResult": SqlChartResultExtensionToolExtension,
        "mathFormula": MathFormulaExtensionToolExtension,
        "mathResult": MathResultExtensionToolExtension,
        "jsRunScript": JsRunScriptExtensionToolExtension,
        "jsRunScriptResult": JsRunScriptResultExtensionToolExtension,
        "skillResource": SkillResourceExtensionToolExtension,
        "taskProgress": TaskProgressExtensionToolExtension,
    }.get(category)
    return cast(type[BaseModel] | None, model)
