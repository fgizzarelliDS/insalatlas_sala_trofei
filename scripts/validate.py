#!/usr/bin/env python3
"""
Zero-dependency data validation script for InsalAtlas Sala Trofei database.
Validates public/data.json against schema structural constraints and integrity rules.
"""

import sys
import json
import os
import re

def validate_manager(m, index):
    required_fields = [
        "id", "name", "years", "gold", "silver", "bronze",
        "spoon", "cup_gold", "cup_silver", "supercup",
        "mundialito", "cartonato"
    ]
    
    for f in required_fields:
        if f not in m:
            return f"Manager #{index} (id: {m.get('id', 'unknown')}): Missing required field '{f}'"
            
    if not isinstance(m["id"], str) or not re.match(r"^[a-zA-Z0-9_-]+$", m["id"]):
        return f"Manager #{index}: Invalid 'id' format '{m.get('id')}'. Must be alphanumeric with underscores/hyphens."

    if not isinstance(m["name"], str) or len(m["name"].strip()) == 0:
        return f"Manager #{index} ({m['id']}): 'name' must be a non-empty string."

    if not isinstance(m["years"], int) or m["years"] < 1:
        return f"Manager #{index} ({m['id']}): 'years' must be an integer >= 1."

    stat_fields = [
        "gold", "silver", "bronze", "spoon", "cup_gold",
        "cup_silver", "supercup", "mundialito", "cartonato"
    ]
    for sf in stat_fields:
        val = m.get(sf)
        if not isinstance(val, int) or val < 0:
            return f"Manager #{index} ({m['id']}): '{sf}' must be a non-negative integer (found {val})."

    for arr_field in ["coach_banners", "cartonato_coaches"]:
        if arr_field in m:
            if not isinstance(m[arr_field], list) or not all(isinstance(x, str) for x in m[arr_field]):
                return f"Manager #{index} ({m['id']}): '{arr_field}' must be a list of strings."

    return None

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_path = os.path.join(root_dir, "public", "data.json")
    schema_path = os.path.join(root_dir, "schemas", "data.schema.json")

    print("[*] Starting InsalAtlas Data Validation...")
    print(f"[*] Checking data file: {data_path}")

    if not os.path.exists(data_path):
        print(f"[!] ERROR: Data file not found at {data_path}")
        sys.exit(1)

    if not os.path.exists(schema_path):
        print(f"[!] ERROR: Schema file not found at {schema_path}")
        sys.exit(1)

    try:
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"[!] ERROR: Failed to parse {data_path} as JSON: {e}")
        sys.exit(1)

    managers = []
    if isinstance(data, dict):
        if "leagueData" in data and isinstance(data["leagueData"], list):
            managers = data["leagueData"]
        elif "managers" in data and isinstance(data["managers"], list):
            managers = data["managers"]
        else:
            print("[!] ERROR: Root object must contain 'leagueData' or 'managers' array.")
            sys.exit(1)
    elif isinstance(data, list):
        managers = data
    else:
        print("[!] ERROR: JSON root must be an object or array.")
        sys.exit(1)

    if len(managers) == 0:
        print("[!] WARNING: Manager list is empty.")
    else:
        print(f"[*] Found {len(managers)} managers in database.")

    ids = set()
    for idx, manager in enumerate(managers):
        err = validate_manager(manager, idx)
        if err:
            print(f"[!] VALIDATION ERROR: {err}")
            sys.exit(1)
            
        m_id = manager["id"]
        if m_id in ids:
            print(f"[!] VALIDATION ERROR: Duplicate manager ID '{m_id}' found at index {idx}.")
            sys.exit(1)
        ids.add(m_id)

    # If jsonschema library is available, run full draft-07 validation as well
    try:
        import jsonschema
        with open(schema_path, "r", encoding="utf-8") as sf:
            schema = json.load(sf)
        jsonschema.validate(instance=data, schema=schema)
        print("[*] JSON Schema Draft-07 validation passed successfully (jsonschema).")
    except ImportError:
        print("[*] Note: 'jsonschema' package not installed, completed native schema validation.")
    except Exception as e:
        print(f"[!] JSON Schema Validation failed: {e}")
        sys.exit(1)

    print("[+] ALL DATA VALIDATION CHECKS PASSED!")
    sys.exit(0)

if __name__ == "__main__":
    main()
