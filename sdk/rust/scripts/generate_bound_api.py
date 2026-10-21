"""Generate channel-bound Rust API groups from the canonical manifest."""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).parents[1]
MANIFEST = json.loads((ROOT / "openapi/endpoints.json").read_text(encoding="utf-8"))
OUTPUT = ROOT / "src/bound_api.rs"


def snake_case(value: str) -> str:
    """Convert OpenAPI names to stable Rust identifiers."""
    if value == "X-Request-ID":
        return "request_id"
    if value == "Accept":
        return "accept"
    first = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", value)
    return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", first).lower().replace("-", "_")


def pascal_case(value: str) -> str:
    """Convert a camel-case operation or tag to a public Rust type name."""
    return "".join(part.title() for part in snake_case(value).split("_"))


def option_class(operation: dict[str, object]) -> str:
    """Name the strongly typed query/header options for an operation."""
    return f"{pascal_case(operation['operationId'])}Options"


def scalar_type(parameter: dict[str, object]) -> str:
    """Map the contract's constrained parameter schemas to owned Rust types."""
    name = parameter["name"]
    schema = parameter["schema"]
    if name == "orderDirection":
        return "SortDirection"
    if name == "orderNullHandling":
        return "NullOrdering"
    if name == "format":
        return "SqlExportFormat"
    if schema.get("type") == "integer":
        return "i64" if schema.get("format") == "int64" else "i32"
    if schema.get("type") == "boolean":
        return "bool"
    if schema.get("type") == "array":
        return "Vec<String>"
    return "String"


def model_type(schema_name: str) -> str:
    """Return the exact request model, including the array-body operation."""
    if schema_name == "ReturnedReferenceList":
        return "[models::ReturnedReference]"
    return f"models::{schema_name}"


groups = list(dict.fromkeys(operation["group"] for operation in MANIFEST))
option_operations = [
    operation
    for operation in MANIFEST
    if any(parameter["in"] != "path" and not parameter.get("boundFrom") for parameter in operation["parameters"])
]

lines = [
    "//! Channel-bound API groups generated from the Lingya Agents contract.",
    "//!",
    "//! The wire contract keeps `channelId` in every path. These public methods",
    "//! omit it because [`AgentsClient`](crate::AgentsClient) binds it once.",
    "",
    "use std::pin::Pin;",
    "",
    "use futures_util::Stream;",
    "use reqwest::Method;",
    "",
    "use crate::client::{AgentsUserClient, ApiError, QueryParameter};",
    "use crate::events::AiChatBriefEvent;",
    "use crate::models;",
    "",
    "/// 可取消的强类型聊天事件流。 / Cancellable strongly typed chat-event stream.",
    "pub type AiChatEventStream = Pin<Box<dyn Stream<Item = Result<AiChatBriefEvent, ApiError>> + Send>>;",
    "/// 可取消的诊断事件流。 / Cancellable diagnostic event stream.",
    "pub type ProbeEventStream = Pin<Box<dyn Stream<Item = Result<models::ChatStreamProbeEvent, ApiError>> + Send>>;",
    "",
    "/// 排序方向。 / Sort direction.",
    "#[derive(Clone, Copy, Debug, Eq, PartialEq)]",
    "pub enum SortDirection {",
    "    /// 升序。 / Ascending.",
    "    Asc,",
    "    /// 降序。 / Descending.",
    "    Desc,",
    "}",
    "",
    "impl SortDirection {",
    "    fn as_str(self) -> &'static str { match self { Self::Asc => \"ASC\", Self::Desc => \"DESC\" } }",
    "}",
    "",
    "/// 空值排序策略。 / Null ordering strategy.",
    "#[derive(Clone, Copy, Debug, Eq, PartialEq)]",
    "pub enum NullOrdering {",
    "    /// 使用数据库默认顺序。 / Use the database-native order.",
    "    Native,",
    "    /// 空值优先。 / Nulls first.",
    "    NullsFirst,",
    "    /// 空值最后。 / Nulls last.",
    "    NullsLast,",
    "}",
    "",
    "impl NullOrdering {",
    "    fn as_str(self) -> &'static str { match self { Self::Native => \"NATIVE\", Self::NullsFirst => \"NULLS_FIRST\", Self::NullsLast => \"NULLS_LAST\" } }",
    "}",
    "",
    "/// SQL 导出格式。 / SQL export format.",
    "#[derive(Clone, Copy, Debug, Eq, PartialEq)]",
    "pub enum SqlExportFormat {",
    "    /// CSV 文本。 / CSV text.",
    "    Csv,",
    "    /// XLSX 工作簿。 / XLSX workbook.",
    "    Xlsx,",
    "}",
    "",
    "impl SqlExportFormat {",
    "    fn as_str(self) -> &'static str { match self { Self::Csv => \"CSV\", Self::Xlsx => \"XLSX\" } }",
    "}",
    "",
]

for operation in option_operations:
    parameters = [item for item in operation["parameters"] if item["in"] != "path" and not item.get("boundFrom")]
    all_optional = all(not parameter["required"] for parameter in parameters)
    derives = "Clone, Debug, Default" if all_optional else "Clone, Debug"
    lines.extend(
        [
            f"/// {operation['summary']} 的查询参数和请求头。 / Query values and headers for `{snake_case(operation['operationId'])}`.",
            f"#[derive({derives})]",
            f"pub struct {option_class(operation)} {{",
        ]
    )
    for parameter in parameters:
        field_type = scalar_type(parameter)
        if not parameter["required"]:
            field_type = f"Option<{field_type}>"
        lines.extend(
            [
                f"    /// {parameter['description']}",
                f"    pub {snake_case(parameter['name'])}: {field_type},",
            ]
        )
    lines.extend(["}", ""])

for group in groups:
    class_name = f"{pascal_case(group)}Api"
    lines.extend(
        [
            f"/// {group} 分组的 channel 绑定接口。 / Channel-bound {group} operations.",
            f"pub struct {class_name}<'a> {{",
            "    client: &'a AgentsUserClient,",
            "}",
            "",
            f"impl<'a> {class_name}<'a> {{",
            "    pub(crate) fn new(client: &'a AgentsUserClient) -> Self { Self { client } }",
            "",
        ]
    )
    for operation in [item for item in MANIFEST if item["group"] == group]:
        parameters = [item for item in operation["parameters"] if not item.get("boundFrom")]
        path_parameters = [item for item in parameters if item["in"] == "path"]
        option_parameters = [item for item in parameters if item["in"] != "path"]
        signature: list[str] = []
        for parameter in path_parameters:
            value_type = scalar_type(parameter)
            signature.append(f"{snake_case(parameter['name'])}: {'&str' if value_type == 'String' else value_type}")
        if operation["requestBodySchema"]:
            signature.append(f"input: &{model_type(operation['requestBodySchema'])}")
        if option_parameters:
            signature.append(f"options: &{option_class(operation)}")
        response_schema = operation["response"]["schema"]
        if operation["sse"]:
            return_type = "AiChatEventStream" if operation["operationId"] == "streamChatEvents" else "ProbeEventStream"
        elif operation["response"]["format"] == "binary" or operation["response"]["mediaType"] == "text/csv":
            return_type = "Vec<u8>"
        elif response_schema:
            return_type = f"models::{response_schema}"
        else:
            return_type = "()"
        lines.extend(
            [
                f"    /// {operation['summary']}",
                "    ///",
            ]
        )
        for parameter in parameters:
            lines.append(f"    /// * `{snake_case(parameter['name'])}` - {parameter['description']}")
        if operation["requestBodySchema"]:
            lines.append(f"    /// * `input` - {operation['summary']} 的强类型请求体。 / Typed request body for `{snake_case(operation['operationId'])}`.")
        lines.append(f"    pub async fn {snake_case(operation['operationId'])}(")
        lines.append("        &self,")
        lines.extend(f"        {parameter}," for parameter in signature)
        lines.append(f"    ) -> Result<{return_type}, ApiError> {{")
        suffix = operation["relativePath"]
        format_arguments = []
        for parameter in path_parameters:
            marker = f"{{{parameter['name']}}}"
            suffix = suffix.replace(marker, "{}")
            format_arguments.append(f"encode_path_segment({snake_case(parameter['name'])})")
        if not operation["sse"]:
            if format_arguments:
                lines.append(f"        let suffix = format!({json.dumps(suffix)}, {', '.join(format_arguments)});")
            else:
                lines.append(f"        let suffix = {json.dumps(suffix)}.to_owned();")
        if any(parameter["in"] == "query" for parameter in option_parameters):
            lines.append("        let mut query = Vec::new();")
            for parameter in [item for item in option_parameters if item["in"] == "query"]:
                field = snake_case(parameter["name"])
                wire = parameter["name"]
                value_type = scalar_type(parameter)
                if parameter["schema"].get("type") == "array":
                    source = f"&options.{field}" if parameter["required"] else f"options.{field}.as_deref().unwrap_or(&[])"
                    lines.append(f"        for value in {source} {{ query.push(QueryParameter::new({json.dumps(wire)}, value)); }}")
                elif parameter["required"]:
                    value = f"options.{field}.as_str()" if value_type in {"SortDirection", "NullOrdering", "SqlExportFormat"} else f"options.{field}.to_string()"
                    lines.append(f"        query.push(QueryParameter::new({json.dumps(wire)}, {value}));")
                else:
                    lines.append(f"        if let Some(value) = &options.{field} {{")
                    value = "value.as_str()" if value_type == "String" else "value.as_str()" if value_type in {"SortDirection", "NullOrdering", "SqlExportFormat"} else "value.to_string()"
                    lines.append(f"            query.push(QueryParameter::new({json.dumps(wire)}, {value}));")
                    lines.append("        }")
            query = "&query"
        else:
            query = "&[]"
        body = "Some(serde_json::to_string(input)?)" if operation["requestBodySchema"] else "None"
        method = f"Method::{operation['method']}"
        if operation["sse"]:
            request_id = "options.request_id.as_deref()" if option_parameters else "None"
            if operation["operationId"] == "streamChatEvents":
                lines.append(f"        self.client.stream_chat_events_internal({snake_case(path_parameters[0]['name'])}, input, {request_id}).await")
            else:
                lines.append(f"        self.client.probe_event_stream_internal(input, {request_id}).await")
        elif operation["response"]["format"] == "binary" or operation["response"]["mediaType"] == "text/csv":
            accept = "options.accept.as_deref().unwrap_or(\"application/octet-stream\")"
            lines.append(f"        self.client.request_bytes_internal(&suffix, {query}, {accept}).await")
        elif response_schema:
            lines.append(f"        self.client.request_model_internal({method}, &suffix, {body}, {query}).await")
        else:
            lines.append(f"        self.client.request_status_internal({method}, &suffix, {body}, {query}).await")
        lines.extend(["    }", ""])
    lines.extend(["}", ""])

lines.extend(
    [
        "fn encode_path_segment(value: impl ToString) -> String {",
        "    url::form_urlencoded::byte_serialize(value.to_string().as_bytes()).collect()",
        "}",
        "",
    ]
)

lines.extend([
    "impl ChatApi<'_> {",
    "    /// Subscribe once; a fresh token is acquired for every new connection.",
    "    pub async fn subscribe_chat_events(&self, conversation_id: &str, input: &models::AiChatStreamInput) -> Result<crate::ChatSubscription, ApiError> {",
    "        let client = self.client.subscription_client();",
    "        let events = match client.stream_transport() { crate::StreamTransport::Sse => client.stream_chat_events_internal(conversation_id, input, None).await?, crate::StreamTransport::WebSocket => client.websocket_events_internal(conversation_id, input).await? };",
    "        Ok(crate::ChatSubscription::new(events, client.cancellation()))",
    "    }",
    "}",
    "impl SqlApi<'_> {",
    "    /// Export bytes together with filename and response headers.",
    "    pub async fn export_sql_query_result_with_metadata(&self, conversation_id: &str, result_id: &str, options: &ExportSqlQueryResultOptions) -> Result<crate::DownloadResponse, ApiError> {",
    '        let suffix = format!("/conversations/{}/sql-query-results/{}/export", encode_path_segment(conversation_id), encode_path_segment(result_id));',
    "        self.client.download_internal(&suffix, &[QueryParameter::new(\"format\", options.format.as_str())], options.accept.as_deref().unwrap_or(\"application/octet-stream\")).await",
    "    }",
    "}",
])
OUTPUT.write_text("\n".join(lines), encoding="utf-8")
subprocess.run(["rustfmt", "--edition", "2021", str(OUTPUT)], check=True)
