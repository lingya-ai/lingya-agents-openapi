"""Shared cancellation, deadlines, errors and download metadata."""

from __future__ import annotations

import asyncio
import json
import re
import threading
import time
import uuid
from collections.abc import Awaitable, Callable
from contextvars import ContextVar
from dataclasses import dataclass, field, replace
from typing import TypeVar
from urllib.parse import unquote

import httpx


class ApiError(RuntimeError):
    def __init__(
        self,
        method: str,
        path: str,
        status_code: int | None = None,
        response_body: str = "",
        *,
        kind: str = "http",
        request_id: str | None = None,
    ) -> None:
        try:
            parsed = json.loads(response_body)
        except (ValueError, TypeError):
            parsed = {}
        if not isinstance(parsed, dict):
            parsed = {}
        super().__init__(str(parsed.get("message", f"{method} {path} {kind} {status_code or ''}")))
        self.method, self.path, self.status_code, self.response_body = method, path, status_code, response_body
        self.kind, self.request_id = kind, request_id
        self.code = parsed.get("code")
        self.fields = parsed.get("fields", [])


@dataclass(frozen=True)
class RequestOptions:
    timeout_ms: float | None = None
    cancel_event: threading.Event | None = None
    idle_timeout_ms: float | None = None
    on_connection_event: Callable[[dict[str, object]], None] | None = None

    _connection_id: str = field(default_factory=lambda: uuid.uuid4().hex, repr=False, compare=False)

    def __post_init__(self) -> None:
        if any(
            v is not None and (v <= 0 or v != v or v == float("inf")) for v in (self.timeout_ms, self.idle_timeout_ms)
        ):
            raise ValueError("Timeouts must be finite and positive")


@dataclass
class RequestScope:
    options: RequestOptions = field(default_factory=RequestOptions)
    started: float = field(default_factory=time.monotonic)

    def check(self) -> None:
        if self.options.cancel_event is not None and self.options.cancel_event.is_set():
            raise ApiError("", "", kind="cancelled")
        if self.options.timeout_ms is not None and (time.monotonic() - self.started) * 1000 >= self.options.timeout_ms:
            raise ApiError("", "", kind="timeout")

    def remaining(self) -> float | None:
        self.check()
        return (
            None
            if self.options.timeout_ms is None
            else max(0.001, self.options.timeout_ms / 1000 - (time.monotonic() - self.started))
        )


@dataclass(frozen=True)
class DownloadResponse:
    bytes: bytes
    filename: str | None
    content_type: str | None
    headers: httpx.Headers
    status: int
    request_id: str | None


def download_response(response: httpx.Response) -> DownloadResponse:
    disposition = response.headers.get("Content-Disposition", "")
    encoded = re.search(r"filename\*=UTF-8''([^;]+)", disposition, re.I)
    plain = re.search(r'filename="([^"]*)"|filename=([^;\s]+)', disposition, re.I)
    name = (
        unquote(encoded.group(1))
        if encoded
        else (next((g for g in plain.groups() if g is not None), None) if plain else None)
    )
    return DownloadResponse(
        response.content,
        name,
        response.headers.get("Content-Type"),
        response.headers,
        response.status_code,
        response.headers.get("X-Request-ID"),
    )


T = TypeVar("T")
_async_cancel: ContextVar[threading.Event | None] = ContextVar("agents_request_cancel", default=None)

def cancellation_event() -> threading.Event | None:
    return _async_cancel.get()

def ensure_active() -> None:
    marker = _async_cancel.get()
    if marker is not None and marker.is_set():
        raise ApiError("", "", kind="cancelled")


async def await_operation(operation: Awaitable[T], options: RequestOptions, deadline: float | None = None, *, idle: bool = False) -> T:
    """Race native async work with cooperative event cancellation and one fixed deadline."""
    marker = threading.Event()
    context = _async_cancel.set(marker)
    try:
        task = asyncio.ensure_future(operation)
    finally:
        _async_cancel.reset(context)
    try:
        remaining = None if deadline is None else max(0, deadline - asyncio.get_running_loop().time())
        if idle and options.idle_timeout_ms is not None:
            remaining = min(remaining, options.idle_timeout_ms / 1000) if remaining is not None else options.idle_timeout_ms / 1000
        expires = None if remaining is None else asyncio.get_running_loop().time() + remaining
        while True:
            if options.cancel_event is not None and options.cancel_event.is_set():
                raise ApiError("", "", kind="cancelled")
            remaining = None if expires is None else max(0, expires - asyncio.get_running_loop().time())
            if remaining == 0:
                raise TimeoutError
            tick = min(remaining, 0.01) if remaining is not None else 0.01
            done, _ = await asyncio.wait({task}, timeout=remaining if options.cancel_event is None else tick)
            if done:
                return task.result()
    finally:
        if not task.done():
            marker.set()
            task.cancel()
            def discard(completed: asyncio.Future[T]) -> None:
                if not completed.cancelled():
                    try:
                        value = completed.result()
                        if isinstance(value, httpx.Response):
                            asyncio.create_task(value.aclose())
                    except BaseException:
                        pass
            task.add_done_callback(discard)


def notify(options: RequestOptions, type: str, transport: str, **details: object) -> None:
    if options.on_connection_event is not None:
        try:
            options.on_connection_event({"type": type, "transport": transport, "connection_id": options._connection_id, **details})
        except Exception:
            pass


def is_cancellation(error: BaseException) -> bool:
    """Recognize native task cancellation and cooperative SDK cancellation."""
    return isinstance(error, asyncio.CancelledError) or isinstance(error, ApiError) and error.kind == "cancelled"


def scoped_options(options: RequestOptions | None) -> RequestOptions:
    return replace(options or RequestOptions(), _connection_id=uuid.uuid4().hex)
