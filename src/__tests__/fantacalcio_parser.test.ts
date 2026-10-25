import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  matchManagerId,
  getSuggestedNextSeason,
  getManagerHistoricalDefaults,
  parseFantacalcioText,
  parseFantacalcioHtml,
  KNOWN_COACH_MAPPINGS
} from '@/utils/fantacalcioParser';
import { state } from '@/state';
import { mockLeagueManagers, mockCompetitions } from './test-utils';

describe('Fantacalcio Parser & Entity Resolution Engine', () => {
  const registeredMockAliases: string[] = [];

  beforeEach(() => {
    state.managers = mockLeagueManagers;
    state.competitions = mockCompetitions;

    // Register synthetic coach aliases for deterministic unit testing
    const testAliases: Record<string, string> = {
      'test_coach_champ': 'm_champ',
      'test_coach_cup': 'm_cup',
      'test_coach_banter': 'm_banter',
      'duo_coach & co': 'm_champ'
    };

    Object.entries(testAliases).forEach(([alias, id]) => {
      KNOWN_COACH_MAPPINGS[alias] = id;
      registeredMockAliases.push(alias);
    });
  });

  afterEach(() => {
    // Clean up injected test aliases
    registeredMockAliases.forEach(alias => {
      delete KNOWN_COACH_MAPPINGS[alias];
    });
    registeredMockAliases.length = 0;
  });

  describe('matchManagerId', () => {
    it('matches manager by known coach alias', () => {
      expect(matchManagerId('test_coach_champ', 'Any Team', state.managers)).toBe('m_champ');
      expect(matchManagerId('test_coach_cup', 'Any Team', state.managers)).toBe('m_cup');
      expect(matchManagerId('test_coach_banter', 'Any Team', state.managers)).toBe('m_banter');
    });

    it('matches manager by co-manager alias', () => {
      expect(matchManagerId('duo_coach & co', 'Any Team', state.managers)).toBe('m_champ');
    });

    it('matches manager by official display name', () => {
      expect(matchManagerId('Champion Manager', 'Any Team', state.managers)).toBe('m_champ');
      expect(matchManagerId('Cup Specialist', 'Any Team', state.managers)).toBe('m_cup');
    });

    it('matches manager by team keyword fallback from competition history', () => {
      expect(matchManagerId(undefined, 'Champion United', state.managers)).toBe('m_champ');
      expect(matchManagerId('', 'Cup FC', state.managers)).toBe('m_cup');
      expect(matchManagerId(undefined, 'Banter Stars', state.managers)).toBe('m_banter');
    });

    it('returns undefined for unknown coach and team', () => {
      expect(matchManagerId('sconosciuto999', 'Squadra Fantasma', state.managers)).toBeUndefined();
    });
  });

  describe('getSuggestedNextSeason', () => {
    it('suggests the next chronological season based on latest competition season', () => {
      const nextSeason = getSuggestedNextSeason(state.competitions);
      expect(nextSeason).toMatch(/^\d{4}\/\d{2}$/);
      expect(nextSeason).toBe('2027/28');
    });
  });

  describe('getManagerHistoricalDefaults', () => {
    it('extracts latest team, historical teams, and coach for a known manager', () => {
      const defaults = getManagerHistoricalDefaults('m_champ', state.managers, state.competitions);
      expect(defaults.latestTeam).toBe('Champion United');
      expect(defaults.allTeams).toContain('Champion United');
      expect(defaults.coach).toBe('Coach Champ');
    });
  });

  describe('parseFantacalcioText', () => {
    it('parses official CSV export with headers, URL, and season detection', () => {
      const csvData = `
Classifica Campionato Test LeaguePh 26-27,,,,,,,,,,,
https://leghe.fantacalcio.it/testleague,,,,,,,,,,,
,,,,,,,,,,,
Pos,Squadra,,G,V,N,P,Gf,Gs,Dr,Pt.,Pt. Totali
1,Champion United,,10,7,2,1,20,10,10,23,75.5
2,Cup FC,,10,6,2,2,18,12,6,20,73.0
3,Banter Stars,,10,1,1,8,8,22,-14,4,61.0
      `;

      const result = parseFantacalcioText(csvData, state.managers);
      expect(result.season).toBe('2026/27');
      expect(result.competitionName).toContain('Campionato Test LeaguePh');
      expect(result.leagueUrl).toBe('https://leghe.fantacalcio.it/testleague');
      expect(result.rows.length).toBe(3);

      expect(result.rows[0].rank).toBe(1);
      expect(result.rows[0].teamName).toBe('Champion United');
      expect(result.rows[0].points).toBe(23);
      expect(result.rows[0].matchedManagerId).toBe('m_champ');

      expect(result.rows[1].rank).toBe(2);
      expect(result.rows[1].teamName).toBe('Cup FC');
      expect(result.rows[1].points).toBe(20);
      expect(result.rows[1].matchedManagerId).toBe('m_cup');

      expect(result.rows[2].rank).toBe(3);
      expect(result.rows[2].matchedManagerId).toBe('m_banter');
    });

    it('parses web TSV tab-delimited text with coach names', () => {
      const tsvData = `
Pos\tSquadra\tCoach\tPt
1\tChampion United\ttest_coach_champ\t72
2\tCup FC\ttest_coach_cup\t68
      `;

      const result = parseFantacalcioText(tsvData, state.managers);
      expect(result.rows.length).toBe(2);
      expect(result.rows[0].rank).toBe(1);
      expect(result.rows[0].teamName).toBe('Champion United');
      expect(result.rows[0].coachName).toBe('test_coach_champ');
      expect(result.rows[0].points).toBe(72);
      expect(result.rows[0].matchedManagerId).toBe('m_champ');
    });

    it('parses single-line regex entries', () => {
      const text = `
1. Champion United test_coach_champ 74 pt
2. Cup FC test_coach_cup 70 pt
      `;

      const result = parseFantacalcioText(text, state.managers);
      expect(result.rows.length).toBe(2);
      expect(result.rows[0].rank).toBe(1);
      expect(result.rows[0].points).toBe(74);
      expect(result.rows[0].matchedManagerId).toBe('m_champ');
    });

    it('parses vertical multi-line cell blocks', () => {
      const vertical = `
1
Champion United
test_coach_champ
75.5
2
Cup FC
test_coach_cup
71
      `;

      const result = parseFantacalcioText(vertical, state.managers);
      expect(result.rows.length).toBe(2);
      expect(result.rows[0].rank).toBe(1);
      expect(result.rows[0].teamName).toBe('Champion United');
      expect(result.rows[0].points).toBe(75.5);
      expect(result.rows[0].matchedManagerId).toBe('m_champ');
    });
  });

  describe('parseFantacalcioHtml', () => {
    it('parses HTML table structure into rows', () => {
      const html = `
        <table>
          <tbody>
            <tr><td>1</td><td>Champion United</td><td>test_coach_champ</td><td>78</td></tr>
            <tr><td>2</td><td>Cup FC</td><td>test_coach_cup</td><td>72</td></tr>
          </tbody>
        </table>
      `;

      const result = parseFantacalcioHtml(html, 'https://leghe.fantacalcio.it/test', state.managers);
      expect(result.leagueUrl).toBe('https://leghe.fantacalcio.it/test');
      expect(result.rows.length).toBe(2);
      expect(result.rows[0].rank).toBe(1);
      expect(result.rows[0].teamName).toBe('Champion United');
      expect(result.rows[0].points).toBe(78);
      expect(result.rows[0].matchedManagerId).toBe('m_champ');
    });
  });
});
