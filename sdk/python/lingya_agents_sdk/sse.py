"""SSE framing utilities."""

from collections.abc import Iterable, Iterator


def decode_sse_lines(lines: Iterable[str]) -> Iterator[str]:
    """合并多行 data 并忽略心跳注释。 / Join multiline data and ignore heartbeats.

    Args:
        lines: 已去除 CR/LF 的增量 SSE 行。

    Yields:
        每个完整事件合并后的 data 字符串；EOF 丢弃未闭合 frame。
    """
    data: list[str] = []
    for line in lines:
        if line == "":
            if data:
                yield "\n".join(data)
                data.clear()
        elif line.startswith("data:"):
            data.append(line[5:].removeprefix(" "))
