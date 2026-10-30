"""
tests/test_simultaneous_ingestion.py
Unit tests for simultaneous League (Campionato) and Cup (Coppa) live data ingestion,
dynamic environment variable resolution, standings isolation, and chronological Elo computation.
"""

import unittest
import os
import sys
import json
import tempfile
import shutil

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'scripts')))

from core.config import get_base_dir
from core.live_builder import compile_live_season_details
from core.elo_engine import run_multi_track_elo_pipeline
from fetch_live_rounds import (
    get_active_season_competitions,
    resolve_competition_metadata
)


class TestSimultaneousIngestion(unittest.TestCase):

    def setUp(self):
        self.base_dir = get_base_dir()

    def test_environment_variable_and_season_resolution(self):
        """Verify competition IDs are loaded dynamically from env or season config without hardcoded values."""
        # Test all 5 competitions loaded from env
        env_vars = {
            "COMPETITION_ID": "999111",
            "CUP_COMPETITION_ID": "999222",
            "SUPERCUP_COMPETITION_ID": "999333",
            "MUNDIALITO_COMPETITION_ID": "999444",
            "PERDENTI_COMPETITION_ID": "999555"
        }
        old_env = {k: os.environ.get(k) for k in env_vars}

        try:
            for k, v in env_vars.items():
                os.environ[k] = v

            comps = get_active_season_competitions(self.base_dir)
            self.assertIn("campionato", comps)
            self.assertIn("coppa", comps)
            self.assertIn("supercoppa", comps)
            self.assertIn("mundialito", comps)
            self.assertIn("perdenti", comps)

            self.assertEqual(comps["campionato"]["id"], 999111)
            self.assertEqual(comps["coppa"]["id"], 999222)
            self.assertEqual(comps["supercoppa"]["id"], 999333)
            self.assertEqual(comps["mundialito"]["id"], 999444)
            self.assertEqual(comps["perdenti"]["id"], 999555)

            self.assertEqual(comps["campionato"]["target_file"], "2026-27_rounds.json")
            self.assertEqual(comps["coppa"]["target_file"], "2026-27_cup_rounds.json")
            self.assertEqual(comps["supercoppa"]["target_file"], "2026-27_supercoppa_rounds.json")
            self.assertEqual(comps["mundialito"]["target_file"], "2026-27_mundialito_rounds.json")
            self.assertEqual(comps["perdenti"]["target_file"], "2026-27_perdenti_rounds.json")

            # Resolve metadata by ID
            meta_camp = resolve_competition_metadata(999111, self.base_dir)
            self.assertEqual(meta_camp["category"], "Campionato")
            self.assertEqual(meta_camp["target_file"], "2026-27_rounds.json")

            meta_cup = resolve_competition_metadata(999222, self.base_dir)
            self.assertEqual(meta_cup["category"], "Coppa")
            self.assertEqual(meta_cup["target_file"], "2026-27_cup_rounds.json")

            meta_sc = resolve_competition_metadata(999333, self.base_dir)
            self.assertEqual(meta_sc["category"], "Supercoppa")
            self.assertEqual(meta_sc["target_file"], "2026-27_supercoppa_rounds.json")
        finally:
            for k, old_val in old_env.items():
                if old_val is not None:
                    os.environ[k] = old_val
                else:
                    os.environ.pop(k, None)

    def test_simultaneous_league_and_cup_elo_simulation(self):
        """
        Verify that when a League match (K=32) and Cup match (K=24) occur at the same
        Serie A matchday (e.g. championshipMatchDay 8), both are processed in chronological
        order, each using its correct K-factor, resulting in two distinct trajectory points.
        """
        # Manager A vs Manager B in Campionato (Round 3, Serie A MD 8)
        # Manager A vs Manager C in Coppa (Round 1, Serie A MD 8)
        # Manager B vs Manager D in Coppa (Round 1, Serie A MD 8)
        league_round = {
            "roundNumber": 3,
            "competition": "Serie Atlas",
            "competitionCategory": "Campionato",
            "championshipMatchDay": 8,
            "roundLabel": "G3",
            "matchIndex": 3,
            "matches": [
                {
                    "homeTeam": "Team A",
                    "awayTeam": "Team B",
                    "homeManagerId": "m_a",
                    "awayManagerId": "m_b",
                    "homeScore": 2,
                    "awayScore": 1,
                    "homeFantaPoints": 74.0,
                    "awayFantaPoints": 68.0,
                    "isPlayed": True,
                    "competition": "Serie Atlas",
                    "competitionCategory": "Campionato",
                    "championshipMatchDay": 8,
                    "roundLabel": "G3",
                    "matchIndex": 3
                }
            ]
        }

        cup_round = {
            "roundNumber": 1,
            "competition": "Coppa InsalAtlas",
            "competitionCategory": "Coppa",
            "championshipMatchDay": 8,
            "roundLabel": "C1",
            "matchIndex": 4,
            "matches": [
                {
                    "homeTeam": "Team A",
                    "awayTeam": "Team C",
                    "homeManagerId": "m_a",
                    "awayManagerId": "m_c",
                    "homeScore": 0,
                    "awayScore": 2,
                    "homeFantaPoints": 64.0,
                    "awayFantaPoints": 75.0,
                    "isPlayed": True,
                    "competition": "Coppa InsalAtlas",
                    "competitionCategory": "Coppa",
                    "championshipMatchDay": 8,
                    "roundLabel": "C1",
                    "matchIndex": 4
                },
                {
                    "homeTeam": "Team B",
                    "awayTeam": "Team D",
                    "homeManagerId": "m_b",
                    "awayManagerId": "m_d",
                    "homeScore": 1,
                    "awayScore": 1,
                    "homeFantaPoints": 70.0,
                    "awayFantaPoints": 70.0,
                    "isPlayed": True,
                    "competition": "Coppa InsalAtlas",
                    "competitionCategory": "Coppa",
                    "championshipMatchDay": 8,
                    "roundLabel": "C1",
                    "matchIndex": 4
                }
            ]
        }

        # Sequence of 2026/27 rounds fed to pipeline
        season_2026_rounds = [league_round, cup_round]
        managers_list = [
            {"id": "m_a", "name": "Manager A"},
            {"id": "m_b", "name": "Manager B"},
            {"id": "m_c", "name": "Manager C"},
            {"id": "m_d", "name": "Manager D"}
        ]

        elo_config = {
            "base_rating": 1500.0,
            "scale_factor": 400.0,
            "carryover_alpha": 0.75,
            "k_factors": {
                "Campionato": 32.0,
                "Coppa": 24.0,
                "default": 32.0
            }
        }

        profiles = run_multi_track_elo_pipeline(
            season_2025_rounds=[],
            season_2026_rounds=season_2026_rounds,
            managers_list=managers_list,
            elo_config=elo_config
        )

        self.assertIn("m_a", profiles)
        traj_a = profiles["m_a"]["flat"]["trajectory"]

        # Manager A must have 2 distinct trajectory points for this weekend
        self.assertEqual(len(traj_a), 2)

        # Match 1: Campionato (Round 3, G3, K=32 with Hybrid-Capped Margin Multiplier)
        pt_camp = traj_a[0]
        self.assertEqual(pt_camp["round"], 3)
        self.assertEqual(pt_camp["roundLabel"], "G3")
        self.assertEqual(pt_camp["competitionCategory"], "Campionato")
        self.assertEqual(pt_camp["opponentId"], "m_b")
        self.assertEqual(pt_camp["result"], "W")
        self.assertGreater(pt_camp["delta"], 0)
        self.assertAlmostEqual(pt_camp["delta"], 21.2, places=1)
        self.assertAlmostEqual(pt_camp["elo"], 1500.0 + pt_camp["delta"], places=1)

        # Match 2: Coppa (Round 1, C1, K=24 with Hybrid-Capped Margin Multiplier)
        pt_cup = traj_a[1]
        self.assertEqual(pt_cup["round"], 1)
        self.assertEqual(pt_cup["roundLabel"], "C1")
        self.assertEqual(pt_cup["competitionCategory"], "Coppa")
        self.assertEqual(pt_cup["opponentId"], "m_c")
        self.assertEqual(pt_cup["result"], "L")
        self.assertLess(pt_cup["delta"], 0)
        self.assertAlmostEqual(pt_cup["delta"], -22.3, places=1)
        # Final rating must chain: R_final = R_1 + delta_cup
        self.assertAlmostEqual(pt_cup["elo"], pt_camp["elo"] + pt_cup["delta"], places=1)
        self.assertEqual(profiles["m_a"]["flat"]["current"], pt_cup["elo"])

        # Check Zero-Sum invariant for both matches
        traj_b = profiles["m_b"]["flat"]["trajectory"]
        traj_c = profiles["m_c"]["flat"]["trajectory"]

        # League Match 1 (m_a vs m_b): delta_a + delta_b == 0
        self.assertAlmostEqual(pt_camp["delta"] + traj_b[0]["delta"], 0.0, places=1)

        # Cup Match 1 (m_a vs m_c): delta_a_cup + delta_c_cup == 0
        self.assertAlmostEqual(pt_cup["delta"] + traj_c[0]["delta"], 0.0, places=1)

    def test_mock_live_builder_standings_and_cup_separation(self):
        """
        Verify that compile_live_season_details isolates championship standings
        from cup matches when both 2026-27_rounds.json and 2026-27_cup_rounds.json exist.
        """
        temp_dir = tempfile.mkdtemp(prefix="test_live_ingestion_")
        try:
            live_dir = os.path.join(temp_dir, "data", "live")
            seasons_dir = os.path.join(temp_dir, "data", "seasons")
            public_dir = os.path.join(temp_dir, "public")
            os.makedirs(live_dir, exist_ok=True)
            os.makedirs(seasons_dir, exist_ok=True)
            os.makedirs(public_dir, exist_ok=True)

            # Create mock 2026-27 season definition
            season_payload = {
                "season": "2026/27",
                "in_progress": True,
                "competitions": [
                    {
                        "id": 101,
                        "name": "Serie Atlas",
                        "category": "Campionato",
                        "in_progress": True,
                        "ranking": [
                            {"rank": 1, "teamName": "Team A", "managerId": "m_a"},
                            {"rank": 2, "teamName": "Team B", "managerId": "m_b"}
                        ]
                    },
                    {
                        "id": 102,
                        "name": "Coppa InsalAtlas",
                        "category": "Coppa",
                        "in_progress": True,
                        "ranking": []
                    }
                ]
            }
            with open(os.path.join(seasons_dir, "2026-27.json"), "w", encoding="utf-8") as f:
                json.dump(season_payload, f)

            # League matchday 1 (Team A beats Team B 2-0)
            league_rounds_payload = {
                "season": "2026/27",
                "competitionId": 101,
                "totalRounds": 2,
                "lastCompletedRound": 1,
                "rounds": [
                    {
                        "roundNumber": 1,
                        "championshipMatchDay": 6,
                        "matches": [
                            {
                                "homeTeam": "Team A",
                                "awayTeam": "Team B",
                                "homeManagerId": "m_a",
                                "awayManagerId": "m_b",
                                "homeScore": 2,
                                "awayScore": 0,
                                "homeFantaPoints": 75.0,
                                "awayFantaPoints": 65.0,
                                "isPlayed": True
                            }
                        ]
                    }
                ]
            }
            with open(os.path.join(live_dir, "2026-27_rounds.json"), "w", encoding="utf-8") as f:
                json.dump(league_rounds_payload, f)

            # Cup matchday 1 (Team B beats Team A 3-0 in cup)
            cup_rounds_payload = {
                "season": "2026/27",
                "competitionId": 102,
                "competitionCategory": "Coppa",
                "totalRounds": 1,
                "lastCompletedRound": 1,
                "rounds": [
                    {
                        "roundNumber": 1,
                        "championshipMatchDay": 8,
                        "competitionCategory": "Coppa",
                        "matches": [
                            {
                                "homeTeam": "Team B",
                                "awayTeam": "Team A",
                                "homeManagerId": "m_b",
                                "awayManagerId": "m_a",
                                "homeScore": 3,
                                "awayScore": 0,
                                "homeFantaPoints": 78.0,
                                "awayFantaPoints": 64.0,
                                "isPlayed": True,
                                "competitionCategory": "Coppa"
                            }
                        ]
                    }
                ]
            }
            with open(os.path.join(live_dir, "2026-27_cup_rounds.json"), "w", encoding="utf-8") as f:
                json.dump(cup_rounds_payload, f)

            output_details_path = os.path.join(public_dir, "live_season_details.json")
            res = compile_live_season_details(root_dir=temp_dir, live_dir=live_dir, output_path=output_details_path)

            self.assertIsNotNone(res)
            with open(output_details_path, "r", encoding="utf-8") as f:
                details = json.load(f)

            # 1. Standings must ONLY include League results (Team A has 3 pts, Team B has 0 pts)
            standings = details["standings"]
            self.assertEqual(len(standings), 2)
            team_a_st = next(s for s in standings if s["teamName"] == "Team A")
            team_b_st = next(s for s in standings if s["teamName"] == "Team B")

            self.assertEqual(team_a_st["rank"], 1)
            self.assertEqual(team_b_st["rank"], 2)

            # 2. Cup rounds must be preserved under cupRounds key
            self.assertIn("cupRounds", details)
            self.assertEqual(len(details["cupRounds"]), 1)
            self.assertEqual(details["cupRounds"][0]["roundNumber"], 1)

            # 3. Elo must track both matches in trajectory
            traj_a = team_a_st["elo"]["flat"]["trajectory"]
            self.assertEqual(len(traj_a), 2)
            self.assertEqual(traj_a[0]["roundLabel"], "G1")
            self.assertEqual(traj_a[0]["competitionCategory"], "Campionato")
            self.assertEqual(traj_a[0]["result"], "W")

            self.assertEqual(traj_a[1]["roundLabel"], "C1")
            self.assertEqual(traj_a[1]["competitionCategory"], "Coppa")
            self.assertEqual(traj_a[1]["result"], "L")

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_multiple_tournament_ingestion_and_elo_chronology(self):
        """
        Verify that multiple tournaments (Campionato, Coppa, Supercoppa)
        are all ingested, standings isolate Championship, and Elo trajectory points
        receive proper prefixes (G1, SC1, C1) with tournament K-factors.
        """
        temp_dir = tempfile.mkdtemp()
        try:
            seasons_dir = os.path.join(temp_dir, "data", "seasons")
            live_dir = os.path.join(temp_dir, "data", "live")
            public_dir = os.path.join(temp_dir, "public")
            os.makedirs(seasons_dir, exist_ok=True)
            os.makedirs(live_dir, exist_ok=True)
            os.makedirs(public_dir, exist_ok=True)

            season_mock = {
                "season": "2026/27",
                "in_progress": True,
                "competitions": [
                    {
                        "id": 101,
                        "name": "Serie Atlas",
                        "category": "Campionato",
                        "ranking": [
                            {"rank": 1, "teamName": "Team A", "managerId": "m_a", "coach": "Coach A", "logo": ""},
                            {"rank": 2, "teamName": "Team B", "managerId": "m_b", "coach": "Coach B", "logo": ""}
                        ]
                    },
                    {
                        "id": 102,
                        "name": "Coppa InsalAtlas",
                        "category": "Coppa",
                        "ranking": []
                    },
                    {
                        "id": 103,
                        "name": "Supercoppa InsalAtlas",
                        "category": "Supercoppa",
                        "ranking": []
                    }
                ]
            }
            with open(os.path.join(seasons_dir, "2026-27.json"), "w", encoding="utf-8") as f:
                json.dump(season_mock, f)

            # 1. League Round 1 (championshipMatchDay 6): Team A 2 - 1 Team B
            with open(os.path.join(live_dir, "2026-27_rounds.json"), "w", encoding="utf-8") as f:
                json.dump({
                    "season": "2026/27",
                    "competitionId": 101,
                    "competitionCategory": "Campionato",
                    "totalRounds": 1,
                    "rounds": [{
                        "roundNumber": 1,
                        "championshipMatchDay": 6,
                        "matches": [{
                            "homeTeam": "Team A", "awayTeam": "Team B",
                            "homeManagerId": "m_a", "awayManagerId": "m_b",
                            "homeScore": 2, "awayScore": 1,
                            "homeFantaPoints": 73.0, "awayFantaPoints": 69.0,
                            "isPlayed": True
                        }]
                    }]
                }, f)

            # 2. Supercoppa Round 1 (championshipMatchDay 7): Team B 1 - 0 Team A
            with open(os.path.join(live_dir, "2026-27_supercoppa_rounds.json"), "w", encoding="utf-8") as f:
                json.dump({
                    "season": "2026/27",
                    "competitionId": 103,
                    "competitionCategory": "Supercoppa",
                    "totalRounds": 1,
                    "rounds": [{
                        "roundNumber": 1,
                        "championshipMatchDay": 7,
                        "matches": [{
                            "homeTeam": "Team B", "awayTeam": "Team A",
                            "homeManagerId": "m_b", "awayManagerId": "m_a",
                            "homeScore": 1, "awayScore": 0,
                            "homeFantaPoints": 68.0, "awayFantaPoints": 62.0,
                            "isPlayed": True
                        }]
                    }]
                }, f)

            # 3. Cup Round 1 (championshipMatchDay 8): Team A 3 - 0 Team B
            with open(os.path.join(live_dir, "2026-27_cup_rounds.json"), "w", encoding="utf-8") as f:
                json.dump({
                    "season": "2026/27",
                    "competitionId": 102,
                    "competitionCategory": "Coppa",
                    "totalRounds": 1,
                    "rounds": [{
                        "roundNumber": 1,
                        "championshipMatchDay": 8,
                        "matches": [{
                            "homeTeam": "Team A", "awayTeam": "Team B",
                            "homeManagerId": "m_a", "awayManagerId": "m_b",
                            "homeScore": 3, "awayScore": 0,
                            "homeFantaPoints": 79.0, "awayFantaPoints": 63.0,
                            "isPlayed": True
                        }]
                    }]
                }, f)

            output_details_path = os.path.join(public_dir, "live_season_details.json")
            res = compile_live_season_details(root_dir=temp_dir, live_dir=live_dir, output_path=output_details_path)
            self.assertIsNotNone(res)

            with open(output_details_path, "r", encoding="utf-8") as f:
                details = json.load(f)

            # Standings: Team A rank 1 (won G1), Team B rank 2 (lost G1) - Only G1 counted!
            standings = details["standings"]
            self.assertEqual(standings[0]["teamName"], "Team A")
            self.assertEqual(standings[0]["rank"], 1)
            self.assertEqual(standings[0]["recentForm"], ["W"])
            self.assertEqual(standings[1]["teamName"], "Team B")
            self.assertEqual(standings[1]["rank"], 2)
            self.assertEqual(standings[1]["recentForm"], ["L"])

            # Trajectory for Team A: 3 matches chronologically (G1, SC1, C1)
            traj_a = standings[0]["elo"]["flat"]["trajectory"]
            self.assertEqual(len(traj_a), 3)

            self.assertEqual(traj_a[0]["roundLabel"], "G1")
            self.assertEqual(traj_a[0]["competitionCategory"], "Campionato")
            self.assertEqual(traj_a[0]["result"], "W")

            self.assertEqual(traj_a[1]["roundLabel"], "SC1")
            self.assertEqual(traj_a[1]["competitionCategory"], "Supercoppa")
            self.assertEqual(traj_a[1]["result"], "L")

            self.assertEqual(traj_a[2]["roundLabel"], "C1")
            self.assertEqual(traj_a[2]["competitionCategory"], "Coppa")
            self.assertEqual(traj_a[2]["result"], "W")

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
