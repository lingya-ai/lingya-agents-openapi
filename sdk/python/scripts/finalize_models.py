"""Normalize generated models using the pinned contract and repository formatting."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parents[1]


def main() -> None:
    """Remove Generator 7.25's unintended outer catch-all for nested metadata."""
    path = ROOT / "lingya_agents_sdk/models/conversation_user_message.py"
    source = path.read_text(encoding="utf-8")
    source = re.sub(r"^    additional_properties:.*\n", "", source, flags=re.MULTILINE)
    source = re.sub(
        r"        # puts key-value pairs in additional_properties in the top level\n"
        r"        if self.additional_properties is not None:\n"
        r"            for _key, _value in self.additional_properties.items\(\):\n"
        r"                _dict\[_key\] = _value\n",
        "",
        source,
    )
    source = re.sub(
        r"        # store additional fields in additional_properties\n"
        r"        for _key in obj.keys\(\):\n"
        r"            if _key not in cls.__properties:\n"
        r"                _obj.additional_properties\[_key\] = obj.get\(_key\)\n",
        "",
        source,
    )
    path.write_text(source, encoding="utf-8")
    subprocess.run(
        [
            sys.executable,
            "-m",
            "ruff",
            "check",
            "--fix",
            "--unsafe-fixes",
            "lingya_agents_sdk/models",
        ],
        cwd=ROOT,
        check=True,
    )
    subprocess.run(
        [sys.executable, "-m", "ruff", "format", "lingya_agents_sdk/models"],
        cwd=ROOT,
        check=True,
    )


if __name__ == "__main__":
    main()
