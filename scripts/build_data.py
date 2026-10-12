#!/usr/bin/env python3
"""
CLI runner for compiling modular data/ into public/data.json.
Delegates to scripts.core.builder.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.builder import build_data

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else None
    sys.exit(build_data(target))
