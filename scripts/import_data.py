#!/usr/bin/env python3
"""
CLI runner for importing and decomposing public/data.json into data/.
Delegates to scripts.core.importer.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.importer import import_data

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else None
    sys.exit(import_data(target))
