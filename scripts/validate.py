#!/usr/bin/env python3
"""
CLI runner for data and schema validation of public/data.json.
Delegates to scripts.core.validator.
"""

import os
import sys

# Ensure root scripts directory is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.validator import validate_data

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else None
    success = validate_data(target)
    sys.exit(0 if success else 1)
