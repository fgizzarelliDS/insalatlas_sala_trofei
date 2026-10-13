import { describe, it, expect, beforeEach } from 'vitest';
import {
  matchManagerId,
  getSuggestedNextSeason,
  getManagerHistoricalDefaults,
  parseFantacalcioText,
  parseFantacalcioHtml
} from '@/utils/fantacalcioParser';
import { state } from '@/state';
import type { Manager, CompetitionRecord } from '@/types';
import dataJson from '../../public/data.json';

describe('Fantacalcio Parser & Entity Resolution Engine', () => {
  beforeEach(() => {
    state.managers = dataJson.leagueData as unknown as Manager[];
    state.competitions = dataJson.competitions as unknown as CompetitionRecord[];
  });

  describe('matchManagerId', () => {
    it('matches manager by known coach alias', () => {
      expect(matchManagerId('alfius91', 'Any Team')).toBe('m_alfo');
      expect(matchManagerId('petrubik88', 'Any Team')).toBe('m_peterdani');
      expect(matchManagerId('valeriodam', 'Any Team')).toBe('m_valery');
      expect(matchManagerId('miles92', 'Any Team')).toBe('m_makako');
      expect(matchManagerId('vannico', 'Any Team')).toBe('m_vannico');
    });

    it('matches manager by co-manager alias', () => {
      expect(matchManagerId('petrubik88 & vittu', 'Any Team')).toBe('m_peterdani');
      expect(matchManagerId('dr cholo & justino', 'Any Team')).toBe('m_gigicholo');
      expect(matchManagerId('gizza & gustacito', 'Any Team')).toBe('m_gizzagustacito');
    });

    it('matches manager by team keyword fallback', () => {
      expect(matchManagerId(undefined, 'Steven Bradbury FC')).toBe('m_alfo');
      expect(matchManagerId('', 'Sarviette FC')).toBe('m_peterdani');
      expect(matchManagerId(undefined, 'Scalo San Genesio')).toBe('m_valery');
      expect(matchManagerId(undefined, 'Dinamo Paiden')).toBe('m_pippo');
    });

    it('returns undefined for unknown coach and team', () => {
      expect(matchManagerId('sconosciuto999', 'Squadra Fantasma')).toBeUndefined();
    });
  });

  describe('getSuggestedNextSeason', () => {
    it('suggests the next chronological season', () => {
      const nextSeason = getSuggestedNextSeason(state.competitions);
      expect(nextSeason).toMatch(/^\d{4}\/\d{2}$/);
      expect(nextSeason).toBe('2027/28');
    });
  });

  describe('getManagerHistoricalDefaults', () => {
    it('extracts latest team, historical teams, and coach for a known manager', () => {
      const defaults = getManagerHistoricalDefaults('m_alfo', state.managers, state.competitions);
      expect(defaults.latestTeam).toBeTruthy();
      expect(defaults.latestTeam).toContain('Steven');
      expect(defaults.allTeams.length).toBeGreaterThanOrEqual(1);
      expect(defaults.coach).toBeTruthy();
    });
  });

  describe('parseFantacalcioText', () => {
    it('parses official CSV export with headers, URL, and season detection', () => {
      const csvData = `
Classifica Coppa InsalAtlas LeaguePh 26-27,,,,,,,,,,,
https://leghe.fantacalcio.it/insalatlas,,,,,,,,,,,
,,,,,,,,,,,
Pos,Squadra,,G,V,N,P,Gf,Gs,Dr,Pt.,Pt. Totali
1,Scalo San Genesio,,10,7,2,1,20,10,10,23,75.5
2,Steven Bradbury FC,,10,6,2,2,18,12,6,20,73.0
3,Sarviette,,10,5,3,2,15,11,4,18,71.5
4,Dinamo Paiden,,10,1,1,8,8,22,-14,4,61.0
      `;

      const result = parseFantacalcioText(csvData, state.managers);
      expect(result.season).toBe('2026/27');
      expect(result.competitionName).toContain('Coppa InsalAtlas LeaguePh');
      expect(result.leagueUrl).toBe('https://leghe.fantacalcio.it/insalatlas');
      expect(result.rows.length).toBe(4);

      expect(result.rows[0].rank).toBe(1);
      expect(result.rows[0].teamName).toBe('Scalo San Genesio');
      expect(result.rows[0].points).toBe(23);
      expect(result.rows[0].matchedManagerId).toBe('m_valery');

      expect(result.rows[1].rank).toBe(2);
      expect(result.rows[1].teamName).toBe('Steven Bradbury FC');
      expect(result.rows[1].points).toBe(20);
      expect(result.rows[1].matchedManagerId).toBe('m_alfo');

      expect(result.rows[3].rank).toBe(4);
      expect(result.rows[3].matchedManagerId).toBe('m_pippo');
    });

    it('parses web TSV tab-delimited text', () => {
      const tsvData = `
Pos\tSquadra\tCoach\tPt
1\tSteven Bradbury FC\talfius91\t72
2\tSarviette\tpetrubik88\t68
3\tScalo San Genesio\tvaleriodam\t65
      `;

      const result = parseFantacalcioText(tsvData, state.managers);
      expect(result.rows.length).toBe(3);
      expect(result.rows[0].rank).toBe(1);
      expect(result.rows[0].teamName).toBe('Steven Bradbury FC');
      expect(result.rows[0].coachName).toBe('alfius91');
      expect(result.rows[0].points).toBe(72);
      expect(result.rows[0].matchedManagerId).toBe('m_alfo');
    });

    it('parses single-line regex entries', () => {
      const text = `
1. Steven Bradbury FC alfius91 74 pt
2. Sarviette petrubik88 70 pt
3. Scalo San Genesio valeriodam 66 pt
      `;

      const result = parseFantacalcioText(text, state.managers);
      expect(result.rows.length).toBe(3);
      expect(result.rows[0].rank).toBe(1);
      expect(result.rows[0].points).toBe(74);
      expect(result.rows[0].matchedManagerId).toBe('m_alfo');
    });

    it('parses vertical multi-line cell blocks', () => {
      const vertical = `
1
Steven Bradbury FC
alfius91
75.5
2
Sarviette
petrubik88
71
      `;

      const result = parseFantacalcioText(vertical, state.managers);
      expect(result.rows.length).toBe(2);
      expect(result.rows[0].rank).toBe(1);
      expect(result.rows[0].teamName).toBe('Steven Bradbury FC');
      expect(result.rows[0].points).toBe(75.5);
      expect(result.rows[0].matchedManagerId).toBe('m_alfo');
    });
  });

  describe('parseFantacalcioHtml', () => {
    it('parses HTML table structure into rows', () => {
      const html = `
        <table>
          <tbody>
            <tr><td>1</td><td>Steven Bradbury FC</td><td>alfius91</td><td>78</td></tr>
            <tr><td>2</td><td>Sarviette</td><td>petrubik88</td><td>72</td></tr>
          </tbody>
        </table>
      `;

      const result = parseFantacalcioHtml(html, 'https://leghe.fantacalcio.it/test', state.managers);
      expect(result.leagueUrl).toBe('https://leghe.fantacalcio.it/test');
      expect(result.rows.length).toBe(2);
      expect(result.rows[0].rank).toBe(1);
      expect(result.rows[0].teamName).toBe('Steven Bradbury FC');
      expect(result.rows[0].points).toBe(78);
      expect(result.rows[0].matchedManagerId).toBe('m_alfo');
    });
  });
});
