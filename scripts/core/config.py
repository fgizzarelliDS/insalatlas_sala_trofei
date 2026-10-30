"""
scripts/core/config.py
Environment loading, directory resolution, and Fantacalcio API configuration.
"""

import os
import sys

def get_base_dir() -> str:
    """Returns the root workspace directory."""
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_data_dir() -> str:
    return os.path.join(get_base_dir(), "data")

def get_public_dir() -> str:
    return os.path.join(get_base_dir(), "public")

def get_scripts_dir() -> str:
    return os.path.join(get_base_dir(), "scripts")

def load_environment():
    """
    Loads environment variables prioritizing .env.local, then .env,
    using line-by-line parsing to avoid python-dotenv multi-line comment noise.
    """
    base_dir = get_base_dir()
    for env_name in [".env.local", ".env"]:
        env_file = os.path.join(base_dir, env_name)
        if os.path.exists(env_file):
            try:
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip("'\"")
                            if k and k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass

load_environment()

LEAGUE_RULES = {
    "id": "insalatlas",
    "brand_name": "InsalAtlas",
    "spoon_min_teams": 8,
    "excluded_manager_ids": ["m_sorfra"],
    "features": {
        "spoon": True,
        "cup": True,
        "supercup": True,
        "mundialito": True,
        "cartonato": True
    },
    "competitions": {
        "championship": {
            "category": "Campionato",
            "name_contains": ["serie"],
            "title": "Scudetto"
        },
        "cup": {
            "category": "Coppa",
            "title": "Coppa InsalAtlas",
            "runner_up_title": "Finalista Coppa InsalAtlas"
        },
        "supercup": {
            "category": "Supercoppa",
            "title": "Supercoppa InsalAtlas",
            "runner_up_title": "Finalista Supercoppa"
        },
        "mundialito": {
            "category": "Mundialito",
            "title": "Mundialito",
            "runner_up_title": "Finalista Mundialito"
        },
        "cartonato": {
            "category": "Perdenti",
            "title": "Vincitore Playout (Cartonato)"
        },
        "category_id_map": {
            31666: "Coppa",
            348809: "Supercoppa",
            348808: "Mundialito",
            348805: "Perdenti"
        }
    },
    "elo": {
        "base_rating": 1500.0,
        "scale_factor": 400.0,
        "carryover_alpha": 0.75,
        "historical_seeding": {
            "scale": 75.0,
            "min_rating": 1350.0,
            "max_rating": 1650.0
        },
        "k_factors": {
            "Campionato": 32.0,
            "Coppa_Knockout": 40.0,
            "Coppa": 24.0,
            "Supercoppa": 24.0,
            "Mundialito": 16.0,
            "Perdenti": 16.0,
            "default": 32.0
        },
        "odds": {
            "base_draw_nu": 0.72,
            "draw_decay_lambda": 0.03,
            "sensitivity_kappa": 0.55,
            "overround": 1.045,
            "prior_sigma_elo": 60.0,
            "min_sigma_elo": 35.0,
            "min_sigma_power": 1.5,
            "k_shrinkage": 5,
            "hfa_z_shift": 0.0,
            "atlas_weights": {"elo": 0.85, "power": 0.15},
            "flat_weights": {"elo": 0.65, "power": 0.35}
        }
    }
}

LEAGUE_ALIAS = os.getenv("LEAGUE_ALIAS", "")
APP_KEY = os.getenv("APP_KEY", "")
BEARER_TOKEN = os.getenv("BEARER_TOKEN", "")
BASE_API = os.getenv("BASE_API", "")
COMPETITION_ID = os.getenv("COMPETITION_ID", "")
CUP_COMPETITION_ID = os.getenv("CUP_COMPETITION_ID", "")
SUPERCUP_COMPETITION_ID = os.getenv("SUPERCUP_COMPETITION_ID", "")
MUNDIALITO_COMPETITION_ID = os.getenv("MUNDIALITO_COMPETITION_ID", "")
PERDENTI_COMPETITION_ID = os.getenv("PERDENTI_COMPETITION_ID", "")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "it-IT,it;q=0.9,fr-FR;q=0.8,fr;q=0.7,en;q=0.6",
    "Origin": "https://leghe.fantacalcio.it",
    "Referer": "https://leghe.fantacalcio.it/",
    "sec-ch-ua": '"Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "app_key": APP_KEY,
    "Authorization": BEARER_TOKEN if BEARER_TOKEN.startswith("Bearer ") else f"Bearer {BEARER_TOKEN}"
}
