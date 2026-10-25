import { describe, it, expect, beforeAll } from 'vitest';
import { getSeasonMatchdays, computeAllLeagueRecords, filterRecordsByCategory } from '@/analytics/records';
import { getLeagueYearSpan } from '@/analytics/records/helpers';
import type { Manager, CompetitionRecord } from '@/types';
import dataJson from '../../public/data.json';
import { mockLeagueManagers, mockCompetitions } from './test-utils';

describe('All-Time League Records Engine', () => {
  let managers: Manager[];
  let competitions: CompetitionRecord[];

  beforeAll(() => {
    managers = (dataJson.leagueData || (dataJson as any).managers) as Manager[];
    competitions = (dataJson.competitions || []) as CompetitionRecord[];
  });

  describe('getSeasonMatchdays (Matchdays & Rounds Normalization)', () => {
    it('returns 35 matchdays (5 rounds) for 8-team seasons', () => {
      expect(getSeasonMatchdays('2016/17', 8)).toBe(35);
      expect(getSeasonMatchdays('2017/18', 8)).toBe(35);
    });

    it('returns 36 matchdays (4 rounds) for 10-team seasons', () => {
      expect(getSeasonMatchdays('2018/19', 10)).toBe(36);
      expect(getSeasonMatchdays('2019/20', 10)).toBe(36);
    });

    it('returns 33 matchdays (3 rounds) for 12-team seasons', () => {
      expect(getSeasonMatchdays('2021/22', 12)).toBe(33);
      expect(getSeasonMatchdays('2022/23', 12)).toBe(33);
      expect(getSeasonMatchdays('2023/24', 12)).toBe(33);
      expect(getSeasonMatchdays('2024/25', 12)).toBe(33);
      expect(getSeasonMatchdays('2025/26', 12)).toBe(33);
    });

    it('returns 26 matchdays (2 rounds) for 14-team seasons', () => {
      expect(getSeasonMatchdays('2026/27', 14)).toBe(26);
    });
  });

  describe('computeAllLeagueRecords (Algorithmic Invariance with Synthetic Fixtures)', () => {
    it('accurately identifies max single-season points and normalized per-game values', () => {
      const records = computeAllLeagueRecords(mockLeagueManagers, mockCompetitions);
      const pointsRec = records.find(r => r.id === 'max_single_season_points');
      expect(pointsRec).toBeDefined();
      expect(pointsRec!.primaryHolder.managerName).toBe('Champion Manager');
      expect(pointsRec!.primaryHolder.value).toBe(65.0);
      expect(pointsRec!.primaryHolder.formattedValue).toBe('65.0 pt');
      expect(pointsRec!.primaryHolder.season).toBe('2025/26');
    });

    it('accurately identifies multi-title single season record (triplete)', () => {
      const records = computeAllLeagueRecords(mockLeagueManagers, mockCompetitions);
      const tripleteRec = records.find(r => r.id === 'multi_title_season');
      expect(tripleteRec).toBeDefined();
      expect(tripleteRec!.primaryHolder.managerName).toBe('Champion Manager');
      expect(tripleteRec!.primaryHolder.value).toBe(3);
      expect(tripleteRec!.primaryHolder.season).toBe('2024/25');
    });

    it('accurately identifies most scudetti and details completed seasons only', () => {
      const records = computeAllLeagueRecords(mockLeagueManagers, mockCompetitions);
      const scudettiRec = records.find(r => r.id === 'most_scudetti');
      expect(scudettiRec).toBeDefined();
      expect(scudettiRec!.primaryHolder.managerName).toBe('Champion Manager');
      expect(scudettiRec!.primaryHolder.value).toBe(2);
      expect(scudettiRec!.primaryHolder.detail).toContain('su 2 stagioni disputate');
    });

    it('accurately identifies knockout cups and banter cartonati', () => {
      const records = computeAllLeagueRecords(mockLeagueManagers, mockCompetitions);
      const cupsRec = records.find(r => r.id === 'most_cups');
      expect(cupsRec).toBeDefined();
      expect(cupsRec!.primaryHolder.value).toBeGreaterThanOrEqual(1);

      const cartonatoRec = records.find(r => r.id === 'cartonato_collector');
      expect(cartonatoRec).toBeDefined();
      expect(cartonatoRec!.primaryHolder.managerName).toBe('Banter Boss');
      expect(cartonatoRec!.primaryHolder.value).toBe(1);
    });

    it('accurately computes championship margins', () => {
      const records = computeAllLeagueRecords(mockLeagueManagers, mockCompetitions);
      const marginRec = records.find(r => r.id === 'biggest_championship_margin');
      expect(marginRec).toBeDefined();
      expect(marginRec!.primaryHolder.managerName).toBe('Champion Manager');
      expect(marginRec!.primaryHolder.value).toBe(10.0);
      expect(marginRec!.primaryHolder.season).toBe('2024/25');
    });
  });

  describe('computeAllLeagueRecords (Generic Live Data Invariance & Smoke Check)', () => {
    it('computes primary records across all categories on loaded database', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      expect(records.length).toBeGreaterThanOrEqual(10);

      const categories = new Set(records.map(r => r.category));
      expect(categories.has('points')).toBe(true);
      expect(categories.has('titles')).toBe(true);
      expect(categories.has('h2h')).toBe(true);
      expect(categories.has('streaks')).toBe(true);
      expect(categories.has('banter')).toBe(true);
    });

    it('ensures every computed record conforms to strict schema invariants', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      records.forEach(r => {
        expect(r.id).toBeTruthy();
        expect(r.title).toBeTruthy();
        expect(r.category).toMatch(/^(points|titles|h2h|streaks|banter)$/);
        expect(r.primaryHolder).toBeDefined();
        expect(r.primaryHolder.managerName).toBeTruthy();
        expect(typeof r.primaryHolder.value).toBe('number');
        expect(r.primaryHolder.formattedValue).toBeTruthy();

        // If runner-ups exist, verify they have valid names and values
        (r.runnerUps || []).forEach(ru => {
          expect(ru.managerName).toBeTruthy();
          expect(typeof ru.value).toBe('number');
        });
      });
    });

    it('resolves pertinent crests and team names for both single-season and career records', async () => {
      const { resolveManagerRecordCrest } = await import('@/analytics/records');
      const firstManager = managers[0];
      expect(firstManager).toBeDefined();

      const careerCrest = resolveManagerRecordCrest(firstManager.id, undefined, undefined, managers, competitions);
      expect(careerCrest).toBeDefined();

      const compWithManager = competitions.find(c => c.ranking?.some(r => r.managerId === firstManager.id));
      if (compWithManager) {
        const seasonCrest = resolveManagerRecordCrest(firstManager.id, compWithManager.season, undefined, managers, competitions);
        expect(seasonCrest).toBeDefined();
      }
    });
  });

  describe('getLeagueYearSpan', () => {
    it('extracts earliest and latest completed seasons', () => {
      const emptySpan = getLeagueYearSpan([]);
      expect(emptySpan.completedCount).toBe(0);
      expect(emptySpan.startYear).toBeDefined();
      expect(emptySpan.endYear).toBeDefined();

      const span = getLeagueYearSpan(competitions);
      expect(span.spanText).toBe(`${span.startYear}-${span.endYear}`);
      expect(span.completedCount).toBeGreaterThan(0);
    });
  });

  describe('filterRecordsByCategory', () => {
    it('returns all records when filter is "all"', () => {
      const all = computeAllLeagueRecords(managers, competitions);
      const filtered = filterRecordsByCategory(all, 'all');
      expect(filtered.length).toBe(all.length);
    });

    it('filters strictly by category', () => {
      const all = computeAllLeagueRecords(managers, competitions);
      const pointsOnly = filterRecordsByCategory(all, 'points');
      expect(pointsOnly.every(r => r.category === 'points')).toBe(true);

      const banterOnly = filterRecordsByCategory(all, 'banter');
      expect(banterOnly.every(r => r.category === 'banter')).toBe(true);
    });
  });

  describe('filterRecordsBySearch & Empty State', () => {
    it('returns all records when search query is empty', async () => {
      const { filterRecordsBySearch } = await import('@/components/board/records');
      const all = computeAllLeagueRecords(managers, competitions);
      expect(filterRecordsBySearch(all, '').length).toBe(all.length);
      expect(filterRecordsBySearch(all, '   ').length).toBe(all.length);
    });

    it('filters records by manager name case-insensitively', async () => {
      const { filterRecordsBySearch } = await import('@/components/board/records');
      const all = computeAllLeagueRecords(managers, competitions);
      const targetManager = all[0].primaryHolder.managerName;
      const query = targetManager.toLowerCase().slice(0, 3);
      const results = filterRecordsBySearch(all, query);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.primaryHolder.managerName.toLowerCase().includes(query))).toBe(true);
    });

    it('filters records by record title keyword', async () => {
      const { filterRecordsBySearch } = await import('@/components/board/records');
      const all = computeAllLeagueRecords(managers, competitions);
      const firstTitleWord = all[0].title.split(' ')[0].toLowerCase();
      const results = filterRecordsBySearch(all, firstTitleWord);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.title.toLowerCase().includes(firstTitleWord))).toBe(true);
    });

    it('filters records by team name when present', async () => {
      const { filterRecordsBySearch } = await import('@/components/board/records');
      const all = computeAllLeagueRecords(managers, competitions);
      const recWithTeam = all.find(r => r.primaryHolder.teamName && r.primaryHolder.teamName.length > 2);
      if (recWithTeam && recWithTeam.primaryHolder.teamName) {
        const teamKeyword = recWithTeam.primaryHolder.teamName.split(' ')[0].toLowerCase();
        const results = filterRecordsBySearch(all, teamKeyword);
        expect(results.length).toBeGreaterThan(0);
      }
    });

    it('returns empty array when search query matches nothing and renders empty state', async () => {
      const { filterRecordsBySearch, renderRecordsEmptyState } = await import('@/components/board/records');
      const all = computeAllLeagueRecords(managers, competitions);
      const results = filterRecordsBySearch(all, 'nonexistent_query_xyz');
      expect(results.length).toBe(0);

      const html = renderRecordsEmptyState('nonexistent_query_xyz');
      expect(html).toContain('Nessun primato trovato');
      expect(html).toContain('nonexistent_query_xyz');
      expect(html).toContain('Azzera Ricerca');
    });
  });

  describe('renderRecordCard UI with Watermarks and Gazzetta Styles', () => {
    it('renders thematic watermark and eliminates hardcoded dark gray', async () => {
      const { renderRecordCard } = await import('@/components/board/records');
      const records = computeAllLeagueRecords(managers, competitions);
      const anyRec = records[0];
      expect(anyRec).toBeDefined();

      const html = renderRecordCard(anyRec);
      expect(html).toContain('group rounded-2xl');
      // Verify dirty gray rgba(0,0,0,0.12) is replaced with theme variables
      expect(html).not.toContain('rgba(0,0,0,0.12)');
      expect(html).toContain('background-color: var(--input-bg)');
      expect(html).toContain('border-color: var(--input-border)');
    });
  });

  describe('Dual-Target Record Holder & Season Standings Navigation', () => {
    it('generates interactive season links for records with a season and separate manager profile clicks', async () => {
      const { state } = await import('@/state');
      state.managers = managers;
      state.competitions = competitions;

      const { renderRecordsContentHTML } = await import('@/components/board/records');
      const html = renderRecordsContentHTML('all', '');

      // Records with season must contain navigateToSeasonStandings
      expect(html).toContain('navigateToSeasonStandings');
      // Manager name click must stop propagation and open profile modal
      expect(html).toContain('openProfileModal');
      expect(html).toContain('event.stopPropagation()');
    });

    it('navigates to season archive and updates selected season when navigateToSeasonStandings is called', async () => {
      const { navigateToSeasonStandings, getCurrentSelectedSeason } = await import('@/components/board/seasons');

      const originalDoc = (globalThis as any).document;
      const testManagerId = managers[0]?.id || 'm_champ';
      try {
        const scrolledElements: any[] = [];
        const pulseClasses: string[] = [];
        const mockTargetRow = {
          scrollIntoView: (opts: any) => scrolledElements.push(opts),
          classList: {
            add: (c: string) => pulseClasses.push(c),
            remove: (c: string) => {
              const idx = pulseClasses.indexOf(c);
              if (idx >= 0) pulseClasses.splice(idx, 1);
            }
          },
          offsetWidth: 100
        };

        (globalThis as any).document = {
          getElementById: () => null,
          querySelector: (sel: string) => {
            if (sel.includes(testManagerId)) return mockTargetRow;
            return null;
          }
        };

        const mockEvent = {
          stopPropagation: () => {},
          preventDefault: () => {}
        };

        navigateToSeasonStandings('2024/25', testManagerId, mockEvent as any);

        expect(getCurrentSelectedSeason()).toBe('2024/25');
      } finally {
        (globalThis as any).document = originalDoc;
      }
    });

    it('adds data-manager-id to championship table rows for precise highlighting', async () => {
      const { renderChampionshipTable } = await import('@/components/board/seasons');
      const championshipComp = competitions.find(c => c.category === 'Campionato' || /campionato|serie/i.test(c.name)) || mockCompetitions[0];
      const html = renderChampionshipTable(championshipComp);

      expect(html).toContain('data-manager-id=');
      expect(html).toContain('id="standings-row-');
    });
  });
});
