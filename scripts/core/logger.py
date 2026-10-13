"""
scripts/core/logger.py
Standardized colored console logger with consistent prefixes.
"""

import sys

def _colorize(text: str, color_code: str) -> str:
    if sys.stdout and hasattr(sys.stdout, 'isatty') and sys.stdout.isatty():
        return f"\033[{color_code}m{text}\033[0m"
    return text

def ok(msg: str):
    prefix = _colorize("[OK]", "92")
    print(f"{prefix} {msg}")

def info(msg: str):
    prefix = _colorize("[INFO]", "96")
    print(f"{prefix} {msg}")

def warn(msg: str):
    prefix = _colorize("[WARN]", "93")
    print(f"{prefix} {msg}", file=sys.stderr)

def error(msg: str):
    prefix = _colorize("[ERR]", "91")
    print(f"{prefix} ERROR: {msg}", file=sys.stderr)

def banner(title: str, width: int = 70):
    border = "=" * width
    print(f"\n{border}")
    print(f" {title}")
    print(f"{border}\n")
