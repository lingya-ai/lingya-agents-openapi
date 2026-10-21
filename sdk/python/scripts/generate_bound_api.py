"""Generate channel-bound Python API groups from the canonical manifest."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parents[1]
MANIFEST = json.loads((ROOT / "openapi/endpoints.json").read_text(encoding="utf-8"))
OUTPUT = ROOT / "lingya_agents_sdk/bound_api.py"


def snake_case(value: str) -> str:
    """Convert an OpenAPI camel-case name to an idiomatic Python identifier."""
    if value == "X-Request-ID":
        return "request_id"
    if value == "Accept":
        return "accept"
    first = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", value)
    return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", first).lower().replace("-", "_")


def class_name(group: str) -> str:
    """Return the stable public class name for one OpenAPI tag."""
    return f"{group.title()}Api"


def python_type(schema: dict[str, object], required: bool) -> str:
    """Map the constrained parameter schemas used by this contract to Python types."""
    value_type = schema.get("type")
    if value_type == "integer":
        result = "int"
    elif value_type == "boolean":
        result = "bool"
    elif value_type == "array":
        result = f"Sequence[{python_type(schema['items'], True)}]"
    elif schema.get("enum"):
        values = ", ".join(repr(value) for value in schema["enum"])
        result = f"Literal[{values}]"
    else:
        result = "str"
    return result if required else f"{result} | None"


def body_type(schema_name: str) -> str:
    """Return the exact public request-body type, including the one array request."""
    if schema_name == "ReturnedReferenceList":
        return "Sequence[ReturnedReference]"
    return schema_name


def default_value(parameter: dict[str, object]) -> str:
    """Render the contract default without inventing client-side behavior."""
    schema = parameter["schema"]
    if "default" not in schema:
        return "None"
    value = schema["default"]
    if value is True:
        return "True"
    if value is False:
        return "False"
    return repr(value)


groups = list(dict.fromkeys(operation["group"] for operation in MANIFEST))
model_names = {
    operation["response"]["schema"]
    for operation in MANIFEST
    if operation["response"]["schema"] and operation["response"]["schema"] != "AiChatBriefEvent"
}
model_names.update(
    "ReturnedReference" if operation["requestBodySchema"] == "ReturnedReferenceList" else operation["requestBodySchema"]
    for operation in MANIFEST
    if operation["requestBodySchema"]
)
model_names.add("ChatStreamProbeEvent")
lines = [
    '"""Channel-bound API groups generated from the Lingya Agents contract.',
    "",
    "The wire contract keeps channelId in every path. These public methods omit it",
    "because AgentsClient already binds the channel before a user is selected.",
    '"""',
    "",
    "from __future__ import annotations",
    "",
    "from collections.abc import Iterator, Sequence",
    "from typing import Literal",
    "from urllib.parse import quote",
    "",
    "from lingya_agents_sdk.events import AiChatBriefEvent",
    "from lingya_agents_sdk.lifecycle import RequestOptions",
    *[f"from lingya_agents_sdk.models.{snake_case(name)} import {name}" for name in sorted(model_names)],
    "",
    "",
]

for group in groups:
    lines.extend(
        [
            f"class {class_name(group)}:",
            f'    """{group} 分组的 channel 绑定接口。 / Channel-bound {group} operations."""',
            "",
            "    def __init__(self, client: AgentsUserClient) -> None:",
            "        self._client = client",
            "",
        ]
    )
    for operation in [item for item in MANIFEST if item["group"] == group]:
        parameters = [item for item in operation["parameters"] if not item.get("boundFrom")]
        path_parameters = [item for item in parameters if item["in"] == "path"]
        query_parameters = [item for item in parameters if item["in"] in {"query", "header"}]
        required_query = [item for item in query_parameters if item["required"]]
        optional_query = [item for item in query_parameters if not item["required"]]
        signature = [f"{snake_case(item['name'])}: {python_type(item['schema'], True)}" for item in path_parameters]
        if operation["requestBodySchema"]:
            signature.append(f"input: {body_type(operation['requestBodySchema'])}")
        signature.extend(f"{snake_case(item['name'])}: {python_type(item['schema'], True)}" for item in required_query)
        signature.extend(
            f"{snake_case(item['name'])}: {python_type(item['schema'], False)} = {default_value(item)}"
            for item in optional_query
        )
        signature.extend(["*", "request_options: RequestOptions | None = None"])
        response_schema = operation["response"]["schema"]
        if operation["sse"]:
            return_type = (
                "Iterator[AiChatBriefEvent]"
                if operation["operationId"] == "streamChatEvents"
                else "Iterator[ChatStreamProbeEvent]"
            )
        elif operation["response"]["format"] == "binary" or operation["response"]["mediaType"] == "text/csv":
            return_type = "bytes"
        elif response_schema:
            return_type = response_schema
        else:
            return_type = "int"
        lines.extend(
            [
                f"    def {snake_case(operation['operationId'])}(",
                "        self,",
                *[f"        {item}," for item in signature],
                f"    ) -> {return_type}:",
                f'        """{operation["summary"]}',
                "",
                "        Args:",
            ]
        )
        for parameter in parameters:
            lines.append(f"            {snake_case(parameter['name'])}: {parameter['description']}")
        if operation["requestBodySchema"]:
            lines.append(
                f"            input: {operation['summary']} 的强类型请求体。 / Typed request body for {operation['operationId']}."
            )
        lines.extend(
            [
                "",
                "        Returns:",
                "            契约定义的强类型响应。 / The typed response defined by the contract.",
                '        """',
            ]
        )
        suffix = operation["relativePath"]
        for parameter in path_parameters:
            name = snake_case(parameter["name"])
            suffix = suffix.replace(f"{{{parameter['name']}}}", f"{{quote(str({name}), safe='')}}")
        lines.append(f"        suffix = {'f' if '{quote(' in suffix else ''}{suffix!r}")
        if any(item["in"] == "query" for item in query_parameters):
            lines.append("        query: list[QueryParameter] = []")
            for parameter in query_parameters:
                name = snake_case(parameter["name"])
                wire_name = parameter["name"]
                if parameter["schema"].get("type") == "array":
                    if parameter["required"]:
                        lines.append(
                            f"        query.extend(QueryParameter({wire_name!r}, str(value)) for value in {name})"
                        )
                    else:
                        lines.append(f"        if {name} is not None:")
                        lines.append(
                            f"            query.extend(QueryParameter({wire_name!r}, str(value)) for value in {name})"
                        )
                elif parameter["in"] == "query":
                    if parameter["required"]:
                        lines.append(f"        query.append(QueryParameter({wire_name!r}, _query_text({name})))")
                    else:
                        lines.append(f"        if {name} is not None:")
                        lines.append(f"            query.append(QueryParameter({wire_name!r}, _query_text({name})))")
        query_expression = "query" if any(item["in"] == "query" for item in query_parameters) else "()"
        body_expression = "input" if operation["requestBodySchema"] else "None"
        method = operation["method"]
        if operation["sse"]:
            request_id = "request_id" if any(item["name"] == "X-Request-ID" for item in query_parameters) else "None"
            lines.append(
                f"        return self._client.with_request_options(request_options)._{snake_case(operation['operationId'])}(suffix, input, {request_id})"
            )
        elif operation["response"]["format"] == "binary" or operation["response"]["mediaType"] == "text/csv":
            accept = "accept" if any(item["name"] == "Accept" for item in query_parameters) else "None"
            lines.append(
                f"        return self._client.with_request_options(request_options)._request_bytes({method!r}, suffix, {query_expression}, {accept})"
            )
        elif response_schema:
            lines.append(
                f"        return self._client.with_request_options(request_options)._request_model({method!r}, suffix, {response_schema}, {body_expression}, {query_expression})"
            )
        else:
            lines.append(
                f"        return self._client.with_request_options(request_options)._request_status({method!r}, suffix, {body_expression}, {query_expression})"
            )
        lines.append("")

# Additional SDK-only helpers are deliberately outside the HTTP operation manifest.
for index in range(len(lines) - 1, -1, -1):
    if lines[index].startswith("class ChatApi:"):
        end = next((i for i in range(index + 1, len(lines)) if lines[i].startswith("class ")), len(lines))
        lines[end:end] = [
            "    def subscribe_chat_events(self, conversation_id: str, input: AiChatStreamInput, transport: Literal['sse', 'websocket'] = 'sse', *, request_options: RequestOptions | None = None) -> ChatSubscription:",
            "        return ChatSubscription(self._client, conversation_id, input, transport, request_options)", "",
        ]
# The export helper has the same wire options and byte decoding as the legacy method.
export_start = next(i for i, line in enumerate(lines) if line.startswith("    def export_sql_query_result("))
export_end = next(i for i in range(export_start + 1, len(lines)) if lines[i].startswith("    def ") or lines[i].startswith("class "))
helper = lines[export_start:export_end].copy()
helper = [line.replace("export_sql_query_result(", "export_sql_query_result_with_metadata(").replace(") -> bytes:", ") -> DownloadResponse:").replace("._request_bytes(", "._download(") for line in helper]
lines[export_end:export_end] = helper
lines.insert(14, "from lingya_agents_sdk.subscription import ChatSubscription")
lines.insert(14, "from lingya_agents_sdk.lifecycle import DownloadResponse")

lines.extend(
    [
        "def _query_text(value: str | int | bool) -> str:",
        '    """Use the lowercase JSON spelling required for boolean query values."""',
        "    return str(value).lower() if isinstance(value, bool) else str(value)",
        "",
        "",
        "# Imported last to avoid a runtime cycle while preserving precise annotations.",
        "from lingya_agents_sdk.client import AgentsUserClient, QueryParameter  # noqa: E402",
        "",
    ]
)

for group in groups:
    lines.append(f"Lingya{group.title()}Api = {class_name(group)}")
lines.append("")

OUTPUT.write_text("\n".join(lines), encoding="utf-8")
subprocess.run([sys.executable, "-m", "ruff", "format", str(OUTPUT)], check=True)

# Async methods use exactly the same parameter and response models.
async_source = "\n".join(lines)
async_source = async_source.replace("from lingya_agents_sdk.subscription import ChatSubscription", "from lingya_agents_sdk.subscription import AsyncChatSubscription as ChatSubscription")
async_source = async_source.replace("Iterator, Sequence", "AsyncIterator, Sequence").replace("Iterator[", "AsyncIterator[")
for group in groups:
    async_source = async_source.replace(f"class {class_name(group)}:", f"class Async{class_name(group)}:")
    async_source = async_source.replace(f"Lingya{group.title()}Api = {class_name(group)}", f"Lingya{group.title()}Api = Async{class_name(group)}")
async_source = async_source.replace("from lingya_agents_sdk.client import AgentsUserClient, QueryParameter", "from lingya_agents_sdk.client import QueryParameter  # noqa: E402\nfrom lingya_agents_sdk.async_client import AsyncAgentsUserClient as AgentsUserClient")
async_lines = async_source.splitlines()
for index, line in enumerate(async_lines):
    if line.startswith("    def ") and not line.startswith("    def __init__"):
        end = next(i for i in range(index, len(async_lines)) if ") ->" in async_lines[i])
        if "AsyncIterator[" not in async_lines[end] and "-> ChatSubscription:" not in async_lines[end]:
            async_lines[index] = line.replace("    def ", "    async def ")
            for i in range(end + 1, len(async_lines)):
                if async_lines[i].startswith("    def ") or async_lines[i].startswith("class "):
                    break
                if "return self._client." in async_lines[i]:
                    async_lines[i] = async_lines[i].replace("return self._client.", "return await self._client.")
async_output = ROOT / "lingya_agents_sdk/async_bound_api.py"
async_output.write_text("\n".join(async_lines), encoding="utf-8")
subprocess.run([sys.executable, "-m", "ruff", "format", str(async_output)], check=True)

subprocess.run([sys.executable, "-m", "ruff", "check", "--fix", str(async_output)], check=True)

subprocess.run([sys.executable, "-m", "ruff", "check", "--fix", str(OUTPUT)], check=True)
