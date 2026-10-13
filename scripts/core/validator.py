"""
scripts/core/validator.py
Data and schema validation engine for InsalAtlas Sala Trofei database.
"""

import os
import sys
import json
import re
from typing import Optional, Dict, Any, List
from .config import get_base_dir, get_public_dir
from .logger import ok, info, warn, error, banner

def validate_manager(m: Dict[str, Any], index: int) -> Optional[str]:
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

    optional_stat_fields = ["supercup_silver", "mundialito_silver"]
    for osf in optional_stat_fields:
        if osf in m:
            val = m.get(osf)
            if not isinstance(val, int) or val < 0:
                return f"Manager #{index} ({m['id']}): '{osf}' must be a non-negative integer (found {val})."

    for arr_field in ["coach_banners", "cartonato_coaches"]:
        if arr_field in m:
            if not isinstance(m[arr_field], list) or not all(isinstance(x, str) for x in m[arr_field]):
                return f"Manager #{index} ({m['id']}): '{arr_field}' must be a list of strings."

    if "history" in m:
        if not isinstance(m["history"], list):
            return f"Manager #{index} ({m['id']}): 'history' must be a list."
        for s_idx, s in enumerate(m["history"]):
            if not isinstance(s, dict):
                return f"Manager #{index} ({m['id']}): History entry #{s_idx} must be an object."
            if "season" not in s or not isinstance(s["season"], str):
                return f"Manager #{index} ({m['id']}): History entry #{s_idx} missing 'season' string."
            if "achievements" in s and not isinstance(s["achievements"], list):
                return f"Manager #{index} ({m['id']}): History entry #{s_idx} 'achievements' must be a list."

    return None

def validate_data(data_path: Optional[str] = None, schema_path: Optional[str] = None) -> bool:
    root_dir = get_base_dir()
    if not data_path:
        data_path = os.path.join(get_public_dir(), "data.json")
    if not schema_path:
        schema_path = os.path.join(root_dir, "schemas", "data.schema.json")

    banner("InsalAtlas Data Validation")
    info(f"Target data file: {data_path}")

    if not os.path.exists(data_path):
        error(f"Data file not found at {data_path}")
        return False

    if not os.path.exists(schema_path):
        error(f"Schema file not found at {schema_path}")
        return False

    try:
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        error(f"Failed to parse {data_path} as JSON: {e}")
        return False

    managers = []
    if isinstance(data, dict):
        if "leagueData" in data and isinstance(data["leagueData"], list):
            managers = data["leagueData"]
        elif "managers" in data and isinstance(data["managers"], list):
            managers = data["managers"]
        else:
            error("Root object must contain 'leagueData' or 'managers' array.")
            return False
    elif isinstance(data, list):
        managers = data
    else:
        error("JSON root must be an object or array.")
        return False

    if len(managers) == 0:
        warn("Manager list is empty.")
    else:
        info(f"Found {len(managers)} managers in database.")

    ids = set()
    for idx, manager in enumerate(managers):
        err = validate_manager(manager, idx)
        if err:
            error(err)
            return False

        m_id = manager["id"]
        if m_id in ids:
            error(f"Duplicate manager ID '{m_id}' found at index {idx}.")
            return False
        ids.add(m_id)

    if isinstance(data, dict) and "competitions" in data:
        comps = data["competitions"]
        if not isinstance(comps, list):
            error("'competitions' must be a list.")
            return False
        info(f"Found {len(comps)} competitions in archive.")
        for c_idx, c in enumerate(comps):
            if not isinstance(c, dict) or "id" not in c or "name" not in c or "season" not in c or "ranking" not in c:
                error(f"Competition #{c_idx} missing required fields (id, name, season, ranking).")
                return False

    # Optional jsonschema Draft-07 check
    try:
        import jsonschema
        with open(schema_path, "r", encoding="utf-8") as sf:
            schema = json.load(sf)
        jsonschema.validate(instance=data, schema=schema)
        ok("JSON Schema Draft-07 validation passed successfully (jsonschema).")
    except ImportError:
        info("Note: 'jsonschema' package not installed, completed native schema validation.")
    except Exception as e:
        error(f"JSON Schema Validation failed: {e}")
        return False

    ok("ALL DATA VALIDATION CHECKS PASSED!")
    return True

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    success = validate_data(target)
    sys.exit(0 if success else 1)
