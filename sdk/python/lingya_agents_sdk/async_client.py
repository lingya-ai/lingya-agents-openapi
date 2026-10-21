"""Native asyncio client with cancellable token acquisition and full-body deadlines."""

from __future__ import annotations

import asyncio
import copy
from collections.abc import AsyncGenerator, Awaitable, Callable, Sequence
from dataclasses import dataclass
from typing import TYPE_CHECKING, TypeVar

import httpx
from pydantic import BaseModel

from .client import AgentsUserClient, HmacAuth, OpenApiCredentials, QueryParameter, RequestBody, TokenContext
from .events import AiChatBriefEvent, decode_ai_chat_brief_event
from .lifecycle import (
    ApiError,
    DownloadResponse,
    RequestOptions,
    await_operation,
    cancellation_event,
    download_response,
    ensure_active,
    notify,
    scoped_options,
)
from .models.ai_chat_stream_input import AiChatStreamInput
from .models.chat_stream_probe_event import ChatStreamProbeEvent
from .models.chat_stream_probe_input import ChatStreamProbeInput

ModelT = TypeVar("ModelT", bound=BaseModel)
T = TypeVar("T")


@dataclass(frozen=True, repr=False)
class AsyncTokenAuth:
    token_provider: Callable[[TokenContext], Awaitable[str]]


class AsyncAgentsClient:
    def __init__(
        self,
        base_url: str,
        channel_id: str,
        credentials: OpenApiCredentials | None = None,
        *,
        auth: AsyncTokenAuth | HmacAuth | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        if not channel_id or (credentials is None) == (auth is None):
            raise ValueError("Provide channel_id and either credentials or auth")
        self.channel_id, self._base_url, self._credentials = channel_id, base_url, credentials
        self._http_client = http_client
        self._bound = AsyncAgentsUserClient(base_url, channel_id, auth, http_client) if auth is not None else None

    def _user(self) -> AsyncAgentsUserClient:
        if self._bound is None:
            raise ValueError("Call for_user before using a legacy channel client")
        return self._bound

    def for_user(self, external_user_id: str) -> AsyncAgentsUserClient:
        if self._credentials is None:
            raise ValueError("Auth already binds identity")
        return AsyncAgentsUserClient(
            self._base_url, self.channel_id, HmacAuth(self._credentials, external_user_id), self._http_client
        )

    async def aclose(self) -> None:
        if self._bound is not None:
            await self._bound.aclose()

    async def __aenter__(self) -> AsyncAgentsClient:
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.aclose()

    @property
    def chat(self) -> AsyncChatApi:
        return self._user().chat

    @property
    def configuration(self) -> AsyncConfigurationApi:
        return self._user().configuration

    @property
    def conversations(self) -> AsyncConversationsApi:
        return self._user().conversations

    @property
    def events(self) -> AsyncEventsApi:
        return self._user().events

    @property
    def files(self) -> AsyncFilesApi:
        return self._user().files

    @property
    def interactions(self) -> AsyncInteractionsApi:
        return self._user().interactions

    @property
    def knowledge(self) -> AsyncKnowledgeApi:
        return self._user().knowledge

    @property
    def messages(self) -> AsyncMessagesApi:
        return self._user().messages

    @property
    def sql(self) -> AsyncSqlApi:
        return self._user().sql

    @property
    def workspace(self) -> AsyncWorkspaceApi:
        return self._user().workspace


class AsyncAgentsUserClient:
    def __init__(
        self,
        base_url: str,
        channel_id: str,
        auth: AsyncTokenAuth | HmacAuth,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.channel_id, self._auth = channel_id, auth
        self._http = http_client or httpx.AsyncClient(timeout=None, follow_redirects=False)
        self._owns_http, self._request_options = http_client is None, RequestOptions()
        self._signer = AgentsUserClient(
            base_url.rstrip("/"),
            channel_id,
            auth.credentials if isinstance(auth, HmacAuth) else None,
            auth.external_user_id if isinstance(auth, HmacAuth) else None,
            (lambda _: "unused") if isinstance(auth, AsyncTokenAuth) else None,
        )
        self._signer.close()
        from .async_bound_api import (
            AsyncChatApi,
            AsyncConfigurationApi,
            AsyncConversationsApi,
            AsyncEventsApi,
            AsyncFilesApi,
            AsyncInteractionsApi,
            AsyncKnowledgeApi,
            AsyncMessagesApi,
            AsyncSqlApi,
            AsyncWorkspaceApi,
        )

        self.chat = AsyncChatApi(self)
        self.configuration = AsyncConfigurationApi(self)
        self.conversations = AsyncConversationsApi(self)
        self.events = AsyncEventsApi(self)
        self.files = AsyncFilesApi(self)
        self.interactions = AsyncInteractionsApi(self)
        self.knowledge = AsyncKnowledgeApi(self)
        self.messages = AsyncMessagesApi(self)
        self.sql = AsyncSqlApi(self)
        self.workspace = AsyncWorkspaceApi(self)

    def with_request_options(self, options: RequestOptions | None = None) -> AsyncAgentsUserClient:
        result = copy.copy(self)
        result._request_options = scoped_options(options)
        return result

    async def aclose(self) -> None:
        if self._owns_http:
            await self._http.aclose()

    async def __aenter__(self) -> AsyncAgentsUserClient:
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.aclose()

    async def _signed_request(
        self,
        method: str,
        suffix: str,
        body: RequestBody = None,
        query: Sequence[QueryParameter] = (),
        accept: str = "application/json",
        request_id: str | None = None,
    ) -> httpx.Request:
        signer = copy.copy(self._signer)
        if isinstance(self._auth, AsyncTokenAuth):
            if suffix.rstrip("/") == "/presign":
                raise ApiError(method, suffix, kind="authentication")
            try:
                token = await self._auth.token_provider(
                    TokenContext(self.channel_id, cancellation_event() or self._request_options.cancel_event)
                )
            except asyncio.CancelledError:
                raise
            except Exception:
                raise ApiError(method, suffix, kind="authentication") from None
            ensure_active()
            signer._token_provider = lambda _: token
        return signer._signed_request(method, suffix, body, query, accept, request_id)

    async def _raw_response(
        self,
        method: str,
        suffix: str,
        body: RequestBody = None,
        query: Sequence[QueryParameter] = (),
        accept: str = "application/json",
    ) -> httpx.Response:
        async def perform() -> httpx.Response:
            if self._request_options.cancel_event is not None and self._request_options.cancel_event.is_set():
                raise ApiError(method, suffix, kind="cancelled")
            request = await self._signed_request(method, suffix, body, query, accept)
            response = await self._http.send(request, follow_redirects=False)
            if not response.is_success:
                raise ApiError(
                    method,
                    suffix,
                    response.status_code,
                    response.text[:65536],
                    request_id=response.headers.get("X-Request-ID"),
                )
            return response

        try:
            deadline = None if self._request_options.timeout_ms is None else asyncio.get_running_loop().time() + self._request_options.timeout_ms / 1000
            return await await_operation(perform(), self._request_options, deadline)
        except (asyncio.TimeoutError, httpx.TimeoutException):
            raise ApiError(method, suffix, kind="timeout") from None
        except httpx.TransportError:
            raise ApiError(method, suffix, kind="network") from None

    async def _request_model(
        self,
        method: str,
        suffix: str,
        response_type: type[ModelT],
        body: RequestBody = None,
        query: Sequence[QueryParameter] = (),
    ) -> ModelT:
        response = await self._raw_response(method, suffix, body, query)
        try:
            return response_type.model_validate_json(response.content)
        except ValueError:
            raise ApiError(method, suffix, kind="protocol") from None

    async def _request_status(
        self, method: str, suffix: str, body: RequestBody = None, query: Sequence[QueryParameter] = ()
    ) -> int:
        return (await self._raw_response(method, suffix, body, query)).status_code

    async def _request_bytes(
        self, method: str, suffix: str, query: Sequence[QueryParameter] = (), accept: str | None = None
    ) -> bytes:
        return (
            await self._raw_response(method, suffix, query=query, accept=accept or "application/octet-stream")
        ).content

    async def _download(
        self, method: str, suffix: str, query: Sequence[QueryParameter] = (), accept: str | None = None
    ) -> DownloadResponse:
        return download_response(
            await self._raw_response(method, suffix, query=query, accept=accept or "application/octet-stream")
        )

    async def _stream_data(self, suffix: str, input: RequestBody, request_id: str | None) -> AsyncGenerator[str, None]:
        loop = asyncio.get_running_loop()
        deadline = (
            None if self._request_options.timeout_ms is None else loop.time() + self._request_options.timeout_ms / 1000
        )

        async def bounded(operation: Awaitable[T], *, idle: bool = False) -> T:
            return await await_operation(operation, self._request_options, deadline, idle=idle)

        response: httpx.Response | None = None
        try:
            request = await bounded(
                self._signed_request("POST", suffix, input, accept="text/event-stream", request_id=request_id)
            )
            response = await bounded(self._http.send(request, stream=True, follow_redirects=False))
            if not response.is_success:
                await bounded(response.aread())
                raise ApiError(
                    "POST",
                    suffix,
                    response.status_code,
                    response.text[:65536],
                    request_id=response.headers.get("X-Request-ID"),
                )
            if response.headers.get("Content-Type", "").split(";")[0].strip().lower() != "text/event-stream":
                raise ApiError("POST", suffix, kind="protocol")
            notify(self._request_options, "opened", "sse", request_id=response.headers.get("X-Request-ID"))
            data: list[str] = []
            lines = response.aiter_lines()
            while True:
                try:
                    line = await bounded(lines.__anext__(), idle=True)
                except StopAsyncIteration:
                    return
                if line == "":
                    if data:
                        yield "\n".join(data)
                        data.clear()
                elif line.startswith(":"):
                    notify(self._request_options, "ready" if line.strip() == ":ready" else "heartbeat", "sse")
                elif line.startswith("data:"):
                    data.append(line[5:].removeprefix(" "))
        except (asyncio.TimeoutError, httpx.TimeoutException):
            raise ApiError("POST", suffix, kind="timeout") from None
        except httpx.TransportError:
            raise ApiError("POST", suffix, kind="network") from None
        finally:
            if response is not None:
                await response.aclose()
            notify(self._request_options, "closed", "sse")

    async def _stream_chat_events(
        self, suffix: str, input: AiChatStreamInput, request_id: str | None = None
    ) -> AsyncGenerator[AiChatBriefEvent, None]:
        stream = self._stream_data(suffix, input, request_id)
        try:
            async for data in stream:
                event = decode_ai_chat_brief_event(data)
                if event.type == "end":
                    await stream.aclose()
                    yield event
                    return
                yield event
            raise ApiError("POST", suffix, kind="unexpected_eof")
        except ValueError:
            raise ApiError("POST", suffix, kind="protocol") from None
        finally:
            await stream.aclose()

    async def _probe_event_stream(
        self, suffix: str, input: ChatStreamProbeInput, request_id: str | None = None
    ) -> AsyncGenerator[ChatStreamProbeEvent, None]:
        stream = self._stream_data(suffix, input, request_id)
        try:
            async for data in stream:
                yield ChatStreamProbeEvent.model_validate_json(data)
        finally:
            await stream.aclose()


if TYPE_CHECKING:
    from .async_bound_api import (
        AsyncChatApi,
        AsyncConfigurationApi,
        AsyncConversationsApi,
        AsyncEventsApi,
        AsyncFilesApi,
        AsyncInteractionsApi,
        AsyncKnowledgeApi,
        AsyncMessagesApi,
        AsyncSqlApi,
        AsyncWorkspaceApi,
    )
