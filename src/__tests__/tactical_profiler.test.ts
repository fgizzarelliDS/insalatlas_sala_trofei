/**
 * src/__tests__/tactical_profiler.test.ts
 * Comprehensive Vitest Unit Tests for Tactical Profiler & Psychological Identikit Engine 
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeManagerTacticalProfile,
  formatTacticalWhatsAppBanter,
  calculateRadarSvgPoints,
  computeSeasonalMindset,
  setManagerLore,
  getCachedManagerLore
} from '@/analytics/tacticalProfiler';
import { computeRawManagerSeasonalValues } from '@/analytics/tactical/tacticalAxes';
import { createTestManager } from './test-utils';
import type { Manager, LiveSeasonDetails } from '@/types';
import { populateTacticalProfileDOM, setProfileTacticalScope } from '@/components/modals/profile/ProfileTacticalTab';
import { renderTacticalStoryCanvas } from '@/export/renderers/story/tacticalStory';
import { openStoryExportModal, switchStoryExportTab, closeStoryExportModal } from '@/components/modals/export/StoryExportModal';
import { state, setLiveSeasonDetails } from '@/state';
import { LEAGUE } from '@/config';

class MockElement {
  id: string = '';
  className: string = '';
  innerHTML: string = '';
  style: any = {
    setProperty: vi.fn(),
    removeProperty: vi.fn()
  };
  children: MockElement[] = [];

  constructor(public tagName: string) { }

  appendChild(el: any) {
    this.children.push(el);
    return el;
  }

  removeChild(el: any) {
    this.children = this.children.filter(c => c !== el);
    return el;
  }

  classList = {
    add: vi.fn((cls: string) => {
      this.className = `${this.className} ${cls}`.trim();
    }),
    remove: vi.fn((cls: string) => {
      this.className = this.className.replace(new RegExp(`\\b${cls}\\b`, 'g'), '').trim();
    }),
    contains: vi.fn((cls: string) => this.className.includes(cls))
  };

  querySelectorAll(_sel: string) {
    return [];
  }

  querySelector(_sel: string) {
    return null;
  }

  remove() { }
}

vi.mock('html-to-image', () => ({
  toCanvas: vi.fn(async (_element: any, opts: any) => ({
    width: opts.width || 1080,
    height: opts.height || 1920,
    toBlob: (cb: any) => cb(new Blob(['fake-png-data'], { type: 'image/png' })),
    toDataURL: () => 'data:image/png;base64,fake'
  })),
  getFontEmbedCSS: vi.fn(async () => '')
}));

describe('Tactical Profiler & Psychological Identikit ', () => {
  let originalDocument: any;
  let originalWindow: any;
  let mockContainer: MockElement;

  beforeEach(() => {
    originalDocument = (globalThis as any).document;
    originalWindow = (globalThis as any).window;

    mockContainer = new MockElement('div');
    mockContainer.id = 'profile-tab-tactical-content';

    const mockBody = new MockElement('body');
    mockBody.appendChild(mockContainer);

    const createdElements: MockElement[] = [mockContainer];

    (globalThis as any).document = {
      body: mockBody,
      createElement: vi.fn((tag: string) => {
        const el = new MockElement(tag);
        createdElements.push(el);
        return el;
      }),
      getElementById: vi.fn((id: string) => {
        if (id === 'profile-tab-tactical-content') return mockContainer;
        return createdElements.find(e => e.id === id) || null;
      }),
      querySelectorAll: vi.fn(() => [])
    };

    (globalThis as any).window = {
      location: { href: 'https://insalatlas.it/' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
  });

  afterEach(() => {
    (globalThis as any).document = originalDocument;
    (globalThis as any).window = originalWindow;
  });

  const managerVannico: Manager = createTestManager({
    id: 'm_vannico',
    name: 'Vannico',
    years: 10,
    gold: 3,
    silver: 2,
    bronze: 1,
    supercup: 2,
    history: [
      { season: '2025/26', team: 'A S CorradiAndBosuTeam', rank: 2, points: 55, achievements: [] },
      { season: '2024/25', team: 'A S CorradiAndBosuTeam', rank: 1, points: 62, achievements: [] },
      { season: '2023/24', team: 'A S CorradiAndBosuTeam', rank: 4, points: 48, achievements: [] }
    ]
  });

  const managerAlfo: Manager = createTestManager({
    id: 'm_alfo',
    name: 'Alfo',
    years: 11,
    gold: 1,
    silver: 1,
    bronze: 2,
    cup_gold: 3,
    supercup: 3,
    mundialito: 1,
    cup_silver: 1,
    supercup_silver: 1,
    history: [
      { season: '2025/26', team: 'CarloMonte FC', rank: 3, points: 52, achievements: [] }
    ]
  });

  const managerLucchetto: Manager = createTestManager({
    id: 'm_lucchetto',
    name: 'Lucchetto',
    years: 10,
    gold: 2,
    silver: 2,
    bronze: 2,
    supercup: 1,
    spoon: 0,
    cartonato: 0,
    history: [
      { season: '2025/26', team: 'Posto INFNito FC', rank: 1, points: 65, achievements: [] },
      { season: '2024/25', team: 'Posto INFNito FC', rank: 2, points: 58, achievements: [] },
      { season: '2023/24', team: 'Posto INFNito FC', rank: 2, points: 60, achievements: [] }
    ]
  });

  const managerRookie: Manager = createTestManager({
    id: 'm_gizzagustacito',
    name: 'Gizza&Gustacito',
    years: 2,
    gold: 0,
    silver: 1,
    bronze: 0,
    history: [
      { season: '2025/26', team: "Levrieri d'Abruzzo", rank: 2, points: 54, achievements: [] }
    ]
  });

  const managerRookieRaw: Manager = createTestManager({
    id: 'm_newbie',
    name: 'Newbie Manager',
    years: 1,
    gold: 0,
    silver: 0,
    bronze: 0,
    spoon: 0,
    history: [
      { season: '2025/26', team: 'Newbie FC', rank: 8, points: 28, achievements: [] }
    ]
  });

  const allManagers: Manager[] = [
    managerVannico,
    managerAlfo,
    managerLucchetto,
    managerRookie,
    managerRookieRaw
  ];

  const mockLiveData: LiveSeasonDetails = {
    season: '2026/27',
    competitionId: 863632,
    lastCompletedRound: 5,
    totalRounds: 26,
    rounds: [],
    standings: [
      {
        rank: 1,
        teamName: 'A S CorradiAndBosuTeam',
        coach: 'Vannico',
        managerId: 'm_vannico',
        points: 13,
        recentForm: ['W', 'W', 'W', 'D', 'W'],
        statusBadge: '🔥' as any,
        statusLabel: 'In Trance',
        scheduleLuck: {
          xPoints: 12.0,
          xRank: 1,
          deltaRank: 0,
          luckBadge: '🍀',
          luckLabel: 'In Media',
          luckZScore: 0.3,
          allPlayRecord: { wins: 12, draws: 1, losses: 2, played: 15, winPct: 83.3 }
        }
      },
      {
        rank: 2,
        teamName: 'Posto INFNito FC',
        coach: 'Lucchetto',
        managerId: 'm_lucchetto',
        points: 12,
        recentForm: ['W', 'D', 'W', 'D', 'W'],
        statusBadge: '⚖️' as any,
        statusLabel: 'Regolare',
        scheduleLuck: {
          xPoints: 7.2,
          xRank: 3,
          deltaRank: 1,
          luckBadge: '🍀',
          luckLabel: 'Overperforming',
          luckZScore: 1.2,
          allPlayRecord: { wins: 8, draws: 3, losses: 4, played: 15, winPct: 53.3 }
        }
      },
      {
        rank: 5,
        teamName: "Levrieri d'Abruzzo",
        coach: 'Gizza',
        managerId: 'm_gizzagustacito',
        points: 6,
        recentForm: ['L', 'L', 'L', 'L', 'W'],
        statusBadge: '⚡' as any,
        statusLabel: 'Resurrezione',
        scheduleLuck: {
          xPoints: 7.8,
          xRank: 4,
          deltaRank: -1,
          luckBadge: '⛈️',
          luckLabel: 'Sfortunato',
          luckZScore: -0.8,
          allPlayRecord: { wins: 5, draws: 2, losses: 8, played: 15, winPct: 33.3 }
        }
      }
    ]
  };

  describe('1. Determinism and Idempotence', () => {
    it('produces 100% identical profiles across 100 consecutive invocations', () => {
      const first = computeManagerTacticalProfile(managerVannico, allManagers, mockLiveData);
      for (let i = 0; i < 100; i++) {
        const next = computeManagerTacticalProfile(managerVannico, allManagers, mockLiveData);
        expect(next.archetype.id).toBe(first.archetype.id);
        expect(next.archetype.title).toBe(first.archetype.title);
        expect(next.axes.pot.score).toBe(first.axes.pot.score);
        expect(next.axes.cin.score).toBe(first.axes.cin.score);
        expect(next.axes.luk.score).toBe(first.axes.luk.score);
        expect(next.axes.koc.score).toBe(first.axes.koc.score);
        expect(next.axes.reg.score).toBe(first.axes.reg.score);
        expect(next.axes.radarPoints).toBe(first.axes.radarPoints);
        expect(next.mindset.pill).toBe(first.mindset.pill);
      }
    });
  });

  describe('2. Min-Max Normalization on 5 Style Axes', () => {
    it('clamps all 5 axes strictly within [5, 100]', () => {
      allManagers.forEach(m => {
        const profile = computeManagerTacticalProfile(m, allManagers, mockLiveData);
        expect(profile.axes.pot.score).toBeGreaterThanOrEqual(5);
        expect(profile.axes.pot.score).toBeLessThanOrEqual(100);

        expect(profile.axes.cin.score).toBeGreaterThanOrEqual(5);
        expect(profile.axes.cin.score).toBeLessThanOrEqual(100);

        expect(profile.axes.luk.score).toBeGreaterThanOrEqual(5);
        expect(profile.axes.luk.score).toBeLessThanOrEqual(100);

        expect(profile.axes.koc.score).toBeGreaterThanOrEqual(5);
        expect(profile.axes.koc.score).toBeLessThanOrEqual(100);

        expect(profile.axes.reg.score).toBeGreaterThanOrEqual(5);
        expect(profile.axes.reg.score).toBeLessThanOrEqual(100);
      });
    });

    it('computes radar SVG points accurately with 5 vertex pairs', () => {
      const pts = calculateRadarSvgPoints({ pot: 75, cin: 60, luk: 50, reg: 80, koc: 45 });
      const tokens = pts.split(' ');
      expect(tokens).toHaveLength(5);
      tokens.forEach(pair => {
        const [x, y] = pair.split(',').map(Number);
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(240);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(220);
      });
    });

    it('computes real metric deviation strings on 5 style axes', () => {
      const profile = computeManagerTacticalProfile(managerVannico, allManagers, mockLiveData);
      expect(profile.axes.pot.deltaPct).toMatch(/\([+-]?\d+(\.\d+)?%\)/);
      expect(profile.axes.cin.deltaPct).toMatch(/\([+-]?\d+%\)/);
      expect(profile.axes.luk.deltaPct).toMatch(/\([+-]?\d+(\.\d+)? vs xPTS\)/);
      expect(profile.axes.koc.deltaPct).toMatch(/\([+-]?\d+%\)/);
      expect(profile.axes.reg.deltaPct).toMatch(/\([+-]?\d+%\)/);
    });
  });

  describe('3. Archetype Taxonomy Coverage', () => {
    it('assigns LA MATRICOLA TERRIBILE to rookies with podiums', () => {
      const profile = computeManagerTacticalProfile(managerRookie, allManagers, mockLiveData);
      expect(profile.archetype.id).toBe('matricola_terribile');
      expect(profile.archetype.title).toBe('LA MATRICOLA TERRIBILE');
      expect(profile.archetype.icon).toBe('fa-rocket');
      expect(profile.archetype.motto).toContain('timore reverenziale');
    });

    it("assigns L'APPRENDISTA DEL FANTA to debutants in rodaggio without podiums", () => {
      const profile = computeManagerTacticalProfile(managerRookieRaw, allManagers, mockLiveData);
      expect(profile.archetype.id).toBe('apprendista_fanta');
      expect(profile.archetype.title).toBe("L'APPRENDISTA DEL FANTA");
      expect(profile.archetype.icon).toBe('fa-seedling');
    });

    it('assigns IL CECCHINO DA COPPE to managers with heavy cup honors', () => {
      const profile = computeManagerTacticalProfile(managerAlfo, allManagers, mockLiveData);
      expect(profile.archetype.id).toBe('cecchino_coppe');
      expect(profile.archetype.title).toBe('IL CECCHINO DA COPPE');
      expect(profile.archetype.icon).toBe('fa-crosshairs');
    });

    it('assigns LA MACCHINA DA GUERRA to veterans with high stability, scudetti and 0 spoons', () => {
      const profile = computeManagerTacticalProfile(managerLucchetto, allManagers, mockLiveData);
      expect(profile.archetype.id).toBe('macchina_guerra');
      expect(profile.archetype.title).toBe('LA MACCHINA DA GUERRA');
      expect(profile.archetype.icon).toBe('fa-shield-halved');
    });

    it('assigns LA ROULETTE RUSSA to veterans with trophies AND spoons', () => {
      const managerWild = createTestManager({
        id: 'm_wild',
        name: 'Wild Gambler',
        years: 6,
        gold: 1,
        spoon: 1,
        cartonato: 1
      });
      const profile = computeManagerTacticalProfile(managerWild, [...allManagers, managerWild]);
      expect(profile.archetype.id).toBe('roulette_russa');
      expect(profile.archetype.title).toBe('LA ROULETTE RUSSA');
      expect(profile.archetype.icon).toBe('fa-dice');
    });

    it("assigns L'ETERNO INCOMPIUTO to veterans with multiple podiums but 0 scudetti", () => {
      const managerSecond = createTestManager({
        id: 'm_second',
        name: 'Always Second',
        years: 5,
        gold: 0,
        silver: 3,
        bronze: 1
      });
      const profile = computeManagerTacticalProfile(managerSecond, [...allManagers, managerSecond]);
      expect(profile.archetype.id).toBe('eterno_incompiuto');
      expect(profile.archetype.title).toBe("L'ETERNO INCOMPIUTO");
    });
  });

  describe('4. Seasonal Live Mindset (2026/27)', () => {
    it('evaluates IN TRANCE AGONISTICA for active managers on a winning run', () => {
      const mindset = computeSeasonalMindset(managerVannico, mockLiveData);
      expect(mindset.isActive).toBe(true);
      expect(mindset.pill).toContain('IN TRANCE AGONISTICA');
      expect(mindset.icon).toBe('fa-fire');
      expect(mindset.momentum).toContain('/ 1.00');
    });

    it("evaluates SINDROME DELL'IMPOSTORE for top managers with high delta luck", () => {
      const mindset = computeSeasonalMindset(managerLucchetto, mockLiveData);
      expect(mindset.isActive).toBe(true);
      expect(mindset.pill).toContain("SINDROME DELL'IMPOSTORE");
      expect(mindset.icon).toBe('fa-scale-balanced');
    });

    it('evaluates RESURREZIONE IMPROVVISA when winning right after consecutive losses', () => {
      const mindset = computeSeasonalMindset(managerRookie, mockLiveData);
      expect(mindset.isActive).toBe(true);
      expect(mindset.pill).toContain('RESURREZIONE IMPROVVISA');
      expect(mindset.icon).toBe('fa-bolt');
    });

    it('returns ARCHIVIO STORICO for historical inactive managers', () => {
      const historicalManager = createTestManager({
        id: 'm_old',
        name: 'Retired Legend',
        years: 4,
        gold: 1
      });
      const mindset = computeSeasonalMindset(historicalManager, mockLiveData);
      expect(mindset.isActive).toBe(false);
      expect(mindset.pill).toBe('🏛️ ARCHIVIO STORICO');
      expect(mindset.icon).toBe('fa-landmark');
      expect(mindset.momentum).toBe('-');
    });
  });

  describe('5. WhatsApp Banter Text Generator', () => {
    it('produces valid markdown text with emojis, golden motto, and deep link', () => {
      const profile = computeManagerTacticalProfile(managerVannico, allManagers, mockLiveData);
      const text = formatTacticalWhatsAppBanter(profile, 'https://insalatlas.it/');

      expect(text).toContain(`🗞️ *PAGELLA TATTICA • ${LEAGUE.brand.name.toUpperCase()} SALA TROFEI*`);
      expect(text).toContain(`*Mister:* ${profile.managerName}`);
      expect(text).toContain(`*Identikit:* *${profile.archetype.title}*`);
      expect(text).toContain(profile.archetype.motto);
      expect(text).toContain('• 🎯');
      expect(text).toContain('• 🍀');
      expect(text).toContain('• 🏆');
      expect(text).toContain(profile.mindset.pill);
      expect(text).toContain('https://insalatlas.it/?manager=m_vannico');
    });
  });

  describe('6. DOM Rendering in ProfileModal (Tab 2)', () => {
    it('renders hero card, radar SVG, 5 style bars, and 3 philosophy pills into DOM', () => {
      populateTacticalProfileDOM(managerVannico, allManagers);
      expect(mockContainer.innerHTML).toContain('DNA DI CARRIERA ALL-TIME');
      expect(mockContainer.innerHTML).toContain('Radar Tattico (5 Assi)');
      expect(mockContainer.innerHTML).toContain('svg');
      expect(mockContainer.innerHTML).toContain('Deviazione dalla Media di Lega');
      expect(mockContainer.innerHTML).toContain('I Numeri della Filosofia');
      expect(mockContainer.innerHTML).toContain('Story 9:16');
      expect(mockContainer.innerHTML).toContain('Copia Banter');
    });
  });

  describe('7. Social Story 9:16 Canvas Export', () => {
    it('renders a high-resolution 1080x1920 canvas for the tactical identikit', async () => {
      const canvas = await renderTacticalStoryCanvas(managerVannico);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(1080);
      expect(canvas.height).toBe(1920);
    });
  });

  describe('8. Custom Lore & Banter Overrides', () => {
    it('overrides motto and trait seamlessly when custom lore is set', () => {
      setManagerLore({
        m_vannico: {
          customMotto: '"Motto personalizzato per Vannico"',
          customTrait: '🎩 Maestro Assoluto'
        }
      });

      const profile = computeManagerTacticalProfile(managerVannico, allManagers, mockLiveData);
      expect(profile.archetype.motto).toBe('"Motto personalizzato per Vannico"');
      expect(profile.archetype.trait).toBe('🎩 Maestro Assoluto');

      // Clear custom lore
      setManagerLore({});
      expect(getCachedManagerLore()).toEqual({});
      const resetProfile = computeManagerTacticalProfile(managerVannico, allManagers, mockLiveData);
      expect(resetProfile.archetype.motto).toContain('costanza è potere');
    });
  });

  describe('9. Phase 2 Statistical & UX Hardening', () => {
    it('guarantees strict monotonicity on the Cup Axis (KOC): 0 finals < 1 final lost < 2 finals lost < 1 final won', () => {
      const m0 = createTestManager({ id: 'm_k0', name: 'Zero Finals', years: 5 });
      const mLost1 = createTestManager({ id: 'm_kl1', name: 'Lost One Final', years: 5, cup_silver: 1 });
      const mLost2 = createTestManager({ id: 'm_kl2', name: 'Lost Two Finals', years: 5, cup_silver: 2 });
      const mWon1 = createTestManager({ id: 'm_kw1', name: 'Won One Final', years: 5, cup_gold: 1 });

      const pool = [m0, mLost1, mLost2, mWon1];
      const p0 = computeManagerTacticalProfile(m0, pool);
      const pLost1 = computeManagerTacticalProfile(mLost1, pool);
      const pLost2 = computeManagerTacticalProfile(mLost2, pool);
      const pWon1 = computeManagerTacticalProfile(mWon1, pool);

      expect(p0.axes.koc.score).toBeLessThan(pLost1.axes.koc.score);
      expect(pLost1.axes.koc.score).toBeLessThan(pLost2.axes.koc.score);
      expect(pLost2.axes.koc.score).toBeLessThan(pWon1.axes.koc.score);
    });

    it('resolves teamName to the newest season in manager.history rather than the oldest', () => {
      const mMultiTeam = createTestManager({
        id: 'm_multi',
        name: 'Veteran Renamer',
        years: 5,
        history: [
          { season: '2025/26', team: 'Newest FC', rank: 2, points: 58, achievements: [] },
          { season: '2018/19', team: 'Oldest Ancient FC', rank: 6, points: 40, achievements: [] }
        ]
      });
      const profile = computeManagerTacticalProfile(mMultiTeam, [mMultiTeam]);
      expect(profile.teamName).toBe('Newest FC');
    });

    it('centers Z-Score + tanh normalization at Score = 50 for a manager at the exact league mean', () => {
      const mLow = createTestManager({
        id: 'm_low',
        name: 'Low',
        years: 4,
        history: [{ season: '2024/25', team: 'Low FC', rank: 9, points: 30, achievements: [] }]
      });
      const mMid = createTestManager({
        id: 'm_mid',
        name: 'Mid',
        years: 4,
        history: [{ season: '2024/25', team: 'Mid FC', rank: 5, points: 45, achievements: [] }]
      });
      const mHigh = createTestManager({
        id: 'm_high',
        name: 'High',
        years: 4,
        history: [{ season: '2024/25', team: 'High FC', rank: 1, points: 60, achievements: [] }]
      });
      const symmetricPool = [mLow, mMid, mHigh];
      const midProfile = computeManagerTacticalProfile(mMid, symmetricPool);
      expect(midProfile.axes.pot.score).toBe(50);
    });

    it('supports all-time historical managers in StoryExportModal across palmares and tactical tabs', () => {
      const mHistorical = createTestManager({
        id: 'm_historical_legend',
        name: 'Dario Storico',
        years: 6,
        gold: 1,
        history: [{ season: '2021/22', team: 'Storica FC', rank: 1, points: 64, achievements: [] }]
      });
      state.managers = [...allManagers, mHistorical];

      openStoryExportModal('m_historical_legend', 'tactical', 'team');
      const modalEl = (globalThis as any).document.getElementById('story-export-modal');
      expect(modalEl).not.toBeNull();
      expect(modalEl?.innerHTML).toContain('Dario Storico (Storica FC)');
      expect(modalEl?.innerHTML).toContain('id="tab-story-palmares"');
      expect(modalEl?.innerHTML).toContain('id="tab-story-tactical"');

      switchStoryExportTab('palmares');
      closeStoryExportModal();
    });

    it('excludes matches with fpFor === 0 (cup/missing FP records) from CIN low-score win efficiency', () => {
      const mCupZeroFp = createTestManager({
        id: 'm_cup_zero_fp',
        name: 'Cup Winner',
        years: 3,
        history: [{ season: '2024/25', team: 'Cup FC', rank: 4, points: 48, achievements: [] }]
      });
      const mockAnalyticsManagers: Record<string, any> = {
        m_cup_zero_fp: {
          flat: {
            trajectory: [
              { matchIndex: 1, season: '2024/25', round: 1, comp: 'Coppa', opponentId: 'm_alfo', opponentName: 'Alfo', isHome: true, gf: 2, ga: 0, fpFor: 0, fpAgainst: 0, result: 'W' },
              { matchIndex: 2, season: '2024/25', round: 2, comp: 'Coppa', opponentId: 'm_alfo', opponentName: 'Alfo', isHome: false, gf: 3, ga: 0, fpFor: 0, fpAgainst: 0, result: 'W' },
              { matchIndex: 3, season: '2024/25', round: 3, comp: 'Lega', opponentId: 'm_alfo', opponentName: 'Alfo', isHome: true, gf: 3, ga: 1, fpFor: 78.5, fpAgainst: 67.0, result: 'W' }
            ]
          }
        }
      };
      const profile = computeManagerTacticalProfile(mCupZeroFp, [mCupZeroFp, managerAlfo], null, mockAnalyticsManagers);
      // None of the 3 multi-goal wins had 0 < fpFor <= 68.0, so closeWinRate is 0%
      expect(profile.axes.cin.raw).toBe('0%');
    });

    it('computes seasonal tactical values and switches scope between career and season', () => {
      const mockLive: LiveSeasonDetails = {
        season: '2026/27',
        competitionId: 1,
        lastCompletedRound: 3,
        totalRounds: 26,
        rounds: [
          {
            roundNumber: 1,
            matches: [
              {
                homeTeam: 'Alfo FC',
                awayTeam: 'Vannico FC',
                homeManagerId: managerAlfo.id,
                awayManagerId: managerVannico.id,
                isPlayed: true,
                homeScore: 2,
                awayScore: 1,
                homeFantaPoints: 74.0,
                awayFantaPoints: 67.5,
                homeOutcome: 'W',
                awayOutcome: 'L'
              }
            ]
          },
          {
            roundNumber: 2,
            matches: [
              {
                homeTeam: 'Vannico FC',
                awayTeam: 'Alfo FC',
                homeManagerId: managerVannico.id,
                awayManagerId: managerAlfo.id,
                isPlayed: true,
                homeScore: 1,
                awayScore: 1,
                homeFantaPoints: 71.0,
                awayFantaPoints: 72.0,
                homeOutcome: 'D',
                awayOutcome: 'D'
              }
            ]
          },
          {
            roundNumber: 3,
            matches: [
              {
                homeTeam: 'Alfo FC',
                awayTeam: 'Other FC',
                homeManagerId: managerAlfo.id,
                isPlayed: true,
                homeScore: 1,
                awayScore: 0,
                homeFantaPoints: 73.0,
                awayFantaPoints: 65.0,
                homeOutcome: 'W',
                awayOutcome: 'L'
              }
            ]
          }
        ],
        standings: [
          {
            rank: 1,
            managerId: managerAlfo.id,
            teamName: 'Alfo FC',
            coach: 'Alfo',
            avgFantaPoints: 73.0,
            recentForm: ['W', 'D', 'W'],
            points: 7,
            statusBadge: '📈',
            statusLabel: 'In forma',
            scheduleLuck: { xPoints: 5.5 } as any
          },
          {
            rank: 2,
            managerId: managerVannico.id,
            teamName: 'Vannico FC',
            coach: 'Vannico',
            avgFantaPoints: 69.25,
            recentForm: ['L', 'D'],
            points: 1,
            statusBadge: '📉',
            statusLabel: 'In crisi',
            scheduleLuck: { xPoints: 2.0 } as any
          }
        ]
      };

      const sRaw = computeRawManagerSeasonalValues(managerAlfo, mockLive);
      expect(sRaw).not.toBeNull();
      expect(sRaw!.isSeasonal).toBe(true);
      expect(sRaw!.avgFP).toBe(73.0);
      expect(sRaw!.stdDevRank).toBe(1.0); // 74.0, 72.0, 73.0 -> mean 73.0, sample variance 1.0, std dev 1.0!
      expect(sRaw!.bigMatchPlayed).toBe(2);
      expect(sRaw!.bigMatchPts).toBe(4); // Round 1 (W=3) + Round 2 (D=1) = 4 pts vs Vannico (Rank 2)

      const careerProfile = computeManagerTacticalProfile(managerAlfo, [managerAlfo, managerVannico], mockLive, null, 'career');
      expect(careerProfile.scope).toBe('career');
      expect(careerProfile.axes.reg.raw).toContain('pos');
      expect(careerProfile.axes.koc.shortTitle).toBe('COPPE');
      expect(careerProfile.axes.koc.raw).toContain('Trofe');

      const seasonProfile = computeManagerTacticalProfile(managerAlfo, [managerAlfo, managerVannico], mockLive, null, 'season');
      expect(seasonProfile.scope).toBe('season');
      expect(seasonProfile.axes.reg.raw).toContain('FP');
      expect(seasonProfile.axes.pot.raw).toContain('FM');
      expect(seasonProfile.axes.koc.shortTitle).toBe('BIG MATCH');
      expect(seasonProfile.axes.koc.raw).toBe('4 PT');
      expect(seasonProfile.axes.koc.subRaw).toBe('(2 gare)');

      // Test Profiler DOM with toggle
      setLiveSeasonDetails(mockLive);
      const mockContainer = new MockElement('div');
      mockContainer.id = 'profile-tab-tactical-content';
      (globalThis as any).document.getElementById = (id: string) => (id === 'profile-tab-tactical-content' ? mockContainer : null);

      populateTacticalProfileDOM(managerAlfo, [managerAlfo, managerVannico]);
      expect(mockContainer.innerHTML).toContain('Radar Tattico (5 Assi)');
      expect(mockContainer.innerHTML).toContain('Carriera');
      expect(mockContainer.innerHTML).toContain('Stagione');

      setProfileTacticalScope('season');
      expect(mockContainer.innerHTML).toContain('Assetto Live');
    });
  });
});
