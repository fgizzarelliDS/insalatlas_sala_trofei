import { describe, it, expect } from 'vitest';
import { computeTradingCardBadges, getManagerInitials, buildTradingCardHTML, buildWhatsAppShareText } from '@/export';
import { Manager, LeagueRecord } from '@/types';
import { createTestManager } from './test-utils';

describe('export.ts - Trading Card Logic and Formatting', () => {
  describe('getManagerInitials', () => {
    it('extracts two characters for single word names', () => {
      expect(getManagerInitials('Vannico')).toBe('VA');
      expect(getManagerInitials('Alfo')).toBe('AL');
    });

    it('extracts first letters for multi-word or partnered names', () => {
      expect(getManagerInitials('Gigi & Dr.Cholo')).toBe('GD');
      expect(getManagerInitials('Peter & Dani')).toBe('PD');
      expect(getManagerInitials('Marco Rossi')).toBe('MR');
    });
  });

  describe('computeTradingCardBadges', () => {
    it('always includes Archetype, Risk Profile, Stability, and Freddezza badges', () => {
      const m = createTestManager({ id: '1', name: 'Standard', years: 2 });
      const badges = computeTradingCardBadges(m);

      expect(badges.length).toBeGreaterThanOrEqual(4);
      expect(badges.some(b => b.label.startsWith('Profilo:'))).toBe(true);
      expect(badges.some(b => b.label.startsWith('Rischio:'))).toBe(true);
      expect(badges.some(b => b.label.startsWith('Stabilità:'))).toBe(true);
      expect(badges.some(b => b.label === 'Stabilità: Esordiente')).toBe(true);
      expect(badges.some(b => b.label.startsWith('Freddezza:'))).toBe(true);
    });

    it('assigns rookie neutrality for 0 completed years and accurate clutch tier for veterans', () => {
      const rookie = createTestManager({ id: 'rookie', name: 'Rookie', years: 0 });
      const rookieBadges = computeTradingCardBadges(rookie);
      expect(rookieBadges.some(b => b.label === 'Freddezza: Debuttante')).toBe(true);

      const cinico = createTestManager({
        id: 'cinico',
        name: 'Cinico Mgr',
        years: 9,
        gold: 3,
        silver: 1,
        bronze: 0,
        cup_gold: 2,
        cup_silver: 1
      });
      const cinicoBadges = computeTradingCardBadges(cinico);
      expect(cinicoBadges.some(b => b.label === 'Freddezza: Cinico')).toBe(true);
      expect(cinicoBadges.some(b => b.icon === '🏹')).toBe(true);
    });

    it('assigns correct stability badges based on rank oscillation for 3+ years', () => {
      const metronome = createTestManager({
        id: 'metro',
        name: 'Metronome',
        years: 4,
        history: [
          { season: '2021/22', team: 'A', rank: 4, points: 50, achievements: [] },
          { season: '2022/23', team: 'A', rank: 5, points: 48, achievements: [] },
          { season: '2023/24', team: 'A', rank: 4, points: 52, achievements: [] },
          { season: '2024/25', team: 'A', rank: 5, points: 49, achievements: [] }
        ]
      });
      const metroBadges = computeTradingCardBadges(metronome);
      expect(metroBadges.some(b => b.label === 'Stabilità: Metronomo di Lega')).toBe(true);

      const roller = createTestManager({
        id: 'roll',
        name: 'Roller',
        years: 3,
        history: [
          { season: '2022/23', team: 'B', rank: 1, points: 65, achievements: [] },
          { season: '2023/24', team: 'B', rank: 12, points: 20, achievements: [] },
          { season: '2024/25', team: 'B', rank: 1, points: 64, achievements: [] }
        ]
      });
      const rollerBadges = computeTradingCardBadges(roller);
      expect(rollerBadges.some(b => b.label === 'Stabilità: Montagna Russa')).toBe(true);

      const balanced = createTestManager({
        id: 'bal',
        name: 'Balanced',
        years: 4,
        history: [
          { season: '2021/22', team: 'B', rank: 2, points: 60, achievements: [] },
          { season: '2022/23', team: 'B', rank: 6, points: 45, achievements: [] },
          { season: '2023/24', team: 'B', rank: 3, points: 55, achievements: [] },
          { season: '2024/25', team: 'B', rank: 7, points: 40, achievements: [] }
        ]
      });
      const balBadges = computeTradingCardBadges(balanced);
      expect(balBadges.some(b => b.label === 'Stabilità: Equilibrato')).toBe(true);
    });

    it('assigns Campione Seriale for 2+ gold and Re delle Coppe for 3+ cup/supercup', () => {
      const m = createTestManager({
        id: 'multi',
        name: 'MultiChampion',
        years: 5,
        gold: 2,
        cup_gold: 2,
        supercup: 1
      });
      const badges = computeTradingCardBadges(m);

      expect(badges.some(b => b.label === 'Campione Seriale')).toBe(true);
      expect(badges.some(b => b.label === 'Re delle Coppe')).toBe(true);
    });

    it('assigns Veterano della Lega for managers with 6+ years', () => {
      const m = createTestManager({ id: 'vet', name: 'Veteran', years: 7 });
      const badges = computeTradingCardBadges(m);

      expect(badges.some(b => b.label === 'Veterano della Lega')).toBe(true);
    });

    it('assigns Re dei Titoli for managers with 4+ major trophies', () => {
      const m = createTestManager({
        id: 'king',
        name: 'King',
        years: 5,
        gold: 2,
        cup_gold: 1,
        supercup: 1
      });
      const badges = computeTradingCardBadges(m);

      expect(badges.some(b => b.label === 'Re dei Titoli')).toBe(true);
    });

    it('assigns Double Winner when manager has won both Gold and Cup Gold', () => {
      const m = createTestManager({
        id: 'double',
        name: 'Winner',
        years: 4,
        gold: 1,
        cup_gold: 1
      });
      const badges = computeTradingCardBadges(m);

      expect(badges.some(b => b.label === 'Double Winner')).toBe(true);
    });

    it('assigns Incubo Playout for 2+ cartonati and Collezionista Cucchiai for 2+ spoons', () => {
      const m = createTestManager({
        id: 'pl',
        name: 'Unfortunate',
        years: 5,
        spoon: 2,
        cartonato: 2
      });
      const badges = computeTradingCardBadges(m);

      expect(badges.some(b => b.label === 'Incubo Playout')).toBe(true);
      expect(badges.some(b => b.label === 'Collezionista Cucchiai')).toBe(true);
    });
  });

  describe('buildTradingCardHTML', () => {
    it('produces complete HTML structure with trophies and coach banners', () => {
      const m: Manager = createTestManager({
        id: 'champ',
        name: 'Vannico',
        years: 8,
        gold: 3,
        cup_gold: 2,
        supercup: 1,
        mundialito: 1,
        spoon: 0,
        cartonato: 1,
        coach_banners: ['MAZZARRI']
      });

      const html = buildTradingCardHTML(m);

      // Verify essential components
      expect(html).toContain('trading-card');
      expect(html).toContain('VANNICO');
      expect(html).toContain('VA');
      expect(html).toContain('Scudetti');
      expect(html).toContain('Coppe Lega');
      expect(html).toContain('Supercoppe');
      expect(html).toContain('Mundialito');
      expect(html).toContain('Cucchiai Legno');
      expect(html).toContain('Cartonati');
      expect(html).toContain('MAZZARRI');
      expect(html).toContain('InsalAtlas Lega');
    });
  });

  describe('buildWhatsAppShareText', () => {
    it('formats message text with stats, archetype, trophies, and preview link', () => {
      const m: Manager = createTestManager({
        id: 'm_alfo',
        name: 'Alfo',
        years: 4,
        gold: 1,
        silver: 2,
        cup_gold: 0,
        spoon: 0,
        cartonato: 0
      });

      const text = buildWhatsAppShareText(m, 'https://fgizzarellids.github.io/insalatlas_sala_trofei/');

      expect(text).toContain('*ALFO*');
      expect(text).toContain('4 Stagioni');
      expect(text).toContain('Rating Storico:');
      expect(text).toContain('Profilo:');
      expect(text).toContain('*Freddezza:*');
      expect(text).toContain('🥇 1 Scudetto');
      expect(text).toContain('https://fgizzarellids.github.io/insalatlas_sala_trofei/?manager=m_alfo');
    });
  });

  describe('Deep Linking - findManagerByParam', () => {
    const managers: Manager[] = [
      createTestManager({ id: 'm_peterdani', name: 'Peter & Dani', years: 7 }),
      createTestManager({ id: 'm_alfo', name: 'Alfo', years: 10 }),
      createTestManager({ id: 'm_makako', name: 'Makako', years: 7 })
    ];

    it('matches exact manager ID', async () => {
      const { findManagerByParam } = await import('@/main');
      expect(findManagerByParam('m_peterdani', managers)?.id).toBe('m_peterdani');
      expect(findManagerByParam('m_alfo', managers)?.id).toBe('m_alfo');
    });

    it('matches ID without m_ prefix', async () => {
      const { findManagerByParam } = await import('@/main');
      expect(findManagerByParam('peterdani', managers)?.id).toBe('m_peterdani');
      expect(findManagerByParam('alfo', managers)?.id).toBe('m_alfo');
    });

    it('matches URL-encoded parameters and case-insensitivity', async () => {
      const { findManagerByParam } = await import('@/main');
      expect(findManagerByParam('Peter%20%26%20Dani', managers)?.id).toBe('m_peterdani');
      expect(findManagerByParam('PETERDANI', managers)?.id).toBe('m_peterdani');
      expect(findManagerByParam('peter&dani', managers)?.id).toBe('m_peterdani');
      expect(findManagerByParam('ALFO', managers)?.id).toBe('m_alfo');
    });

    it('returns undefined when no manager matches', async () => {
      const { findManagerByParam } = await import('@/main');
      expect(findManagerByParam('non_existent', managers)).toBeUndefined();
      expect(findManagerByParam('', managers)).toBeUndefined();
    });
  });

  describe('Record WhatsApp Share & Deep Linking', () => {
    it('builds formatted share text for a single record holder', async () => {
      const { buildRecordWhatsAppShareText } = await import('@/export');
      const holder1 = {
        managerId: 'm_makako',
        managerName: 'Makako',
        season: '2017/18',
        teamName: 'Makako Antwerpen',
        value: 67,
        formattedValue: '67.0 pt',
        normalizedDetail: '1.91 pt/g • 35 giornate'
      };
      const mockRecord: LeagueRecord = {
        id: 'punti-singola-stagione',
        category: 'points',
        title: 'Record Punti Singola Stagione',
        icon: 'fa-solid fa-bolt',
        badgeLabel: 'Campionato Record',
        badgeColor: 'amber',
        description: 'Il maggior numero di punti mai totalizzato in un singolo campionato.',
        watermark: '⚡',
        primaryHolders: [holder1],
        primaryHolder: holder1,
        runnerUps: []
      };

      const text = buildRecordWhatsAppShareText(mockRecord, 'https://test.insalatlas.it/');
      expect(text).toContain('🏆 *InsalAtlas • Record & Primati Storici*');
      expect(text).toContain('RECORD PUNTI SINGOLA STAGIONE');
      expect(text).toContain('67.0 pt');
      expect(text).toContain('Makako');
      expect(text).toContain('(2017/18)');
      expect(text).toContain('_Makako Antwerpen_');
      expect(text).toContain('https://test.insalatlas.it/?record=punti-singola-stagione');
    });

    it('builds formatted share text for ex-aequo co-holders', async () => {
      const { buildRecordWhatsAppShareText } = await import('@/export');
      const holderA = {
        managerId: 'm_sebba',
        managerName: 'Sebba',
        season: '2023/24',
        value: 56,
        formattedValue: '56.0 pt',
        normalizedDetail: '1.70 pt/g • 33 giornate'
      };
      const holderB = {
        managerId: 'm_vannico',
        managerName: 'Vannico',
        season: '2022/23',
        value: 56,
        formattedValue: '56.0 pt',
        normalizedDetail: '1.70 pt/g • 33 giornate'
      };
      const mockRecord: LeagueRecord = {
        id: 'scudetto-meno-punti',
        category: 'points',
        title: 'Scudetto con Meno Punti',
        icon: 'fa-solid fa-trophy',
        badgeLabel: 'Scudetto Low Cost',
        badgeColor: 'blue',
        description: 'Titolo con il minor bottino di punti.',
        watermark: '🏆',
        primaryHolders: [holderA, holderB],
        primaryHolder: holderA,
        runnerUps: []
      };

      const text = buildRecordWhatsAppShareText(mockRecord);
      expect(text).toContain('SCUDETTO CON MENO PUNTI');
      expect(text).toContain('🤝 *Co-Primatisti (Pari Merito):*');
      expect(text).toContain('Sebba (2023/24)');
      expect(text).toContain('Vannico (2022/23)');
      expect(text).toContain('?record=scudetto-meno-punti');
    });

    it('extracts record param from URL search and hash', async () => {
      const { getRecordParamFromURL } = await import('@/router');

      // Test with custom URLs (search and hash)
      expect(getRecordParamFromURL('https://insalatlas.it/?record=scudetto-meno-punti')).toBe('scudetto-meno-punti');
      expect(getRecordParamFromURL('https://insalatlas.it/#/tab?record=mister-camaleonte')).toBe('mister-camaleonte');
      expect(getRecordParamFromURL('https://insalatlas.it/?other=123')).toBeNull();
      expect(getRecordParamFromURL('')).toBeNull();
    });
  });

  describe('Hall of Fame Poster HD Export Engine & UI Dropdown', () => {
    it('exports renderHallOfFamePosterCanvas, exportHallOfFamePosterHD and copyHallOfFamePosterToClipboard', async () => {
      const { renderHallOfFamePosterCanvas, exportHallOfFamePosterHD, copyHallOfFamePosterToClipboard } = await import('@/export');
      expect(typeof renderHallOfFamePosterCanvas).toBe('function');
      expect(typeof exportHallOfFamePosterHD).toBe('function');
      expect(typeof copyHallOfFamePosterToClipboard).toBe('function');
    });

    it('renders the Poster HD dropdown button in RecordsTab header', async () => {
      const { renderRecordsContentHTML } = await import('@/components/board/records');
      const html = renderRecordsContentHTML('all', '');

      expect(html).toContain('btn-poster-share-dropdown');
      expect(html).toContain('poster-share-dropdown-menu');
      expect(html).toContain('Poster HD');
      expect(html).toContain('Scarica Poster PNG (HD)');
      expect(html).toContain('Copia per WhatsApp');
    });

    it('manages poster dropdown visibility and closeAllRecordShareDropdowns', async () => {
      const {
        togglePosterShareDropdown,
        closePosterShareDropdown,
        closeAllRecordShareDropdowns
      } = await import('@/components/board/records');

      const originalDoc = (globalThis as any).document;
      try {
        const posterClasses = new Set<string>(['hidden']);
        const recordClasses = new Set<string>(['hidden']);

        const posterEl = {
          classList: {
            contains: (c: string) => posterClasses.has(c),
            add: (c: string) => posterClasses.add(c),
            remove: (c: string) => posterClasses.delete(c),
            toggle: (c: string) => {
              if (posterClasses.has(c)) posterClasses.delete(c);
              else posterClasses.add(c);
            }
          }
        };

        const recordEl = {
          classList: {
            contains: (c: string) => recordClasses.has(c),
            add: (c: string) => recordClasses.add(c),
            remove: (c: string) => recordClasses.delete(c)
          }
        };

        (globalThis as any).document = {
          getElementById: (id: string) => {
            if (id === 'poster-share-dropdown-menu') return posterEl;
            if (id === 'record-share-dropdown-rec1') return recordEl;
            return null;
          },
          querySelectorAll: (sel: string) => {
            if (sel.includes('record-share-dropdown')) return [recordEl];
            return [];
          }
        };

        // Toggle open
        togglePosterShareDropdown();
        expect(posterClasses.has('hidden')).toBe(false);

        // Close via closePosterShareDropdown
        closePosterShareDropdown();
        expect(posterClasses.has('hidden')).toBe(true);

        // Toggle open again, then closeAllRecordShareDropdowns
        togglePosterShareDropdown();
        recordClasses.delete('hidden');
        expect(posterClasses.has('hidden')).toBe(false);
        expect(recordClasses.has('hidden')).toBe(false);

        closeAllRecordShareDropdowns();
        expect(posterClasses.has('hidden')).toBe(true);
        expect(recordClasses.has('hidden')).toBe(true);
      } finally {
        (globalThis as any).document = originalDoc;
      }
    });

    it('generates rich WhatsApp share text for Hall of Fame poster with ?tab=records', async () => {
      const { buildPosterWhatsAppShareText } = await import('@/export');
      const text = buildPosterWhatsAppShareText('https://test.insalatlas.it/');

      expect(text).toContain('🏆 *InsalAtlas • Hall of Fame Ufficiale (2016-2026)*');
      expect(text).toContain('RECORD & PRIMATI ALL-TIME DELLA SERIE ATLAS');
      expect(text).toContain('Punti & Podi');
      expect(text).toContain('Rivalità Head-to-Head');
      expect(text).toContain('https://test.insalatlas.it/?tab=records');
    });
  });

  describe('Albo d Oro Export Engine & Toolbar Dropdown', () => {
    it('generates rich WhatsApp share text with top 3 champions and ?tab=albo', async () => {
      const { buildAlboWhatsAppShareText } = await import('@/export');
      const { state } = await import('@/state');

      state.managers = [
        createTestManager({ id: 'm1', name: 'Primo Manager', gold: 3, cup_gold: 2, supercup: 1, mundialito: 0 }),
        createTestManager({ id: 'm2', name: 'Secondo Manager', gold: 2, cup_gold: 1, supercup: 0, mundialito: 0 }),
        createTestManager({ id: 'm3', name: 'Terzo Manager', gold: 1, cup_gold: 1, supercup: 0, mundialito: 0 }),
        createTestManager({ id: 'm4', name: 'Quarto Manager', gold: 0, cup_gold: 0, supercup: 0, mundialito: 0 })
      ];

      const text = buildAlboWhatsAppShareText('https://test.insalatlas.it/');

      expect(text).toContain('🏆 *InsalAtlas • Albo d\'Oro & Sala Trofei (2016-2026)*');
      expect(text).toContain('CLASSIFICA STORICA DEI PIÙ TITOLATI');
      expect(text).toContain('🥇 *Primo Manager*: 6 Titoli (3 Scudetti)');
      expect(text).toContain('🥈 *Secondo Manager*: 3 Titoli (2 Scudetti)');
      expect(text).toContain('🥉 *Terzo Manager*: 2 Titoli (1 Scudetti)');
      expect(text).not.toContain('Quarto Manager');
      expect(text).toContain('https://test.insalatlas.it/?tab=albo');
    });

    it('toggles and closes the Albo d Oro dropdown menu', async () => {
      const { toggleAlboShareDropdown, closeAlboShareDropdown } = await import('@/components/board/tableBoard');

      const originalDoc = (globalThis as any).document;
      try {
        const classes = new Set<string>(['hidden']);
        const dropdownEl = {
          classList: {
            contains: (c: string) => classes.has(c),
            add: (c: string) => classes.add(c),
            remove: (c: string) => classes.delete(c),
            toggle: (c: string) => {
              if (classes.has(c)) classes.delete(c);
              else classes.add(c);
            }
          }
        };

        (globalThis as any).document = {
          getElementById: (id: string) => (id === 'albo-share-dropdown-menu' ? dropdownEl : null)
        };

        // Initially hidden
        expect(classes.has('hidden')).toBe(true);

        // Toggle open
        toggleAlboShareDropdown();
        expect(classes.has('hidden')).toBe(false);

        // Close explicitly
        closeAlboShareDropdown();
        expect(classes.has('hidden')).toBe(true);
      } finally {
        (globalThis as any).document = originalDoc;
      }
    });

    it('verifies Albo toolbar controls are positioned in main-tab-albo-content and removed from site header', async () => {
      // In Vite / Vitest, HTML can be loaded via ?raw or fetch
      const indexHtml = (await import('../../index.html?raw')).default;

      // Toolbar exists in main tab
      expect(indexHtml).toContain('id="albo-toolbar"');
      expect(indexHtml).toContain('id="btn-albo-share-dropdown"');
      expect(indexHtml).toContain('id="albo-share-dropdown-menu"');
      expect(indexHtml).toContain('id="btn-display-mode"');

      // Top navbar header should no longer contain btn-display-mode
      const headerMatch = indexHtml.match(/<header id="site-header"[\s\S]*?<\/header>/);
      expect(headerMatch).not.toBeNull();
      const headerContent = headerMatch![0];
      expect(headerContent).not.toContain('id="btn-display-mode"');
      expect(headerContent).not.toContain('exportGraphicHD');
    });

    it('ensures package.json and package-lock.json versions stay synchronized', async () => {
      const pkg = (await import('../../package.json')).default;
      const lock = (await import('../../package-lock.json')).default;

      expect(lock.version).toBe(pkg.version);
      expect(lock.packages[''].version).toBe(pkg.version);
    });
  });
});

