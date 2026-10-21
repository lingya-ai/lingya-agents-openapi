"""HMAC and single-use token clients for the Lingya Agents OpenAPI."""

from __future__ import annotations

import base64
import copy
import hashlib
import hmac
import secrets
import time
from collections.abc import Callable, Generator, Iterator, Sequence
from dataclasses import dataclass
from typing import TYPE_CHECKING, TypeVar

if TYPE_CHECKING:
    from lingya_agents_sdk.bound_api import (
        ChatApi,
        ConfigurationApi,
        ConversationsApi,
        EventsApi,
        FilesApi,
        InteractionsApi,
        KnowledgeApi,
        MessagesApi,
        SqlApi,
        WorkspaceApi,
    )
from urllib.parse import quote, urlencode

import httpx
from pydantic import BaseModel
from typing_extensions import deprecated

from lingya_agents_sdk.events import AiChatBriefEvent, decode_ai_chat_brief_event
from lingya_agents_sdk.lifecycle import ApiError as ApiError
from lingya_agents_sdk.lifecycle import (
    DownloadResponse,
    RequestOptions,
    RequestScope,
    download_response,
    notify,
    scoped_options,
)
from lingya_agents_sdk.models.ai_chat_stream_input import AiChatStreamInput
from lingya_agents_sdk.models.chat_stream_probe_event import ChatStreamProbeEvent
from lingya_agents_sdk.models.chat_stream_probe_input import ChatStreamProbeInput
from lingya_agents_sdk.sse import decode_sse_lines

ModelT = TypeVar("ModelT", bound=BaseModel)
RequestBody = BaseModel | Sequence[BaseModel] | str | None


@dataclass(frozen=True)
class OpenApiCredentials:
    """服务端 OpenAPI 凭证；secret 不参与对象展示。 / Server credentials with a redacted secret."""

    access_key: str
    secret_key: str

    def __repr__(self) -> str:
        return f"OpenApiCredentials(access_key={self.access_key!r}, secret_key='<redacted>')"


@dataclass(frozen=True)
class TokenContext:
    """Context passed to each fresh-token callback."""

    channel_id: str
    cancel_event: object = None
    deadline: float | None = None


@dataclass(frozen=True, repr=False)
class TokenAuth:
    """Single-use token authentication; issue a fresh token per callback."""

    token_provider: Callable[[TokenContext], str]


@dataclass(frozen=True)
class HmacAuth:
    """Bind trusted-server credentials and one external user."""

    credentials: OpenApiCredentials
    external_user_id: str


@dataclass(frozen=True)
class QueryParameter:
    """保留顺序并允许重复名称的查询参数。 / Ordered query parameter that permits repeated names."""

    name: str
    value: str


class AgentsClient:
    """Lingya Agents SDK 入口，支持服务端 HMAC 与一次性令牌。 / HMAC and single-use token SDK entry point.

    客户端保存 channel 范围的凭证，但只有 [for_user()] 返回的用户客户端可以发起请求。
    """

    def __init__(
        self,
        base_url: str,
        channel_id: str,
        credentials: OpenApiCredentials | None = None,
        *,
        auth: TokenAuth | HmacAuth | None = None,
        http_client: httpx.Client | None = None,
    ) -> None:
        if not channel_id:
            raise ValueError("channel_id must not be empty")
        self._base_url = base_url.rstrip("/")
        self.channel_id = channel_id
        if (credentials is None) == (auth is None):
            raise ValueError("Provide either credentials or auth")
        self._http_client = http_client
        self._credentials = credentials
        self._bound: AgentsUserClient | None = None
        if isinstance(auth, TokenAuth):
            self._bound = AgentsUserClient(self._base_url, channel_id, None, None, auth.token_provider, http_client)
        elif isinstance(auth, HmacAuth):
            self._bound = AgentsUserClient(
                self._base_url, channel_id, auth.credentials, auth.external_user_id, http_client=http_client
            )

    def _user(self) -> AgentsUserClient:
        if self._bound is None:
            raise ValueError("Call for_user before using a legacy channel client")
        return self._bound

    def close(self) -> None:
        """Close the identity-bound connection pool."""
        if self._bound is not None:
            self._bound.close()

    def __enter__(self) -> AgentsClient:
        return self

    def __exit__(self, exc_type: object, exc_value: object, traceback: object) -> None:
        self.close()

    def for_user(self, external_user_id: str) -> AgentsUserClient:
        """绑定外部用户并为其后续请求独立签名。 / Bind one external user for signed calls.

        Args:
            external_user_id: 调用方系统的稳定用户 ID，UTF-8 编码后为 1..256 字节且不能含 NUL。

        Returns:
            注入外部用户身份的同步客户端。
        """
        if self._credentials is None:
            raise ValueError("Auth already binds identity; create a new client to switch users")
        return AgentsUserClient(
            self._base_url, self.channel_id, self._credentials, external_user_id, http_client=self._http_client
        )

    @property
    def chat(self) -> ChatApi:
        """Access the identity-bound chat API."""
        return self._user().chat

    @property
    def configuration(self) -> ConfigurationApi:
        """Access the identity-bound configuration API."""
        return self._user().configuration

    @property
    def conversations(self) -> ConversationsApi:
        """Access the identity-bound conversations API."""
        return self._user().conversations

    @property
    def events(self) -> EventsApi:
        """Access the identity-bound events API."""
        return self._user().events

    @property
    def files(self) -> FilesApi:
        """Access the identity-bound files API."""
        return self._user().files

    @property
    def interactions(self) -> InteractionsApi:
        """Access the identity-bound interactions API."""
        return self._user().interactions

    @property
    def knowledge(self) -> KnowledgeApi:
        """Access the identity-bound knowledge API."""
        return self._user().knowledge

    @property
    def messages(self) -> MessagesApi:
        """Access the identity-bound messages API."""
        return self._user().messages

    @property
    def sql(self) -> SqlApi:
        """Access the identity-bound sql API."""
        return self._user().sql

    @property
    def workspace(self) -> WorkspaceApi:
        """Access the identity-bound workspace API."""
        return self._user().workspace


class AgentsUserClient:
    """已绑定外部用户的同步客户端。 / Synchronous client bound to one external user."""

    def __init__(
        self,
        base_url: str,
        channel_id: str,
        credentials: OpenApiCredentials | None,
        external_user_id: str | None,
        token_provider: Callable[[TokenContext], str] | None = None,
        http_client: httpx.Client | None = None,
    ) -> None:
        self._token_provider = token_provider
        user_bytes = (external_user_id or "").encode("utf-8")
        if token_provider is None and (not 1 <= len(user_bytes) <= 256 or b"\0" in user_bytes):
            raise ValueError("external_user_id must contain 1 to 256 UTF-8 bytes and no NUL")
        self.channel_id = channel_id
        self._credentials = credentials
        self._encoded_user = base64.urlsafe_b64encode(user_bytes).rstrip(b"=").decode("ascii")
        self._root = f"{base_url}/api/agents/channel/openapi/v1/{quote(channel_id, safe='')}/chat"
        self._http = http_client or httpx.Client(timeout=None, follow_redirects=False)
        self._owns_http = http_client is None
        self._request_options = RequestOptions()
        self._active_scope: RequestScope | None = None
        self._active_response: httpx.Response | None = None
        from lingya_agents_sdk.bound_api import (
            ChatApi,
            ConfigurationApi,
            ConversationsApi,
            EventsApi,
            FilesApi,
            InteractionsApi,
            KnowledgeApi,
            MessagesApi,
            SqlApi,
            WorkspaceApi,
        )

        self.chat = ChatApi(self)
        self.configuration = ConfigurationApi(self)
        self.conversations = ConversationsApi(self)
        self.events = EventsApi(self)
        self.files = FilesApi(self)
        self.interactions = InteractionsApi(self)
        self.knowledge = KnowledgeApi(self)
        self.messages = MessagesApi(self)
        self.sql = SqlApi(self)
        self.workspace = WorkspaceApi(self)

    @property
    @deprecated("low_level is retained only for migration and will be removed in 1.0")
    def low_level(self) -> AgentsUserClient:
        """返回旧通用请求入口。 / Return the deprecated generic request surface."""
        return self

    def close(self) -> None:
        """释放连接池。 / Close the underlying connection pool."""
        if self._owns_http:
            self._http.close()

    def __enter__(self) -> AgentsUserClient:
        return self

    def __exit__(self, exc_type: object, exc_value: object, traceback: object) -> None:
        self.close()

    def with_request_options(self, options: RequestOptions | None = None) -> AgentsUserClient:
        scoped = copy.copy(self)
        scoped._request_options = scoped_options(options)
        scoped._active_response = None
        scoped._active_scope = RequestScope(scoped._request_options)
        return scoped

    def _download(
        self, method: str, suffix: str, query: Sequence[QueryParameter] = (), accept: str | None = None
    ) -> DownloadResponse:
        return download_response(
            self._raw_response(method, suffix, query=query, accept=accept or "application/octet-stream")
        )

    def _request_model(
        self,
        method: str,
        suffix: str,
        response_type: type[ModelT],
        body: RequestBody = None,
        query: Sequence[QueryParameter] = (),
    ) -> ModelT:
        """调用 JSON 接口并解析为明确 Pydantic 模型。 / Parse JSON into one explicit model.

        Args:
            method: HTTP method。
            suffix: 已完成路径转义的 channel chat 相对路径。
            response_type: 与契约响应对应的 Pydantic 模型类。
            body: 明确的请求模型或最终 UTF-8 JSON 字符串；无请求体时省略。
            query: 保留顺序并允许重复名称的查询参数。

        Raises:
            ApiError: 服务端返回非 2xx 状态。
        """
        response = self._raw_response(method, suffix, body, query)
        try:
            return response_type.model_validate_json(response.content)
        except ValueError:
            raise ApiError(method, suffix, kind="protocol") from None

    @deprecated("Use the matching grouped facade operation; this helper will be removed in 1.0")
    def request_model(
        self,
        method: str,
        suffix: str,
        response_type: type[ModelT],
        body: RequestBody = None,
        query: Sequence[QueryParameter] = (),
    ) -> ModelT:
        """调用兼容期的通用 JSON 入口。 / Call the deprecated generic JSON entry point."""
        return self._request_model(method, suffix, response_type, body, query)

    def _request_status(
        self,
        method: str,
        suffix: str,
        body: RequestBody = None,
        query: Sequence[QueryParameter] = (),
    ) -> int:
        """调用无响应正文的端点并返回 2xx HTTP 状态码。 / Return the successful HTTP status."""
        return self._raw_response(method, suffix, body, query).status_code

    @deprecated("Use the matching grouped facade operation; this helper will be removed in 1.0")
    def request_status(
        self,
        method: str,
        suffix: str,
        body: RequestBody = None,
        query: Sequence[QueryParameter] = (),
    ) -> int:
        """调用兼容期的通用状态入口。 / Call the deprecated generic status entry point."""
        return self._request_status(method, suffix, body, query)

    def _request_bytes(
        self,
        method: str,
        suffix: str,
        query: Sequence[QueryParameter] = (),
        accept: str | None = None,
    ) -> bytes:
        """下载未经文本转换的二进制响应。 / Download exact response bytes.

        Args:
            method: HTTP method，通常为 `GET`。
            suffix: 已编码的相对路径。
            query: 保留顺序的查询参数。
        """
        return self._raw_response(method, suffix, query=query, accept=accept or "application/octet-stream").content

    @deprecated("Use the matching grouped facade operation; this helper will be removed in 1.0")
    def request_bytes(self, method: str, suffix: str, query: Sequence[QueryParameter] = ()) -> bytes:
        """调用兼容期的通用下载入口。 / Call the deprecated generic download entry point."""
        return self._request_bytes(method, suffix, query)

    def _raw_response(
        self,
        method: str,
        suffix: str,
        body: RequestBody = None,
        query: Sequence[QueryParameter] = (),
        accept: str = "application/json",
    ) -> httpx.Response:
        """固定最终请求内容后签名并发送。 / Sign and send the exact final request.

        每次调用重新生成 timestamp 与 nonce，不对写请求自动重试。

        Args:
            method: HTTP method。
            suffix: 已完成路径转义的相对路径，本方法不会二次编码。
            body: 明确请求模型或最终 JSON 字符串，最大 2 MiB。
            query: 最终查询参数；顺序和重复键均参与签名。
            accept: 精确 Accept 值，例如 `application/json`、`text/event-stream` 或 `text/csv`。

        Raises:
            ApiError: 服务端返回非 2xx 状态，异常不包含 secret。
        """
        scope = self._active_scope or RequestScope(self._request_options)
        self._active_scope = scope
        try:
            request = self._signed_request(method, suffix, body, query, accept)
            scope.check()
            request.extensions["timeout"] = httpx.Timeout(scope.remaining()).as_dict()
            response = self._http.send(request, stream=True, follow_redirects=False)
            try:
                chunks = []
                for chunk in response.iter_bytes():
                    scope.check()
                    chunks.append(chunk)
                scope.check()
                result = httpx.Response(
                    response.status_code, headers=response.headers, content=b"".join(chunks), request=request
                )
                if not result.is_success:
                    raise ApiError(
                        method,
                        suffix,
                        result.status_code,
                        result.text[:65536],
                        request_id=result.headers.get("X-Request-ID"),
                    )
                return result
            finally:
                response.close()
        except httpx.TimeoutException:
            raise ApiError(method, suffix, kind="timeout") from None
        except httpx.TransportError:
            scope.check()
            raise ApiError(method, suffix, kind="network") from None

    @deprecated("Use low_level or a grouped facade operation; this helper will be removed in 1.0")
    def raw_response(
        self,
        method: str,
        suffix: str,
        body: RequestBody = None,
        query: Sequence[QueryParameter] = (),
        accept: str = "application/json",
    ) -> httpx.Response:
        """调用兼容期的原始响应入口。 / Call the deprecated raw-response entry point."""
        return self._raw_response(method, suffix, body, query, accept)

    def _stream_chat_events(
        self,
        suffix: str,
        input: AiChatStreamInput,
        request_id: str | None = None,
    ) -> Generator[AiChatBriefEvent, None, None]:
        """订阅对话 SSE，并返回强类型事件或 raw JSON fallback。 / Stream typed conversation events.

        Args:
            conversation_id: 要订阅的会话 ID。
            message_id: 触发本次生成的消息 ID。

        Yields:
            13 种已知事件之一；未知 type 使用包含原始 JSON 的明确 fallback。

        迭代提前结束或抛出异常时始终关闭响应流。
        """
        stream = self._stream_data(suffix, input, request_id)
        try:
            for data in stream:
                event = decode_ai_chat_brief_event(data)
                if event.type == "end":
                    stream.close()
                    yield event
                    return
                yield event
            raise ApiError("POST", suffix, kind="unexpected_eof")
        except ValueError:
            raise ApiError("POST", suffix, kind="protocol") from None
        finally:
            stream.close()

    def _stream_data(self, suffix: str, input: RequestBody, request_id: str | None) -> Generator[str, None, None]:
        scope = RequestScope(self._request_options)
        self._active_scope = scope
        response = None
        try:
            scope.check()
            request = self._signed_request("POST", suffix, input, (), "text/event-stream", request_id)
            remaining = scope.remaining()
            idle = self._request_options.idle_timeout_ms
            request.extensions["timeout"] = httpx.Timeout(remaining, read=min(remaining, idle / 1000) if idle is not None and remaining is not None else idle / 1000 if idle is not None else remaining).as_dict()
            response = self._http.send(request, stream=True, follow_redirects=False)
            self._active_response = response
            if not response.is_success:
                response.read()
                raise ApiError("POST", suffix, response.status_code, response.text[:65536], request_id=response.headers.get("X-Request-ID"))
            if response.headers.get("Content-Type", "").split(";")[0].strip().lower() != "text/event-stream":
                raise ApiError("POST", suffix, kind="protocol")
            notify(self._request_options, "opened", "sse", request_id=response.headers.get("X-Request-ID"))
            def lines() -> Generator[str, None, None]:
                assert response is not None
                for line in response.iter_lines():
                    scope.check()
                    if line.startswith(":"):
                        notify(self._request_options, "ready" if line.strip() == ":ready" else "heartbeat", "sse")
                    yield line
            yield from decode_sse_lines(lines())
            scope.check()
        except httpx.TimeoutException:
            raise ApiError("POST", suffix, kind="timeout") from None
        except httpx.TransportError:
            scope.check()
            raise ApiError("POST", suffix, kind="network") from None
        finally:
            if response is not None:
                response.close()
            self._active_scope = None
            self._active_response = None
            notify(self._request_options, "closed", "sse")

    @deprecated("Use chat.stream_chat_events(conversation_id, AiChatStreamInput(messageId=...))")
    def stream_chat_events(self, conversation_id: str, message_id: str) -> Iterator[AiChatBriefEvent]:
        """订阅兼容期的聊天事件入口。 / Use the deprecated chat-event entry point."""
        suffix = f"/conversations/{quote(conversation_id, safe='')}/stream"
        return self._stream_chat_events(suffix, AiChatStreamInput(messageId=message_id))

    def _probe_event_stream(
        self,
        suffix: str,
        input: ChatStreamProbeInput,
        request_id: str | None = None,
    ) -> Iterator[ChatStreamProbeEvent]:
        """解码诊断 SSE。 / Decode the diagnostic SSE stream."""
        stream = self._stream_data(suffix, input, request_id)
        try:
            for data in stream:
                yield ChatStreamProbeEvent.model_validate_json(data)
        except ValueError:
            raise ApiError("POST", suffix, kind="protocol") from None
        finally:
            stream.close()

    def _signed_request(
        self,
        method: str,
        suffix: str,
        body: RequestBody,
        query: Sequence[QueryParameter],
        accept: str,
        request_id: str | None = None,
    ) -> httpx.Request:
        body_text: str | None
        if isinstance(body, BaseModel):
            body_text = body.model_dump_json(by_alias=True, exclude_unset=True)
        elif isinstance(body, str) or body is None:
            body_text = body
        else:
            body_text = "[" + ",".join(item.model_dump_json(by_alias=True, exclude_unset=True) for item in body) + "]"
        body_bytes = b"" if body_text is None else body_text.encode("utf-8")
        if len(body_bytes) > 2 * 1024 * 1024:
            raise ValueError("request body exceeds the 2 MiB signing limit")
        raw_query = urlencode([(item.name, item.value) for item in query])
        url = f"{self._root}{suffix}{'?' + raw_query if raw_query else ''}"
        if self._token_provider is not None:
            if suffix.rstrip("/") == "/presign":
                raise ApiError(method, suffix, response_body='{"message":"presign requires HMAC authentication"}', kind="authentication")
            headers = {"Accept": accept}
            if body_text is not None:
                headers["Content-Type"] = "application/json"
            if request_id is not None:
                headers["X-Request-ID"] = request_id
            request = self._http.build_request(method, url, headers=headers, content=body_bytes)
            try:
                token = self._token_provider(TokenContext(self.channel_id, self._request_options.cancel_event))
            except Exception:
                raise ApiError(
                    method, suffix, response_body='{"message":"OpenAPI token provider failed"}', kind="authentication"
                ) from None
            if not isinstance(token, str) or not token or any(not 33 <= ord(c) <= 126 for c in token):
                raise ApiError(
                    method, suffix, response_body='{"message":"Invalid OpenAPI token"}', kind="authentication"
                )
            if self._active_scope is not None:
                self._active_scope.check()
            request.headers["X-OpenAPI-Token"] = token
            return request
        assert self._credentials is not None
        timestamp = str(int(time.time()))
        nonce = base64.urlsafe_b64encode(secrets.token_bytes(16)).rstrip(b"=").decode("ascii")
        content_type = "application/json" if body_text is not None else ""
        canonical = "\n".join(
            [
                "OPENAPI-HMAC-SHA256-V1",
                self._credentials.access_key,
                timestamp,
                nonce,
                method.upper(),
                httpx.URL(url).raw_path.decode("ascii").split("?", 1)[0],
                raw_query,
                self._encoded_user,
                content_type,
                hashlib.sha256(body_bytes).hexdigest(),
            ]
        )
        signature = sign_canonical(self._credentials.secret_key, canonical)
        headers = {
            "Accept": accept,
            "X-OpenAPI-AK": self._credentials.access_key,
            "X-OpenAPI-Timestamp": timestamp,
            "X-OpenAPI-Nonce": nonce,
            "X-OpenAPI-User": self._encoded_user,
            "X-OpenAPI-Signature": signature,
        }
        if content_type:
            headers["Content-Type"] = content_type
        if request_id is not None:
            headers["X-Request-ID"] = request_id
        return self._http.build_request(method, url, headers=headers, content=body_bytes)


def sign_canonical(secret_key: str, canonical: str) -> str:
    """计算固定规范串的 HMAC。 / Sign a deterministic canonical string.

    Args:
        secret_key: HMAC-SHA256 secret。
        canonical: 已按协议字段顺序拼接的规范字符串。

    Returns:
        小写十六进制签名。
    """
    return hmac.new(secret_key.encode("utf-8"), canonical.encode("utf-8"), hashlib.sha256).hexdigest()


# Compatibility aliases for 0.3.x callers; new code should use the unprefixed names.
LingyaAgentsClient = AgentsClient
LingyaAgentsUserClient = AgentsUserClient
LingyaApiError = ApiError
