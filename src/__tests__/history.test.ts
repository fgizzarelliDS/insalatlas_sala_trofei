import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { SeasonRecord, CompetitionRecord, Manager } from '@/types';
import { state } from '@/state';
import { LEAGUE } from '@/config';
import { renderRankTrajectorySparkline } from '@/components/modals/profile';
import { toggleCompetitionDrawer } from '@/components/modals/ProfileModal';
import dataJson from '../../public/data.json';
import { mockLeagueManagers } from './test-utils';

describe('Historical Rankings & Career Visualizations', () => {
  beforeEach(() => {
    state.selectedManagerId = null;
    state.competitions = dataJson.competitions as unknown as CompetitionRecord[];
    state.managers = dataJson.leagueData as unknown as Manager[];
  });

  describe('renderRankTrajectorySparkline', () => {
    it('returns empty string if history has no ranked seasons', () => {
      const history: SeasonRecord[] = [
        {
          season: '2016/17',
          team: null,
          rank: null,
          points: null,
          achievements: []
        }
      ];
      const svg = renderRankTrajectorySparkline(history);
      expect(svg).toBe('');
    });

    it('returns empty string when state has no league seasons (Bug B6)', () => {
      state.competitions = [];
      state.managers = [];
      const history: SeasonRecord[] = [
        { season: '2025/26', team: 'Champion', rank: 1, points: 60, achievements: [] }
      ];
      const svg = renderRankTrajectorySparkline(history);
      expect(svg).toBe('');
    });

    it('generates valid SVG bump chart with inverted Y-axis and nodes for ranked seasons', () => {
      const history: SeasonRecord[] = [
        {
          season: '2025/26',
          team: 'StevenBradburyFC',
          rank: 1,
          points: 62.0,
          achievements: [{ title: 'Scudetto', category: 'Campionato', badge: 'gold', icon: '🥇' }]
        },
        {
          season: '2024/25',
          team: 'Steven Bradbury FC',
          rank: 8,
          points: 42.0,
          achievements: []
        },
        {
          season: '2023/24',
          team: 'Steven Bradbury FC',
          rank: 6,
          points: 48.0,
          achievements: []
        },
        {
          season: '2022/23',
          team: 'Steven Bradbury FC',
          rank: 2,
          points: 55.0,
          achievements: []
        },
        {
          season: '2021/22',
          team: 'Steven Bradbury FC',
          rank: 2,
          points: 58.0,
          achievements: []
        }
      ];

      const svg = renderRankTrajectorySparkline(history);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('<path');
      expect(svg).toContain('1°');
      expect(svg).toContain('#1');
      expect(svg).toContain('#2');
      expect(svg).toContain('#8');
      expect(svg).toContain('stroke="var(--accent-color, #f59e0b)"');
    });

    it('orders seasons chronologically ascending on X axis (older left, newer right)', () => {
      const history: SeasonRecord[] = [
        { season: '2025/26', team: 'Team A', rank: 1, points: 60, achievements: [] },
        { season: '2021/22', team: 'Team A', rank: 5, points: 50, achievements: [] }
      ];

      const svg = renderRankTrajectorySparkline(history);
      expect(svg).toContain('21/22');
      expect(svg).toContain('25/26');
      const idx21 = svg.indexOf('21/22');
      const idx25 = svg.indexOf('25/26');
      expect(idx21).toBeLessThan(idx25);
    });

    it('displays participant counts on X axis (8 sq, 10 sq, 12 sq) and in tooltips', () => {
      const history: SeasonRecord[] = [
        { season: '2016/17', team: 'Scalo Barcellona', rank: 1, points: 57, achievements: [] },
        { season: '2018/19', team: 'All Scars Roma3', rank: 1, points: 59, achievements: [] },
        { season: '2025/26', team: 'StevenBradburyFC', rank: 1, points: 62, achievements: [] }
      ];

      const svg = renderRankTrajectorySparkline(history);
      expect(svg).toContain('8 sq');
      expect(svg).toContain('10 sq');
      expect(svg).toContain('12 sq');
      expect(svg).toContain('2016/17: #1 su 8 squadre');
      expect(svg).toContain('2018/19: #1 su 10 squadre');
      expect(svg).toContain('2025/26: #1 su 12 squadre');
    });

    it('uses distinctive badge colors for podium finishes and last place', () => {
      const history: SeasonRecord[] = [
        { season: '2025/26', team: 'Champion', rank: 1, points: 60, achievements: [] },
        { season: '2024/25', team: 'Silver', rank: 2, points: 55, achievements: [] },
        { season: '2023/24', team: 'Bronze', rank: 3, points: 50, achievements: [] },
        { season: '2022/23', team: 'Last', rank: 12, points: 20, achievements: [] }
      ];

      const svg = renderRankTrajectorySparkline(history);
      expect(svg).toContain('fill="#f59e0b"');
      expect(svg).toContain('fill="#94a3b8"');
      expect(svg).toContain('fill="#b45309"');
      expect(svg).toContain('fill="#ef4444"');
    });

    it('colors last place as wooden spoon (#ef4444) for 8, 10, and 12-team seasons, while non-last ranks remain blue', () => {
      // Scurcio profile: 18/19 was 10th on 10 sq (spoon), 25/26 was 10th on 12 sq (safe)
      const scurcioHistory: SeasonRecord[] = [
        { season: '2016/17', team: 'Selfic FC', rank: 6, points: 40, achievements: [] },
        {
          season: '2018/19',
          team: 'Selfic FC',
          rank: 10,
          points: 34,
          achievements: [{ title: 'Cucchiaio di Legno', category: 'Campionato', badge: 'spoon', icon: '🥄' }]
        },
        { season: '2025/26', team: 'TorLupara FC', rank: 10, points: 37, achievements: [] }
      ];

      const svg = renderRankTrajectorySparkline(scurcioHistory);
      // In 18/19 (10 sq), rank 10 is last place -> Cucchiaio di Legno
      expect(svg).toContain('2018/19: #10 su 10 squadre (Selfic FC) (Cucchiaio di Legno 🥄)');
      expect(svg).toContain('fill="#ef4444"');

      // In 25/26 (12 sq), rank 10 is not last place -> regular blue
      expect(svg).toContain('2025/26: #10 su 12 squadre (TorLupara FC)');
      expect(svg).not.toContain('2025/26: #10 su 12 squadre (TorLupara FC) (Cucchiaio di Legno 🥄)');
      expect(svg).toContain('fill="#3b82f6"');
    });


    it('renders hollow N/D circle and dashed line for unranked seasons such as 2020/21', () => {
      const history: SeasonRecord[] = [
        { season: '2021/22', team: 'Team A', rank: 3, points: 55, achievements: [] },
        { season: '2020/21', team: 'Team A', rank: null, points: null, achievements: [] },
        { season: '2019/20', team: 'Team A', rank: 1, points: 65, achievements: [] }
      ];

      const svg = renderRankTrajectorySparkline(history);
      expect(svg).toContain('20/21');
      expect(svg).toContain('N/D');
      expect(svg).toContain('stroke-dasharray="3,3"');
      expect(svg).toContain('fill="var(--modal-bg)"');
      expect(svg).toContain('stroke-dasharray="2,2"');
    });

    it('renders full 10-season timeline with N/D for omitted seasons (e.g. Valery 17/18 and 18/19)', () => {
      // Valery history: played 16/17, missing 17/18 and 18/19, played 19/20, 20/21 null, played 21/22 to 25/26
      const valeryHistory: SeasonRecord[] = [
        { season: '2016/17', team: 'Scalo Barcellona', rank: 1, points: 57, achievements: [] },
        { season: '2019/20', team: 'Scalo San Paolo', rank: 5, points: 47, achievements: [] },
        { season: '2020/21', team: null, rank: null, points: null, achievements: [] },
        { season: '2021/22', team: 'Scalo San Genesio', rank: 3, points: 56, achievements: [] },
        { season: '2025/26', team: 'ScaloSanGenesio', rank: 5, points: 46, achievements: [] }
      ];

      const svg = renderRankTrajectorySparkline(valeryHistory);
      // All seasons are present on X-axis
      expect(svg).toContain('16/17');
      expect(svg).toContain('17/18');
      expect(svg).toContain('18/19');
      expect(svg).toContain('19/20');
      expect(svg).toContain('20/21');
      expect(svg).toContain('25/26');

      // 17/18 and 18/19 are given N/D treatment
      expect(svg).toContain('17/18: Classifica N/D');
      expect(svg).toContain('18/19: Classifica N/D');
    });
  });

  describe('toggleCompetitionDrawer with Mock DOM', () => {
    let originalDocument: unknown;
    let mockDrawer: {
      classList: {
        classes: Set<string>;
        contains: (c: string) => boolean;
        add: (c: string) => void;
        remove: (c: string) => void;
      };
      innerHTML: string;
      textContent: string;
    };

    beforeEach(() => {
      originalDocument = (globalThis as unknown as { document?: unknown }).document;
      mockDrawer = {
        classList: {
          classes: new Set<string>(['competition-drawer', 'hidden']),
          contains(c: string) { return this.classes.has(c); },
          add(c: string) { this.classes.add(c); },
          remove(c: string) { this.classes.delete(c); }
        },
        innerHTML: '',
        textContent: ''
      };

      (globalThis as unknown as { document?: unknown }).document = {
        getElementById(id: string) {
          if (id.startsWith('drawer-comp-')) {
            return mockDrawer;
          }
          return null;
        }
      };
    });

    afterEach(() => {
      (globalThis as unknown as { document?: unknown }).document = originalDocument;
    });

    it('populates and toggles competition drawer with 2-line layout and canonical manager names', async () => {
      const compId = 778165;
      const mockComp: CompetitionRecord = {
        id: compId,
        name: 'Serie Test 2025-2026',
        season: '2025/26',
        category: 'Campionato',
        ranking: [
          { rank: 1, teamName: 'Champion United', coach: 'Coach Champ', managerId: 'm_champ', points: 62.0 },
          { rank: 2, teamName: 'Cup FC', coach: 'Coach Cup', managerId: 'm_cup', points: 57.0 }
        ]
      };
      state.competitions = [mockComp];
      state.managers = [
        { id: 'm_champ', name: 'Champion Manager', years: 3, gold: 1, silver: 1, bronze: 0, spoon: 0, cup_gold: 1, cup_silver: 0, supercup: 1, mundialito: 0, cartonato: 0 },
        { id: 'm_cup', name: 'Cup Specialist', years: 3, gold: 0, silver: 1, bronze: 0, spoon: 0, cup_gold: 1, cup_silver: 0, supercup: 0, mundialito: 0, cartonato: 0 }
      ];
      state.selectedManagerId = 'm_champ';

      toggleCompetitionDrawer(compId);

      expect(mockDrawer.classList.contains('hidden')).toBe(false);
      expect(mockDrawer.innerHTML).toContain('Serie Test 2025-2026');
      expect(mockDrawer.innerHTML).toContain('Champion United');
      expect(mockDrawer.innerHTML).toContain('Cup FC');
      // Must contain canonical manager names as in the main table
      expect(mockDrawer.innerHTML).toContain('Champion Manager');
      expect(mockDrawer.innerHTML).toContain('Cup Specialist');
      // Highlight for selected manager
      expect(mockDrawer.innerHTML).toContain('border-amber-400');

      // Toggling again hides drawer
      toggleCompetitionDrawer(compId);
      expect(mockDrawer.classList.contains('hidden')).toBe(true);
    });

    it('displays "-" instead of "0 pt" for unrecorded points', () => {
      const compId = 147888;
      const mockComp2020: CompetitionRecord = {
        id: compId,
        name: 'SerieTest',
        season: '2020/21',
        category: 'Campionato',
        ranking: [
          { rank: 1, teamName: 'Team A', coach: 'coachA', managerId: 'm_champ', points: null },
          { rank: 2, teamName: 'Team B', coach: 'coachB', managerId: 'm_cup', points: null }
        ]
      };
      state.competitions = [mockComp2020];
      state.managers = [
        { id: 'm_champ', name: 'Champion Manager', years: 2, gold: 1, silver: 0, bronze: 0, spoon: 0, cup_gold: 0, cup_silver: 0, supercup: 0, mundialito: 0, cartonato: 0 },
        { id: 'm_cup', name: 'Cup Specialist', years: 2, gold: 0, silver: 1, bronze: 0, spoon: 0, cup_gold: 0, cup_silver: 0, supercup: 0, mundialito: 0, cartonato: 0 }
      ];
      state.selectedManagerId = 'm_champ';

      toggleCompetitionDrawer(compId, '2020/21');
      expect(mockDrawer.innerHTML).toContain('Champion Manager');
      expect(mockDrawer.innerHTML).toContain('Cup Specialist');
      expect(mockDrawer.innerHTML).toContain('-');
      expect(mockDrawer.innerHTML).not.toContain('0 pt');
    });

    it('shows fallback message if competition is not found', () => {
      const compId = 999999;
      toggleCompetitionDrawer(compId, '2020/21');
      expect(mockDrawer.classList.contains('hidden')).toBe(false);
      expect(mockDrawer.innerHTML).toContain('Dettaglio classifica non disponibile');
    });

    it('sorts wooden spoon to the very last position after N/D participants and renders spoon symbol', () => {
      const compId = 147888;
      const compWithSpoon: CompetitionRecord = {
        id: compId,
        name: 'Championship Test',
        season: '2020/21',
        category: 'Campionato',
        ranking: [
          { rank: 1, teamName: 'Champion Team', coach: 'Coach Champ', managerId: 'm_champ', points: null },
          { rank: null, teamName: 'ND Team', coach: 'Coach ND', managerId: undefined, points: null },
          { rank: 12, teamName: 'Spoon Team', coach: 'Coach Banter', managerId: 'm_banter', points: null }
        ]
      };

      state.competitions = [compWithSpoon];
      state.managers = [
        { id: 'm_champ', name: 'Champion Manager', years: 3, gold: 1, silver: 0, bronze: 0, spoon: 0, cup_gold: 0, cup_silver: 0, supercup: 0, mundialito: 0, cartonato: 0 },
        { id: 'm_banter', name: 'Banter Boss', years: 3, gold: 0, silver: 0, bronze: 0, spoon: 1, cup_gold: 0, cup_silver: 0, supercup: 0, mundialito: 0, cartonato: 0 }
      ];

      toggleCompetitionDrawer(compId, '2020/21');
      expect(mockDrawer.classList.contains('hidden')).toBe(false);
      expect(mockDrawer.innerHTML).toContain('🥄 12°');
      expect(mockDrawer.innerHTML).toContain('Spoon Team');

      // Verify that Spoon Team appears AFTER N/D participants in DOM
      const ndIndex = mockDrawer.innerHTML.indexOf('N/D');
      const spoonIndex = mockDrawer.innerHTML.indexOf('Spoon Team');
      expect(ndIndex).toBeGreaterThan(-1);
      expect(spoonIndex).toBeGreaterThan(ndIndex);
    });
  });

  describe('Historical Team Names (getDistinctTeamNames)', () => {
    it('extracts and deduplicates team names prioritizing spaced versions', async () => {
      const { getDistinctTeamNames } = await import('@/components/modals/profile');
      const mockManager = {
        id: 'm_alfo',
        name: 'Alfo',
        years: 10,
        gold: 1,
        silver: 3,
        bronze: 2,
        spoon: 0,
        cup_gold: 3,
        cup_silver: 0,
        supercup: 3,
        mundialito: 2,
        cartonato: 0,
        history: [
          { season: '2025/26', team: 'StevenBradburyFC', rank: 1, points: 62, achievements: [] },
          { season: '2024/25', team: 'Steven Bradbury FC', rank: 8, points: 42, achievements: [] },
          { season: '2019/20', team: 'Nef Team', rank: 6, points: 46, achievements: [] },
          { season: '2017/18', team: 'FC Salsa Barbecue', rank: 3, points: 55, achievements: [] }
        ]
      };

      const teams = getDistinctTeamNames(mockManager);
      expect(teams).toContain('Steven Bradbury FC');
      expect(teams).not.toContain('StevenBradburyFC'); // Deduplicated in favor of spaced version
      expect(teams).toContain('Nef Team');
      expect(teams).toContain('FC Salsa Barbecue');
      expect(teams.length).toBe(3);
    });
  });

  describe('Database public/data.json Integrity (Dynamic Invariant Suite)', () => {
    it('contains valid leagueData with chronological history and competitions archive', () => {
      expect(dataJson).toBeDefined();
      expect(Array.isArray(dataJson.leagueData)).toBe(true);
      expect(dataJson.leagueData.length).toBeGreaterThanOrEqual(1);

      expect(Array.isArray(dataJson.competitions)).toBe(true);
      expect(dataJson.competitions.length).toBeGreaterThanOrEqual(1);
    });

    it('ensures all managers have 100% consistency between top-level trophies and history achievements', () => {
      const badgeKeys = [
        'gold', 'silver', 'bronze', 'spoon',
        'cup_gold', 'cup_silver', 'supercup', 'supercup_silver',
        'mundialito', 'cartonato'
      ] as const;

      dataJson.leagueData.forEach((m: { name: string; history?: { achievements?: { badge?: string }[] }[] } & Record<string, unknown>) => {
        const counts: Record<string, number> = {};
        badgeKeys.forEach(k => { counts[k] = 0; });

        (m.history || []).forEach(h => {
          (h.achievements || []).forEach(a => {
            if (a.badge && a.badge in counts) {
              counts[a.badge]++;
            }
          });
        });

        badgeKeys.forEach(k => {
          const topVal = (m[k] as number) || 0;
          expect(topVal, `Manager ${m.name} mismatch on ${k}`).toBe(counts[k]);
        });
      });
    });

    it('ensures unique IDs across all managers and competitions', () => {
      const managerIds = (dataJson.leagueData as { id: string }[]).map(m => m.id);
      const uniqueManagerIds = new Set(managerIds);
      expect(uniqueManagerIds.size).toBe(managerIds.length);

      const compIds = (dataJson.competitions as { id: number }[]).map(c => c.id);
      const uniqueCompIds = new Set(compIds);
      expect(uniqueCompIds.size).toBe(compIds.length);
    });

    it('ensures all competitions have valid season formatting and non-empty metadata', () => {
      (dataJson.competitions as CompetitionRecord[]).forEach(comp => {
        expect(comp.id).toBeDefined();
        expect(typeof comp.id).toBe('number');
        expect(comp.name).toBeTruthy();
        expect(comp.category).toBeTruthy();
        expect(comp.season).toMatch(/^\d{4}\/\d{2}$/);
        expect(Array.isArray(comp.ranking)).toBe(true);
        if (!comp.in_progress && comp.status !== 'in_progress') {
          expect(comp.ranking.length).toBeGreaterThan(0);
        }
      });
    });

    it('ensures in-progress season competitions have no premature trophies awarded', () => {
      (dataJson.leagueData as Manager[]).forEach(m => {
        (m.history || []).forEach(h => {
          if (h.in_progress || h.status === 'in_progress') {
            expect(h.achievements || []).toEqual([]);
          }
        });
      });
    });

    it('ensures manager history seasons have valid formatting and non-empty teams', () => {
      (dataJson.leagueData as Manager[]).forEach(m => {
        expect(m.id).toBeTruthy();
        expect(m.name).toBeTruthy();
        expect(m.years).toBeGreaterThanOrEqual(1);
        (m.history || []).forEach(h => {
          expect(h.season).toMatch(/^\d{4}\/\d{2}$/);
          if (!h.in_progress && h.status !== 'in_progress') {
            expect(h.rank).toBeDefined();
          }
        });
      });
    });

    it('ensures database trophies align with active LEAGUE features configuration', () => {
      (dataJson.leagueData as Manager[]).forEach(m => {
        if (!LEAGUE.features.cartonato) {
          expect(m.cartonato || 0, `League has cartonato disabled, but ${m.name} has cartonato`).toBe(0);
        }
        if (!LEAGUE.features.mundialito) {
          expect(m.mundialito || 0, `League has mundialito disabled, but ${m.name} has mundialito`).toBe(0);
        }
        if (!LEAGUE.features.spoon) {
          expect(m.spoon || 0, `League has spoon disabled, but ${m.name} has spoon`).toBe(0);
        }
        if (!LEAGUE.features.cup) {
          expect(m.cup_gold || 0, `League has cup disabled, but ${m.name} has cup_gold`).toBe(0);
        }
        if (!LEAGUE.features.supercup) {
          expect(m.supercup || 0, `League has supercup disabled, but ${m.name} has supercup`).toBe(0);
        }
      });
    });
  });

  describe('Profile Modal Tab Switching', () => {
    let originalDocument: unknown;
    let mockPalmaresContent: { classList: { classes: Set<string>; add: (c: string) => void; remove: (c: string) => void; contains: (c: string) => boolean } };
    let mockCareerContent: { classList: { classes: Set<string>; add: (c: string) => void; remove: (c: string) => void; contains: (c: string) => boolean } };
    let mockBtnPalmares: { className: string };
    let mockBtnCareer: { className: string };

    beforeEach(() => {
      originalDocument = (globalThis as unknown as { document?: unknown }).document;
      mockPalmaresContent = {
        classList: {
          classes: new Set<string>(),
          add(c: string) { this.classes.add(c); },
          remove(c: string) { this.classes.delete(c); },
          contains(c: string) { return this.classes.has(c); }
        }
      };
      mockCareerContent = {
        classList: {
          classes: new Set<string>(['hidden']),
          add(c: string) { this.classes.add(c); },
          remove(c: string) { this.classes.delete(c); },
          contains(c: string) { return this.classes.has(c); }
        }
      };
      mockBtnPalmares = { className: '' };
      mockBtnCareer = { className: '' };

      (globalThis as unknown as { document?: unknown }).document = {
        getElementById(id: string) {
          if (id === 'profile-tab-palmares-content') return mockPalmaresContent;
          if (id === 'profile-tab-career-content') return mockCareerContent;
          if (id === 'profile-tab-btn-palmares') return mockBtnPalmares;
          if (id === 'profile-tab-btn-career') return mockBtnCareer;
          return null;
        }
      };
    });

    afterEach(() => {
      (globalThis as unknown as { document?: unknown }).document = originalDocument;
    });

    it('switches between Tab 1 Palmares and Tab 2 Career content', async () => {
      const { switchProfileModalTab } = await import('@/components/modals/ProfileModal');

      // Switch to career
      switchProfileModalTab('career');
      expect(mockPalmaresContent.classList.contains('hidden')).toBe(true);
      expect(mockCareerContent.classList.contains('hidden')).toBe(false);
      expect(mockBtnCareer.className).toContain('text-amber-400');

      // Switch back to palmares
      switchProfileModalTab('palmares');
      expect(mockPalmaresContent.classList.contains('hidden')).toBe(false);
      expect(mockCareerContent.classList.contains('hidden')).toBe(true);
      expect(mockBtnPalmares.className).toContain('text-amber-400');
    });
  });

  describe('Main View Tab Switching and Seasons Archive', () => {
    let originalDocument: unknown;
    let mockAlboContent: { classList: { classes: Set<string>; add: (c: string) => void; remove: (c: string) => void; contains: (c: string) => boolean } };
    let mockSeasonsContent: {
      classList: { classes: Set<string>; add: (c: string) => void; remove: (c: string) => void; contains: (c: string) => boolean };
      innerHTML: string;
    };
    let mockRecordsContent: {
      classList: { classes: Set<string>; add: (c: string) => void; remove: (c: string) => void; contains: (c: string) => boolean };
      innerHTML: string;
    };
    let mockBtnAlbo: { className: string; style: { color: string } };
    let mockBtnSeasons: { className: string; style: { color: string } };
    let mockBtnRecords: { className: string; style: { color: string } };

    beforeEach(() => {
      originalDocument = (globalThis as unknown as { document?: unknown }).document;
      mockAlboContent = {
        classList: {
          classes: new Set<string>(),
          add(c: string) { this.classes.add(c); },
          remove(c: string) { this.classes.delete(c); },
          contains(c: string) { return this.classes.has(c); }
        }
      };
      mockSeasonsContent = {
        classList: {
          classes: new Set<string>(['hidden']),
          add(c: string) { this.classes.add(c); },
          remove(c: string) { this.classes.delete(c); },
          contains(c: string) { return this.classes.has(c); }
        },
        innerHTML: ''
      };
      mockRecordsContent = {
        classList: {
          classes: new Set<string>(['hidden']),
          add(c: string) { this.classes.add(c); },
          remove(c: string) { this.classes.delete(c); },
          contains(c: string) { return this.classes.has(c); }
        },
        innerHTML: ''
      };
      mockBtnAlbo = { className: '', style: { color: '' } };
      mockBtnSeasons = { className: '', style: { color: '' } };
      mockBtnRecords = { className: '', style: { color: '' } };

      (globalThis as unknown as { document?: unknown }).document = {
        getElementById(id: string) {
          if (id === 'main-tab-albo-content') return mockAlboContent;
          if (id === 'main-tab-seasons-content') return mockSeasonsContent;
          if (id === 'main-tab-records-content') return mockRecordsContent;
          if (id === 'main-tab-btn-albo') return mockBtnAlbo;
          if (id === 'main-tab-btn-seasons') return mockBtnSeasons;
          if (id === 'main-tab-btn-records') return mockBtnRecords;
          return null;
        }
      };
    });

    afterEach(() => {
      (globalThis as unknown as { document?: unknown }).document = originalDocument;
    });

    it('returns available seasons sorted descending from state.competitions', async () => {
      const { getAvailableSeasons } = await import('@/components/board/seasonsArchive');
      state.competitions = [
        { id: 1, season: '2021/22', name: 'SerieAtlas', category: 'championship', ranking: [] },
        { id: 2, season: '2024/25', name: 'SerieAtlas', category: 'championship', ranking: [] },
        { id: 3, season: '2016/17', name: 'SerieAtlas', category: 'championship', ranking: [] }
      ];

      const seasons = getAvailableSeasons();
      expect(seasons).toEqual(['2024/25', '2021/22', '2016/17']);
    });

    it('switches between Albo d\'Oro, Seasons Archive, and Records tabs', async () => {
      const { switchMainViewTab } = await import('@/components/board/seasonsArchive');
      state.competitions = dataJson.competitions as unknown as CompetitionRecord[];
      state.managers = dataJson.leagueData as unknown as Manager[];

      // Switch to seasons
      switchMainViewTab('seasons');
      expect(mockAlboContent.classList.contains('hidden')).toBe(true);
      expect(mockSeasonsContent.classList.contains('hidden')).toBe(false);
      expect(mockRecordsContent.classList.contains('hidden')).toBe(true);
      expect(mockBtnSeasons.className).toContain('bg-amber-500');
      expect(mockSeasonsContent.innerHTML).toContain('Stagione');

      // Switch to records
      switchMainViewTab('records');
      expect(mockAlboContent.classList.contains('hidden')).toBe(true);
      expect(mockSeasonsContent.classList.contains('hidden')).toBe(true);
      expect(mockRecordsContent.classList.contains('hidden')).toBe(false);
      expect(mockBtnRecords.className).toContain('bg-amber-500');
      expect(mockRecordsContent.innerHTML).toContain('Record &amp; Primati Storici');
      expect(mockRecordsContent.innerHTML).toContain('Tutti i Record');

      // Switch back to albo
      switchMainViewTab('albo');
      expect(mockAlboContent.classList.contains('hidden')).toBe(false);
      expect(mockSeasonsContent.classList.contains('hidden')).toBe(true);
      expect(mockRecordsContent.classList.contains('hidden')).toBe(true);
      expect(mockBtnAlbo.className).toContain('bg-amber-500');
    });

    it('renders championship leaderboard with podium, spoon, team logos, and distinct trophies', async () => {
      const { selectArchiveSeason } = await import('@/components/board/seasonsArchive');
      state.competitions = dataJson.competitions as unknown as CompetitionRecord[];
      state.managers = dataJson.leagueData as unknown as Manager[];

      selectArchiveSeason('2024/25');
      expect(mockSeasonsContent.innerHTML).toContain('2024/25');
      expect(mockSeasonsContent.innerHTML).toContain('🥇 1°');
      expect(mockSeasonsContent.innerHTML).toContain('Scudetto');
      expect(mockSeasonsContent.innerHTML).toContain('🥈 2°');
      expect(mockSeasonsContent.innerHTML).toContain('🥉 3°');
      expect(mockSeasonsContent.innerHTML).toContain('🥄 12°');
      expect(mockSeasonsContent.innerHTML).toContain('Coppe &amp; Tornei di Stagione');

      // Team logos in table
      expect(mockSeasonsContent.innerHTML).toContain('assets/teams/');

      // Official InsalAtlas SVG trophy renders and category badges
      expect(mockSeasonsContent.innerHTML).toContain('trophy-svg-compact');
      expect(mockSeasonsContent.innerHTML).toContain('Supercoppa');
      expect(mockSeasonsContent.innerHTML).toContain('Mundialito');
      expect(mockSeasonsContent.innerHTML).toContain('Coppa di Lega');
    });

    it('renders BANNER badge for playout/perdenti tournaments when present', async () => {
      const { selectArchiveSeason } = await import('@/components/board/seasonsArchive');
      const playoutComp = (dataJson.competitions as CompetitionRecord[]).find(c => c.category === 'Playout');
      if (playoutComp) {
        state.competitions = dataJson.competitions as unknown as CompetitionRecord[];
        state.managers = dataJson.leagueData as unknown as Manager[];
        selectArchiveSeason(playoutComp.season);
        expect(mockSeasonsContent.innerHTML).toContain('BANNER');
      }
    });

    it('sorts wooden spoon to the very bottom after N/D participants in seasonsArchive', async () => {
      const { selectArchiveSeason } = await import('@/components/board/seasonsArchive');
      const mockComp: CompetitionRecord = {
        id: 8881,
        name: 'Serie Test',
        season: '2020/21',
        category: 'Campionato',
        ranking: [
          { rank: 1, teamName: 'Champion Team', coach: 'Coach 1', managerId: 'm_champ', points: null },
          { rank: null, teamName: 'ND Team', coach: 'Coach 2', managerId: undefined, points: null },
          { rank: 12, teamName: 'Spoon Team', coach: 'Coach 3', managerId: 'm_banter', points: null }
        ]
      };
      state.competitions = [mockComp];
      state.managers = mockLeagueManagers;

      selectArchiveSeason('2020/21');
      expect(mockSeasonsContent.innerHTML).toContain('🥄 12°');
      expect(mockSeasonsContent.innerHTML).toContain('Spoon Team');

      const ndIndex = mockSeasonsContent.innerHTML.indexOf('N/D');
      const spoonIndex = mockSeasonsContent.innerHTML.indexOf('🥄 12°');
      expect(ndIndex).toBeGreaterThan(-1);
      expect(spoonIndex).toBeGreaterThan(ndIndex);
    });

    it('renders fully ranked completed season with all participants and spoon indicator', async () => {
      const { selectArchiveSeason } = await import('@/components/board/seasonsArchive');
      state.competitions = dataJson.competitions as unknown as CompetitionRecord[];
      state.managers = dataJson.leagueData as unknown as Manager[];

      const completedComp = state.competitions.find(c => !c.in_progress && c.status !== 'in_progress' && c.ranking?.some(r => r.rank && r.rank >= 8));
      if (completedComp) {
        selectArchiveSeason(completedComp.season);
        expect(mockSeasonsContent.innerHTML).toContain('🥄');
        const firstTeam = completedComp.ranking[0].teamName;
        expect(mockSeasonsContent.innerHTML).toContain(firstTeam);
      }
    });

    it('renders season with in-progress championship and placeholder cups', async () => {
      const { selectArchiveSeason } = await import('@/components/board/seasonsArchive');
      state.competitions = dataJson.competitions as unknown as CompetitionRecord[];
      state.managers = dataJson.leagueData as unknown as Manager[];

      const inProgressComp = state.competitions.find(c => c.in_progress || c.status === 'in_progress');
      if (inProgressComp) {
        selectArchiveSeason(inProgressComp.season);
        expect(mockSeasonsContent.innerHTML).toContain('Coppe &amp; Tornei di Stagione');
        expect(mockSeasonsContent.innerHTML).toContain(LEAGUE.competitions.cup.title);
        expect(mockSeasonsContent.innerHTML).toContain(LEAGUE.competitions.supercup.title);
        expect(mockSeasonsContent.innerHTML).toContain('Verdetti finali in definizione');
      }
    });

    it('renders the centered season stepper toolbar with dropdown popover', async () => {
      const { renderSeasonStepper } = await import('@/components/board/seasons');
      const seasons = ['2026/27', '2025/26', '2024/25', '2016/17'];
      const html = renderSeasonStepper(seasons, '2025/26');

      expect(html).toContain('id="btn-season-stepper-dropdown"');
      expect(html).toContain('Stagione 2025/26');
      expect(html).toContain('id="season-stepper-dropdown-menu"');
      expect(html).toContain('Stagione successiva (2026/27)');
      expect(html).toContain('Stagione precedente (2024/25)');
      expect(html).toContain('Archivio Stagioni (4)');
    });

    it('disables left button on newest season and right button on oldest season', async () => {
      const { renderSeasonStepper } = await import('@/components/board/seasons');
      const seasons = ['2026/27', '2025/26', '2016/17'];

      // At newest season (index 0): Left button is disabled, Right button moves to 2025/26
      const newestHtml = renderSeasonStepper(seasons, '2026/27');
      expect(newestHtml).toContain('title="Nessuna stagione successiva"');
      expect(newestHtml).toContain('Stagione precedente (2025/26)');

      // At oldest season (last index): Left button moves to 2025/26, Right button is disabled
      const oldestHtml = renderSeasonStepper(seasons, '2016/17');
      expect(oldestHtml).toContain('Stagione successiva (2025/26)');
      expect(oldestHtml).toContain('title="Nessuna stagione precedente"');
    });

    it('toggles and closes the season stepper dropdown popover menu', async () => {
      const { toggleSeasonStepperDropdown, closeSeasonStepperDropdown } = await import('@/components/board/seasons');
      const mockDropdown = {
        classList: {
          classes: new Set<string>(['hidden']),
          add(c: string) { this.classes.add(c); },
          remove(c: string) { this.classes.delete(c); },
          toggle(c: string) {
            if (this.classes.has(c)) { this.classes.delete(c); return false; }
            this.classes.add(c); return true;
          },
          contains(c: string) { return this.classes.has(c); }
        }
      };
      const mockChevron = {
        classList: {
          classes: new Set<string>(),
          add(c: string) { this.classes.add(c); },
          remove(c: string) { this.classes.delete(c); },
          contains(c: string) { return this.classes.has(c); }
        }
      };

      const prevDoc = (globalThis as unknown as { document: { getElementById: (id: string) => unknown } }).document;
      (globalThis as unknown as { document: unknown }).document = {
        getElementById(id: string) {
          if (id === 'season-stepper-dropdown-menu') return mockDropdown;
          if (id === 'season-stepper-chevron') return mockChevron;
          return prevDoc.getElementById(id);
        }
      };

      toggleSeasonStepperDropdown();
      expect(mockDropdown.classList.contains('hidden')).toBe(false);
      expect(mockChevron.classList.contains('rotate-180')).toBe(true);

      closeSeasonStepperDropdown();
      expect(mockDropdown.classList.contains('hidden')).toBe(true);
      expect(mockChevron.classList.contains('rotate-180')).toBe(false);

      (globalThis as unknown as { document: unknown }).document = prevDoc;
    });

    it('renders season header summary with dynamic league name', async () => {
      const { renderSeasonHeaderSummary } = await import('@/components/board/seasons');
      const { LEAGUE } = await import('@/config');
      const html = renderSeasonHeaderSummary('2024/25', 3, 12, false);
      expect(html).toContain(`Archivio ufficiale dei piazzamenti, podi e verdetti storici ${LEAGUE.brand.name}`);
    });
  });

  describe('Historical Team Details and Seasons Formatting', () => {
    it('formats contiguous and non-contiguous season ranges correctly', async () => {
      const { formatSeasonsList } = await import('@/components/modals/profile');

      expect(formatSeasonsList(['2021/22', '2022/23', '2023/24', '2024/25', '2025/26'])).toBe('21/22–25/26');
      expect(formatSeasonsList(['2018/19', '2019/20'])).toBe('18/19–19/20');
      expect(formatSeasonsList(['2016/17', '2017/18', '2021/22', '2024/25', '2025/26'])).toBe('16/17–17/18, 21/22, 24/25–25/26');
      expect(formatSeasonsList(['2025/26'])).toBe('25/26');
      expect(formatSeasonsList([])).toBe('');
    });

    it('extracts distinct teams with logos and formatted season intervals', async () => {
      const { getHistoricalTeamDetails } = await import('@/components/modals/profile');
      state.competitions = dataJson.competitions as unknown as CompetitionRecord[];
      state.managers = dataJson.leagueData as unknown as Manager[];

      const mgrWithHistory = (dataJson.leagueData as Manager[]).find(m => m.history && m.history.some(h => h.team));
      expect(mgrWithHistory).toBeDefined();

      const teams = getHistoricalTeamDetails(mgrWithHistory!);
      expect(teams.length).toBeGreaterThanOrEqual(1);

      const firstTeam = teams[0];
      expect(firstTeam.name).toBeTruthy();
      expect(firstTeam.formattedSeasons).toBeTruthy();
      if (firstTeam.logo) {
        expect(firstTeam.logo).toContain('assets/teams/');
      }
    });
  });

  describe('Header Statistics Counters', () => {
    it('calculates total seasons, in-progress count, and trophy counts correctly', async () => {
      const { updateStatistics } = await import('@/components/board/statsCounter');
      state.competitions = dataJson.competitions as unknown as CompetitionRecord[];
      state.managers = dataJson.leagueData as unknown as Manager[];

      const elements: Record<string, { textContent: string }> = {
        'stat-total-seasons': { textContent: '' },
        'stat-seasons-detail': { textContent: '' },
        'stat-total-scudetti': { textContent: '' },
        'stat-total-cups': { textContent: '' },
        'stat-total-mundialito': { textContent: '' },
        'stat-total-spoons': { textContent: '' },
        'stat-total-cartonati': { textContent: '' }
      };

      const originalDoc = (globalThis as unknown as { document?: unknown }).document;
      (globalThis as unknown as { document?: unknown }).document = {
        getElementById(id: string) {
          return elements[id] || null;
        }
      };

      try {
        updateStatistics();

        // Dynamically compute expected values from the dataset so test is agnostic to data updates
        const allSeasons = Array.from(new Set((dataJson.competitions as { season: string }[]).map(c => c.season)));
        const expectedTotalSeasons = allSeasons.length;
        const expectedInProgressSeasons = allSeasons.filter(s =>
          (dataJson.competitions as { season: string; in_progress?: boolean; status?: string }[]).some(
            c => c.season === s && (c.in_progress || c.status === 'in_progress')
          )
        ).length;
        const expectedCompletedSeasons = expectedTotalSeasons - expectedInProgressSeasons;
        const expectedDetail = expectedInProgressSeasons > 0
          ? `(${expectedCompletedSeasons} + ${expectedInProgressSeasons} in corso)`
          : '';

        const managers = dataJson.leagueData as Manager[];
        const expectedScudetti = managers.reduce((acc, m) => acc + (m.gold || 0), 0);
        const expectedCups = managers.reduce((acc, m) => acc + (m.cup_gold || 0) + (m.supercup || 0), 0);
        const expectedMundialito = managers.reduce((acc, m) => acc + (m.mundialito || 0), 0);
        const expectedSpoons = managers.reduce((acc, m) => acc + (m.spoon || 0), 0);
        const expectedCartonati = managers.reduce((acc, m) => acc + (m.cartonato || 0), 0);

        expect(elements['stat-total-seasons'].textContent).toBe(String(expectedTotalSeasons));
        expect(elements['stat-seasons-detail'].textContent).toBe(expectedDetail);
        expect(elements['stat-total-scudetti'].textContent).toBe(String(expectedScudetti));
        expect(elements['stat-total-cups'].textContent).toBe(String(expectedCups));
        expect(elements['stat-total-mundialito'].textContent).toBe(String(expectedMundialito));
        expect(elements['stat-total-spoons'].textContent).toBe(String(expectedSpoons));
        expect(elements['stat-total-cartonati'].textContent).toBe(String(expectedCartonati));
      } finally {
        (globalThis as unknown as { document?: unknown }).document = originalDoc;
      }
    });
  });

  describe('Main View Tab & Season URL Routing and History Persistence', () => {
    it('parses tab and season parameters from URL search and hash', async () => {
      const { getMainTabParamFromURL, getSeasonParamFromURL } = await import('@/router');

      // Test ?tab=
      expect(getMainTabParamFromURL('https://insalatlas.it/?tab=seasons')).toBe('seasons');
      expect(getMainTabParamFromURL('https://insalatlas.it/?tab=records')).toBe('records');
      expect(getMainTabParamFromURL('https://insalatlas.it/?tab=albo')).toBe('albo');

      // Test inference from ?record= and ?season=
      expect(getMainTabParamFromURL('https://insalatlas.it/?record=most_cups')).toBe('records');
      expect(getMainTabParamFromURL('https://insalatlas.it/?season=2024-25')).toBe('seasons');

      // Test hash routing
      expect(getMainTabParamFromURL('https://insalatlas.it/#/seasons')).toBe('seasons');
      expect(getMainTabParamFromURL('https://insalatlas.it/#records')).toBe('records');
      expect(getMainTabParamFromURL('https://insalatlas.it/#albo')).toBe('albo');
      expect(getMainTabParamFromURL('https://insalatlas.it/#/view?tab=records')).toBe('records');

      // Test seasons extraction
      expect(getSeasonParamFromURL('https://insalatlas.it/?season=2024-25')).toBe('2024/25');
      expect(getSeasonParamFromURL('https://insalatlas.it/?season=2023%2F24')).toBe('2023/24');
      expect(getSeasonParamFromURL('https://insalatlas.it/#/tab?season=2021-22')).toBe('2021/22');
      expect(getSeasonParamFromURL('https://insalatlas.it/?tab=seasons')).toBeNull();
    });

    it('synchronizes URL search params when switching tabs and selecting seasons', async () => {
      const { switchMainViewTab, selectArchiveSeason } = await import('@/components/board/seasons');

      // Ensure window.location exists in test environment
      if (typeof window !== 'undefined' && window.location) {
        window.history.pushState({}, '', 'https://insalatlas.it/');

        switchMainViewTab('records', true);
        expect(window.location.search).toContain('tab=records');

        selectArchiveSeason('2024/25', true);
        expect(window.location.search).toContain('tab=seasons');
        expect(window.location.search).toContain('season=2024-25');

        switchMainViewTab('albo', true);
        expect(window.location.search).toBe('');
      }
    });
  });
});

