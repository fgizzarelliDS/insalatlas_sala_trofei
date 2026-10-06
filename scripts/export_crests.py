import os
import json
import urllib.parse
import re

def export_crests():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logos_file = os.path.join(base_dir, "scripts", "team_logos_placeholder.json")
    out_dir = os.path.join(base_dir, "public", "assets", "crests")
    os.makedirs(out_dir, exist_ok=True)

    with open(logos_file, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    count = 0
    updated_catalog = {}

    for team_name, data in catalog.items():
        crest_id = data.get("id")
        data_uri = data.get("svgDataUri", "")
        if not crest_id or not data_uri:
            continue

        prefix = "data:image/svg+xml;utf8,"
        if data_uri.startswith(prefix):
            svg_content = urllib.parse.unquote(data_uri[len(prefix):])
        elif data_uri.startswith("data:image/svg+xml,"):
            svg_content = urllib.parse.unquote(data_uri[len("data:image/svg+xml,"):])
        else:
            svg_content = data_uri

        svg_content = re.sub(r'<text[^>]*>.*?</text>', '', svg_content, flags=re.DOTALL)

        # Clean up redundant spaces inside tags
        svg_content = re.sub(r'\s{2,}', ' ', svg_content).strip()
        if not svg_content.endswith("</svg>"):
            svg_content += "\n</svg>"

        out_path = os.path.join(out_dir, f"{crest_id}.svg")
        with open(out_path, "w", encoding="utf-8") as out_f:
            out_f.write(svg_content)
        count += 1
        print(f"[+] Saved textless crest: {crest_id}.svg ({team_name})")

        clean_data = dict(data)
        clean_data["svgDataUri"] = "data:image/svg+xml;utf8," + urllib.parse.quote(svg_content)
        updated_catalog[team_name] = clean_data

    with open(logos_file, "w", encoding="utf-8") as f:
        json.dump(updated_catalog, f, ensure_ascii=False, indent=2)

    print(f"[*] Successfully exported {count} textless SVG crests to public/assets/crests/ and updated catalog.")

if __name__ == "__main__":
    export_crests()
