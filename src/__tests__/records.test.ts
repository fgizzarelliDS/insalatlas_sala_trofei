import { describe, it, expect, beforeAll } from 'vitest';
import { getSeasonMatchdays, computeAllLeagueRecords, filterRecordsByCategory } from '@/analytics/records';
import type { Manager, CompetitionRecord } from '@/types';
import dataJson from '../../public/data.json';

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

  describe('computeAllLeagueRecords (Real Historical Data)', () => {
    it('computes all primary records across all categories', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      expect(records.length).toBeGreaterThanOrEqual(10);

      const categories = new Set(records.map(r => r.category));
      expect(categories.has('points')).toBe(true);
      expect(categories.has('titles')).toBe(true);
      expect(categories.has('h2h')).toBe(true);
      expect(categories.has('streaks')).toBe(true);
      expect(categories.has('banter')).toBe(true);
    });

    it('identifies Makako as single-season points record holder (67.0 pt, 1.91 pt/g)', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      const pointsRec = records.find(r => r.id === 'max_single_season_points');
      expect(pointsRec).toBeDefined();
      expect(pointsRec!.primaryHolder.managerName).toBe('Makako');
      expect(pointsRec!.primaryHolder.value).toBe(67.0);
      expect(pointsRec!.primaryHolder.formattedValue).toBe('67.0 pt');
      expect(pointsRec!.primaryHolder.normalizedDetail).toContain('1.91 pt/g');
      expect(pointsRec!.primaryHolder.normalizedDetail).toContain('35 giornate');

      // Runner-ups should contain Alfo (62 pt) or Peter&Dani (62 pt)
      expect(pointsRec!.runnerUps.length).toBeGreaterThanOrEqual(2);
      const runnerUpNames = pointsRec!.runnerUps.map(r => r.managerName);
      expect(runnerUpNames).toContain('Alfo');
    });

    it('identifies Sebba as lowest points champion (56.0 pt in 2023/24)', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      const lowScudetto = records.find(r => r.id === 'lowest_points_champion');
      expect(lowScudetto).toBeDefined();
      expect(lowScudetto!.primaryHolder.managerName).toBe('Sebba');
      expect(lowScudetto!.primaryHolder.value).toBe(56.0);
      expect(lowScudetto!.primaryHolder.normalizedDetail).toContain('33 giornate');
    });

    it('identifies Scurcio as highest points wooden spoon (39.0 pt in 2018/19)', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      const spoonRec = records.find(r => r.id === 'highest_points_wooden_spoon');
      expect(spoonRec).toBeDefined();
      expect(spoonRec!.primaryHolder.managerName).toBe('Scurcio');
      expect(spoonRec!.primaryHolder.value).toBe(39.0);
      expect(spoonRec!.primaryHolder.season).toBe('2018/19');
    });

    it('identifies biggest championship margin (+10.0 pt by Makako in 2017/18)', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      const marginRec = records.find(r => r.id === 'biggest_championship_margin');
      expect(marginRec).toBeDefined();
      expect(marginRec!.primaryHolder.managerName).toBe('Makako');
      expect(marginRec!.primaryHolder.value).toBe(10.0);
      expect(marginRec!.primaryHolder.formattedValue).toBe('+10.0 pt');
    });

    it('identifies tightest championship finish (0.0 pt in 2016/17)', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      const tightRec = records.find(r => r.id === 'tightest_championship_finish');
      expect(tightRec).toBeDefined();
      expect(tightRec!.primaryHolder.value).toBe(0.0);
      expect(tightRec!.primaryHolder.season).toBe('2016/17');
    });

    it('identifies tightest podium race (1.0 pt between 1st and 3rd in 2024/25)', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      const podRec = records.find(r => r.id === 'tightest_podium_race');
      expect(podRec).toBeDefined();
      expect(podRec!.primaryHolder.value).toBe(1.0);
      expect(podRec!.primaryHolder.season).toBe('2024/25');
    });

    it('identifies triplete / multi-title single season record (3 titles)', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      const tripleteRec = records.find(r => r.id === 'multi_title_season');
      expect(tripleteRec).toBeDefined();
      expect(tripleteRec!.primaryHolder.value).toBe(3);
      expect(['Lucchetto', 'Alfo']).toContain(tripleteRec!.primaryHolder.managerName);
    });

    it('identifies Vannico as holder of longest podium streak (4 consecutive seasons)', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      const streakRec = records.find(r => r.id === 'consecutive_podium_streak');
      expect(streakRec).toBeDefined();
      expect(streakRec!.primaryHolder.managerName).toBe('Vannico');
      expect(streakRec!.primaryHolder.value).toBe(4);
    });

    it('identifies Lucchetto as Mister Camaleonte (10 team names without ellipsis truncation)', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      const camaleonteRec = records.find(r => r.id === 'chameleon_manager_names');
      expect(camaleonteRec).toBeDefined();
      expect(camaleonteRec!.primaryHolder.managerName).toBe('Lucchetto');
      expect(camaleonteRec!.primaryHolder.value).toBe(10);
      expect(camaleonteRec!.primaryHolder.detail).not.toContain('...');
      expect(camaleonteRec!.primaryHolder.detail!.split(',').length).toBe(10);
    });

    it('identifies biggest H2H blowout (+41.0 pt)', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      const blowoutRec = records.find(r => r.id === 'biggest_h2h_blowout');
      expect(blowoutRec).toBeDefined();
      expect(blowoutRec!.primaryHolder.value).toBe(41.0);
      expect(blowoutRec!.primaryHolder.formattedValue).toBe('+41.0 pt');
    });

    it('identifies 4 tied leaders for historical loyalty (Alfo, Valery, Scurcio, Avvisatina at 11 seasons)', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      const loyaltyRec = records.find(r => r.id === 'most_seasons_loyalty');
      expect(loyaltyRec).toBeDefined();
      expect(loyaltyRec!.primaryHolders.length).toBe(4);
      expect(loyaltyRec!.primaryHolders.every(h => h.value === 11)).toBe(true);

      const names = loyaltyRec!.primaryHolders.map(h => h.managerName);
      expect(names).toContain('Alfo');
      expect(names).toContain('Valery');
      expect(names).toContain('Scurcio');
      expect(names).toContain('Avvisatina');

      // Runner-ups should be the next tier (Vannico, Lucchetto, Sebba at 10 seasons)
      expect(loyaltyRec!.runnerUps.length).toBeGreaterThanOrEqual(1);
      expect(loyaltyRec!.runnerUps[0].value).toBe(10);
      const runnerUpNames = loyaltyRec!.runnerUps.map(h => h.managerName);
      expect(runnerUpNames).toContain('Vannico');
    });

    it('resolves pertinent crests and team names for both single-season and career records', async () => {
      const { resolveManagerRecordCrest } = await import('@/analytics/records');
      
      // Single season record: Makako in 2017/18
      const makako1718 = resolveManagerRecordCrest('m_makako', '2017/18', undefined, managers, competitions);
      expect(makako1718.teamName).toBe('Makako Antwerpen');
      expect(makako1718.logo).toBeDefined();

      // Single season record: Alfo in 2025/26
      const alfo2526 = resolveManagerRecordCrest('m_alfo', '2025/26', undefined, managers, competitions);
      expect(alfo2526.teamName).toContain('Steven');
      expect(alfo2526.logo).toContain('assets/teams/');

      // Career record: Alfo gets latest franchise Steven Bradbury FC
      const alfoCareer = resolveManagerRecordCrest('m_alfo', undefined, undefined, managers, competitions);
      expect(alfoCareer.teamName).toContain('Steven');
      expect(alfoCareer.logo).toContain('assets/teams/');
    });

    it('identifies Alfo as Signore delle Coppe with cumulative knockout titles (8 cups)', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      const cupsRec = records.find(r => r.id === 'most_cups');
      expect(cupsRec).toBeDefined();
      expect(cupsRec!.primaryHolder.managerName).toBe('Alfo');
      expect(cupsRec!.primaryHolder.value).toBe(8);
      expect(cupsRec!.primaryHolder.formattedValue).toBe('8 Coppe');
      expect(cupsRec!.primaryHolder.detail).toContain('3 Coppe');
      expect(cupsRec!.primaryHolder.detail).toContain('3 Supercoppe');
      expect(cupsRec!.primaryHolder.detail).toContain('2 Mundialiti');
      expect(cupsRec!.watermark).toBe('🏆');
    });

    it('identifies Pippo as worst career PPG (1.10 pt/g with >= 3 seasons)', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      const worstPpgRec = records.find(r => r.id === 'career_worst_ppg');
      expect(worstPpgRec).toBeDefined();
      expect(worstPpgRec!.primaryHolder.managerName).toBe('Pippo');
      expect(Number(worstPpgRec!.primaryHolder.value)).toBeCloseTo(1.104, 2);
      expect(worstPpgRec!.primaryHolder.formattedValue).toBe('1.10 pt/g');
      expect(worstPpgRec!.watermark).toBe('📉');
    });

    it('identifies Gigi&Dr.Cholo and Vannico as tied Eterno Secondo nelle Coppe (3 silvers)', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      const cupSilverRec = records.find(r => r.id === 'eternal_second_cups');
      expect(cupSilverRec).toBeDefined();
      expect(cupSilverRec!.primaryHolders.length).toBe(2);
      expect(cupSilverRec!.primaryHolders.every(h => h.value === 3)).toBe(true);

      const names = cupSilverRec!.primaryHolders.map(h => h.managerName);
      expect(names).toContain('Gigi&Dr.Cholo');
      expect(names).toContain('Vannico');
      expect(cupSilverRec!.watermark).toBe('💔');
    });

    it('identifies Gigi&Dr.Cholo as Re del Cartonato (2 cartonati)', () => {
      const records = computeAllLeagueRecords(managers, competitions);
      const cartonatoRec = records.find(r => r.id === 'cartonato_collector');
      expect(cartonatoRec).toBeDefined();
      expect(cartonatoRec!.primaryHolder.managerName).toBe('Gigi&Dr.Cholo');
      expect(cartonatoRec!.primaryHolder.value).toBe(2);
      expect(cartonatoRec!.primaryHolder.formattedValue).toBe('2 Cartonati');
      expect(cartonatoRec!.watermark).toBe('📦');
    });
  });

  describe('renderRecordCard UI with Watermarks and Gazzetta Styles', () => {
    it('renders thematic watermark and eliminates hardcoded dark gray', async () => {
      const { renderRecordCard } = await import('@/components/board/records');
      const records = computeAllLeagueRecords(managers, competitions);
      const cartonatoRec = records.find(r => r.id === 'cartonato_collector');
      expect(cartonatoRec).toBeDefined();

      const html = renderRecordCard(cartonatoRec!);
      expect(html).toContain('📦');
      expect(html).toContain('group rounded-2xl');
      // Verify dirty gray rgba(0,0,0,0.12) is replaced with theme variables
      expect(html).not.toContain('rgba(0,0,0,0.12)');
      expect(html).toContain('background-color: var(--input-bg)');
      expect(html).toContain('border-color: var(--input-border)');
    });

    it('renders ex-aequo badge and grid when there are multiple co-holders', async () => {
      const { renderRecordCard } = await import('@/components/board/records');
      const records = computeAllLeagueRecords(managers, competitions);
      const loyaltyRec = records.find(r => r.id === 'most_seasons_loyalty');
      expect(loyaltyRec).toBeDefined();

      const html = renderRecordCard(loyaltyRec!);
      expect(html).toContain('Co-Primatisti (Pari Merito)');
      expect(html).toContain('4 Co-Primatisti');
      expect(html).toContain('Alfo');
      expect(html).toContain('Valery');
      expect(html).toContain('Scurcio');
      expect(html).toContain('Avvisatina');
    });

    it('renders mini-crests for runner-up contenders and high-contrast season pill', async () => {
      const { renderRecordCard } = await import('@/components/board/records');
      const records = computeAllLeagueRecords(managers, competitions);
      const pointsRec = records.find(r => r.id === 'max_single_season_points');
      expect(pointsRec).toBeDefined();

      const html = renderRecordCard(pointsRec!);
      expect(html).toContain('2017/18');
      expect(html).toContain('Contendenti &amp; Piazzati:');
      expect(html).toContain('🥈 2°');
      expect(html).toContain('🥉 3°');
      expect(html).toContain('<img'); // mini-crest
    });

    it('renders seasons for all co-holders when there is a tie (e.g. Scudetto con Meno Punti)', async () => {
      const { renderRecordCard } = await import('@/components/board/records');
      const records = computeAllLeagueRecords(managers, competitions);
      const lowScudetto = records.find(r => r.id === 'lowest_points_champion');
      expect(lowScudetto).toBeDefined();

      const html = renderRecordCard(lowScudetto!);
      expect(html).toContain('2023/24'); // Sebba's season
      expect(html).toContain('2022/23'); // Vannico's season
      expect(html).toContain('2023/24, 2022/23'); // Combined season badge in metric line
    });

    it('renders unique id, share button and export popover menu on each record card', async () => {
      const { renderRecordCard } = await import('@/components/board/records');
      const records = computeAllLeagueRecords(managers, competitions);
      const firstRec = records[0];

      const html = renderRecordCard(firstRec);
      expect(html).toContain(`id="record-card-${firstRec.id}"`);
      expect(html).toContain(`id="btn-record-share-${firstRec.id}"`);
      expect(html).toContain('Copia per WhatsApp');
      expect(html).toContain('Invia Link WhatsApp');
      expect(html).toContain(`shareRecordWhatsApp('${firstRec.id}')`);
      expect(html).toContain('Scarica PNG HD');
      expect(html).toContain('record-card-actions');
      expect(html).toContain('record-card-footer');
      expect(html).toContain('record-metric-row');
      expect(html).toContain('manager-record-name');
      expect(html).toContain('record-holder-logo');
      expect(html).toContain('record-watermark');
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
      const results = filterRecordsBySearch(all, 'alfo');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.primaryHolder.managerName.toLowerCase().includes('alfo'))).toBe(true);
    });

    it('filters records by record title keyword', async () => {
      const { filterRecordsBySearch } = await import('@/components/board/records');
      const all = computeAllLeagueRecords(managers, competitions);
      const results = filterRecordsBySearch(all, 'media');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.title.toLowerCase().includes('media'))).toBe(true);
    });

    it('filters records by team name', async () => {
      const { filterRecordsBySearch } = await import('@/components/board/records');
      const all = computeAllLeagueRecords(managers, competitions);
      const results = filterRecordsBySearch(all, 'bradbury');
      expect(results.length).toBeGreaterThan(0);
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

  describe('Dual-Target Record Holder & Season Standings Navigation', () => {
    it('generates interactive season links for records with a season and separate manager profile clicks', async () => {
      const { state } = await import('@/state');
      state.managers = managers;
      state.competitions = competitions;

      const { renderRecordsContentHTML } = await import('@/components/board/records');
      const html = renderRecordsContentHTML('all', '');

      // Records with season (like Volata Podio or Punti Singola Stagione) must contain navigateToSeasonStandings
      expect(html).toContain('navigateToSeasonStandings');
      // Manager name click must stop propagation and open profile modal
      expect(html).toContain('openProfileModal');
      expect(html).toContain('event.stopPropagation()');
    });

    it('navigates to season archive and updates selected season when navigateToSeasonStandings is called', async () => {
      const { navigateToSeasonStandings, getCurrentSelectedSeason } = await import('@/components/board/seasons');

      const originalDoc = (globalThis as any).document;
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
            if (sel.includes('m_makako')) return mockTargetRow;
            return null;
          }
        };

        const mockEvent = {
          stopPropagation: () => {},
          preventDefault: () => {}
        };

        navigateToSeasonStandings('2017/18', 'm_makako', mockEvent as any);

        expect(getCurrentSelectedSeason()).toBe('2017/18');
      } finally {
        (globalThis as any).document = originalDoc;
      }
    });

    it('adds data-manager-id to championship table rows for precise highlighting', async () => {
      const { renderChampionshipTable } = await import('@/components/board/seasons');
      const championshipComp = competitions.find(c => c.category === 'Campionato' || /campionato|serie\s*atlas/i.test(c.name))!;
      const html = renderChampionshipTable(championshipComp);

      expect(html).toContain('data-manager-id=');
      expect(html).toContain('id="standings-row-');
    });
  });
});

