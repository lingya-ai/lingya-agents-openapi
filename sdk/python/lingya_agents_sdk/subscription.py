"""Owned sync/async single-connection subscriptions. No automatic reconnect."""

from __future__ import annotations

import asyncio
import json
import threading
import time
from collections.abc import AsyncGenerator, AsyncIterator, Awaitable, Generator, Iterator
from dataclasses import replace
from typing import TYPE_CHECKING, Literal, TypeVar
from urllib.parse import quote

from websockets.exceptions import InvalidStatus, WebSocketException
from websockets.typing import Subprotocol

from .client import QueryParameter
from .events import AiChatBriefEvent, decode_ai_chat_brief_event
from .lifecycle import ApiError, RequestOptions, RequestScope, await_operation, notify
from .models.ai_chat_stream_input import AiChatStreamInput

if TYPE_CHECKING:
    from websockets.asyncio.client import ClientConnection as AsyncConnection
    from websockets.sync.connection import Connection as SyncConnection

    from .async_client import AsyncAgentsUserClient
    from .client import AgentsUserClient

T = TypeVar("T")

Transport = Literal["sse", "websocket"]


def _frame(text: str, message_id: str, ready: bool) -> tuple[str, AiChatBriefEvent | None]:
    try:
        value = json.loads(text)
    except ValueError:
        raise ApiError("GET", "", kind="protocol") from None
    if not isinstance(value, dict) or value.get("id") != message_id:
        raise ApiError("GET", "", kind="protocol")
    kind = value.get("event")
    if kind in ("ready", "complete"):
        return str(kind), None
    if kind == "transport-error":
        raise ApiError("GET", "", response_body=json.dumps(value.get("data")), kind="protocol")
    if not ready or not isinstance(value.get("data"), dict) or not isinstance(value["data"].get("type"), str):
        raise ApiError("GET", "", kind="protocol")
    try:
        event = decode_ai_chat_brief_event(json.dumps(value["data"]))
    except ValueError:
        raise ApiError("GET", "", kind="protocol") from None
    return "end" if event.type == "end" else "event", event


class _JoinedCancel(threading.Event):
    def __init__(self, parent: threading.Event | None) -> None:
        super().__init__()
        self._parent = parent

    def is_set(self) -> bool:
        return super().is_set() or self._parent is not None and self._parent.is_set()

    def wait(self, timeout: float | None = None) -> bool:
        deadline = None if timeout is None else time.monotonic() + timeout
        while not self.is_set():
            if deadline is not None and time.monotonic() >= deadline:
                return False
            super().wait(0.01)
        return True


class ChatSubscription(Iterator[AiChatBriefEvent]):
    def __init__(
        self,
        client: AgentsUserClient,
        conversation_id: str,
        input: AiChatStreamInput,
        transport: Transport = "sse",
        options: RequestOptions | None = None,
    ) -> None:
        self._server_request_id: str | None = None
        self._diagnostics = options or RequestOptions()
        def observer(event: dict[str, object]) -> None:
            if isinstance(event.get("request_id"), str):
                self._server_request_id = str(event["request_id"])
            if event.get("type") != "closed" and self._diagnostics.on_connection_event is not None:
                self._diagnostics.on_connection_event(event)
        self._cancel = _JoinedCancel(options.cancel_event if options is not None else None)
        self._explicit_closed = False
        self._client = client.with_request_options(replace(self._diagnostics, cancel_event=self._cancel, on_connection_event=observer))
        self._diagnostics = replace(self._diagnostics, _connection_id=self._client._request_options._connection_id)
        self._conversation, self._input, self._transport = conversation_id, input, transport
        self._iterator = self._run()
        self.closed: dict[str, object] | None = None
        self._socket: SyncConnection | None = None

    def __iter__(self) -> ChatSubscription:
        return self

    def __next__(self) -> AiChatBriefEvent:
        return next(self._iterator)

    def close(self) -> None:
        self._explicit_closed = True
        self._cancel.set()
        if self._client._active_response is not None:
            self._client._active_response.close()
        if self._socket is not None:
            self._socket.close()
        try:
            self._iterator.close()
        except ValueError:
            pass  # A synchronous read running on another thread observes cancellation.
        if self.closed is None:
            self.closed = {"reason": "closed"}

    def __enter__(self) -> ChatSubscription:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def _run(self) -> Generator[AiChatBriefEvent, None, None]:
        reason = "normal"
        stream = None
        try:
            suffix = f"/conversations/{quote(self._conversation, safe='')}/stream"
            if self._transport == "sse":
                stream = self._client._stream_chat_events(suffix, self._input)
                for event in stream:
                    if event.type == "end":
                        reason = "end"
                        stream.close()
                        self.closed = {"reason": reason}
                    yield event
                return
            if self._transport != "websocket":
                raise ValueError("Unknown stream transport")
            from websockets.exceptions import ConnectionClosed
            from websockets.sync.client import connect

            scope = RequestScope(self._client._request_options)
            self._client._active_scope = scope
            request = self._client._signed_request(
                "GET", suffix + "/ws", None, [QueryParameter("messageId", self._input.message_id)], "application/json"
            )
            headers = dict(request.headers)
            token = headers.pop("x-openapi-token", None)
            url = str(request.url).replace("https://", "wss://", 1).replace("http://", "ws://", 1)
            with connect(
                url,
                subprotocols=[Subprotocol("xlt-openapi-token." + token)] if token else None,
                additional_headers={k: v for k, v in headers.items() if k.startswith("x-openapi-")},
                open_timeout=scope.remaining(),
                close_timeout=0,
            ) as socket:
                self._socket = socket
                notify(self._client._request_options, "opened", "websocket", request_id=socket.response.headers.get("X-Request-ID") if socket.response is not None else None)
                ready = False
                while True:
                    scope.check()
                    timeout = scope.remaining()
                    idle = self._client._request_options.idle_timeout_ms
                    if idle is not None:
                        timeout = min(timeout, idle / 1000) if timeout is not None else idle / 1000
                    try:
                        text = socket.recv(timeout=timeout)
                    except ConnectionClosed as error:
                        if error.rcvd is not None and error.rcvd.code == 1000:
                            return
                        raise ApiError("GET", suffix, kind="unexpected_eof") from None
                    if not isinstance(text, str):
                        raise ApiError("GET", suffix, kind="protocol")
                    kind, business_event = _frame(text, self._input.message_id, ready)
                    if kind == "ready":
                        ready = True
                        notify(self._client._request_options, "ready", "websocket", request_id=self._server_request_id)
                    elif kind == "complete":
                        reason = "complete"
                        return
                    elif business_event is not None:
                        if kind == "end":
                            reason = "end"
                            socket.close()
                            self.closed = {"reason": reason}
                        yield business_event
                        if kind == "end":
                            return
        except TimeoutError:
            reason = "timeout"
            raise ApiError("", "", kind="timeout") from None
        except InvalidStatus as error:
            reason = "error"
            raise ApiError("GET", "", error.response.status_code, bytes(error.response.body).decode("utf8", errors="replace"), request_id=error.response.headers.get("X-Request-ID")) from None
        except (WebSocketException, OSError):
            reason = "error"
            raise ApiError("GET", "", kind="network") from None
        except ApiError as error:
            if self._explicit_closed:
                reason = "closed"
                return
            reason = error.kind
            raise
        finally:
            if stream is not None:
                stream.close()
            reason = "closed" if self._explicit_closed else reason
            self.closed = {"reason": reason}
            notify(self._diagnostics, "closed", self._transport, reason=reason, request_id=self._server_request_id)


class AsyncChatSubscription(AsyncIterator[AiChatBriefEvent]):
    def __init__(
        self,
        client: AsyncAgentsUserClient,
        conversation_id: str,
        input: AiChatStreamInput,
        transport: Transport = "sse",
        options: RequestOptions | None = None,
    ) -> None:
        self._server_request_id: str | None = None
        self._diagnostics = options or RequestOptions()
        def observer(event: dict[str, object]) -> None:
            if isinstance(event.get("request_id"), str):
                self._server_request_id = str(event["request_id"])
            if event.get("type") != "closed" and self._diagnostics.on_connection_event is not None:
                self._diagnostics.on_connection_event(event)
        self._client = client.with_request_options(replace(self._diagnostics, on_connection_event=observer))
        self._diagnostics = replace(self._diagnostics, _connection_id=self._client._request_options._connection_id)
        self._conversation, self._input, self._transport = conversation_id, input, transport
        self._iterator = self._run()
        self.closed: asyncio.Future[dict[str, object]] = asyncio.get_running_loop().create_future()
        self._socket: AsyncConnection | None = None
        self._pending: asyncio.Task[AiChatBriefEvent] | None = None
        self._explicit_closed = False

    def __aiter__(self) -> AsyncChatSubscription:
        return self

    async def __anext__(self) -> AiChatBriefEvent:
        self._pending = asyncio.create_task(self._iterator.__anext__())
        try:
            return await self._pending
        finally:
            self._pending = None

    async def aclose(self) -> None:
        self._explicit_closed = True
        if self._pending is not None:
            self._pending.cancel()
            try:
                await self._pending
            except (asyncio.CancelledError, StopAsyncIteration):
                pass
        if self._socket is not None:
            await self._socket.close()
        await self._iterator.aclose()
        if not self.closed.done():
            self.closed.set_result({"reason": "closed"})

    async def __aenter__(self) -> AsyncChatSubscription:
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.aclose()

    async def _run(self) -> AsyncGenerator[AiChatBriefEvent, None]:
        reason = "normal"
        stream = None
        try:
            suffix = f"/conversations/{quote(self._conversation, safe='')}/stream"
            if self._transport == "sse":
                stream = self._client._stream_chat_events(suffix, self._input)
                async for event in stream:
                    if event.type == "end":
                        reason = "end"
                        await stream.aclose()
                        if not self.closed.done():
                            self.closed.set_result({"reason": reason})
                    yield event
                return
            if self._transport != "websocket":
                raise ValueError("Unknown stream transport")
            from websockets.asyncio.client import connect
            from websockets.exceptions import ConnectionClosed

            started = time.monotonic()
            total = self._client._request_options.timeout_ms

            async def bounded(operation: Awaitable[T], *, reading: bool = False) -> T:
                deadline = None if total is None else asyncio.get_running_loop().time() + max(0, total / 1000 - (time.monotonic() - started))
                return await await_operation(operation, self._client._request_options, deadline, idle=reading)

            request = await bounded(
                self._client._signed_request(
                    "GET", suffix + "/ws", query=[QueryParameter("messageId", self._input.message_id)]
                )
            )
            headers = dict(request.headers)
            token = headers.pop("x-openapi-token", None)
            url = str(request.url).replace("https://", "wss://", 1).replace("http://", "ws://", 1)
            socket = await bounded(
                connect(
                    url,
                    subprotocols=[Subprotocol("xlt-openapi-token." + token)] if token else None,
                    additional_headers={k: v for k, v in headers.items() if k.startswith("x-openapi-")},
                    close_timeout=0,
                )
            )
            self._socket = socket
            notify(self._client._request_options, "opened", "websocket", request_id=socket.response.headers.get("X-Request-ID") if socket.response is not None else None)
            try:
                ready = False
                while True:
                    try:
                        text = await bounded(socket.recv(), reading=True)
                    except ConnectionClosed as error:
                        if error.rcvd is not None and error.rcvd.code == 1000:
                            return
                        raise ApiError("GET", suffix, kind="unexpected_eof") from None
                    if not isinstance(text, str):
                        raise ApiError("GET", suffix, kind="protocol")
                    kind, business_event = _frame(text, self._input.message_id, ready)
                    if kind == "ready":
                        ready = True
                        notify(self._client._request_options, "ready", "websocket", request_id=self._server_request_id)
                    elif kind == "complete":
                        reason = "complete"
                        return
                    elif business_event is not None:
                        if kind == "end":
                            reason = "end"
                            await socket.close()
                            if not self.closed.done():
                                self.closed.set_result({"reason": reason})
                        yield business_event
                        if kind == "end":
                            return
            finally:
                await socket.close()
        except asyncio.TimeoutError:
            reason = "timeout"
            raise ApiError("", "", kind="timeout") from None
        except asyncio.CancelledError:
            reason = "closed" if self._explicit_closed else "cancelled"
            raise
        except InvalidStatus as error:
            reason = "error"
            raise ApiError("GET", "", error.response.status_code, bytes(error.response.body).decode("utf8", errors="replace"), request_id=error.response.headers.get("X-Request-ID")) from None
        except (WebSocketException, OSError):
            reason = "error"
            raise ApiError("GET", "", kind="network") from None
        except ApiError as error:
            reason = error.kind
            raise
        finally:
            if stream is not None:
                await stream.aclose()
            reason = "closed" if self._explicit_closed else reason
            if not self.closed.done():
                self.closed.set_result({"reason": reason})
            notify(self._diagnostics, "closed", self._transport, reason=reason, request_id=self._server_request_id)
