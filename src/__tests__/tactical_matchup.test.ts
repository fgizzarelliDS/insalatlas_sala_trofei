import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Manager, HeadToHeadStats } from '@/types';
import {
  computeTacticalMatchup,
  formatTacticalDuelWhatsAppBanter
} from '@/analytics/tacticalMatchup';
import { renderDualRadar5AxesSVG } from '@/components/modals/h2h/HeadToHeadRadar';
import {
  renderPrecedentiCampionato,
  renderChiaveTattica,
  renderHeadToHeadMatchupView
} from '@/components/modals/h2h/HeadToHeadMatchupView';
import { renderH2HDuelStoryCanvas } from '@/export/renderers/story/h2hStory';
import { state } from '@/state';

class MockElement {
  id: string = '';
  className: string = '';
  innerHTML: string = '';
  style: Record<string, string> = {};
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

  querySelectorAll(_sel: string) {
    return [];
  }

  querySelector(_sel: string) {
    return null;
  }

  remove() { }
}

vi.mock('html-to-image', () => ({
  toCanvas: vi.fn(async (_element: any, opts: any) => {
    return {
      width: opts.width || 1080,
      height: opts.height || 1920,
      toBlob: (cb: any) => cb(new Blob(['fake-png-data'], { type: 'image/png' }))
    };
  }),
  getFontEmbedCSS: vi.fn(async () => '')
}));

function createMockManager(id: string, name: string, overrides: Partial<Manager> = {}): Manager {
  return {
    id,
    name,
    years: 5,
    gold: 1,
    silver: 0,
    bronze: 0,
    wooden: 0,
    podiums: 1,
    points: 250,
    total_goals: 180,
    fanta_points: 3500,
    titles: 1,
    history: [
      {
        season: '2023/24',
        team: `${name} FC`,
        rank: 1,
        points: 68,
        fanta_points: 75.2,
        titles: ['Serie A'],
        trophies: [{ name: 'Scudetto', type: 'gold', icon: '🏆' }],
        achievements: []
      },
      {
        season: '2022/23',
        team: `${name} FC`,
        rank: 3,
        points: 58,
        fanta_points: 71.0,
        trophies: [{ name: 'Coppa di Lega', type: 'gold', icon: '🏆' }],
        achievements: []
      },
      {
        season: '2021/22',
        team: `${name} FC`,
        rank: 2,
        points: 62,
        fanta_points: 73.1,
        trophies: [],
        achievements: []
      }
    ],
    ...overrides
  } as unknown as Manager;
}

describe('Tactical Matchup & H2H Duel Engine ', () => {
  let mgrAlfo: Manager;
  let mgrVannico: Manager;
  let allManagers: Manager[];
  let originalDocument: any;

  beforeEach(() => {
    originalDocument = (globalThis as any).document;
    const mockBody = new MockElement('body');
    (globalThis as any).document = {
      body: mockBody,
      createElement: (tag: string) => new MockElement(tag),
      getElementById: (_id: string) => null,
      fonts: { ready: Promise.resolve() }
    };

    mgrAlfo = createMockManager('alfo', 'Alfo', {
      gold: 3,
      cup_gold: 2
    });
    mgrVannico = createMockManager('vannico', 'Vannico', {
      gold: 0,
      cup_gold: 0
    });
    allManagers = [
      mgrAlfo,
      mgrVannico,
      createMockManager('peppe', 'Peppe'),
      createMockManager('ciccio', 'Ciccio')
    ];
    state.managers = allManagers;
  });

  afterEach(() => {
    (globalThis as any).document = originalDocument;
  });

  describe('computeTacticalMatchup', () => {
    it('computes differential scores across all 5 tactical axes', () => {
      const matchup = computeTacticalMatchup(mgrAlfo, mgrVannico, allManagers);

      expect(matchup.managerA.name).toBe('Alfo');
      expect(matchup.managerB.name).toBe('Vannico');
      expect(matchup.axesList).toHaveLength(5);

      const potDiff = matchup.axes.pot;
      expect(potDiff).toBeDefined();
      expect(typeof potDiff.scoreA).toBe('number');
      expect(typeof potDiff.scoreB).toBe('number');
      expect(typeof potDiff.diff).toBe('number');
      expect(['A', 'B', 'tie']).toContain(potDiff.winner);

      const kocDiff = matchup.axes.koc;
      expect(kocDiff).toBeDefined();
      expect(kocDiff.label).toContain('Freddezza');
    });

    it('generates contextual narrative Chiave Tattica with headline and description', () => {
      const matchup = computeTacticalMatchup(mgrAlfo, mgrVannico, allManagers);
      const { tacticalKey } = matchup;

      expect(tacticalKey.headline).toBeTruthy();
      expect(tacticalKey.description).toBeTruthy();
      expect(tacticalKey.edgeA).toBeTruthy();
      expect(tacticalKey.edgeB).toBeTruthy();
    });

    it('integrates Head-to-Head stats in the matchup object', () => {
      const matchup = computeTacticalMatchup(mgrAlfo, mgrVannico, allManagers);
      expect(matchup.h2hStats).toBeDefined();
      expect(typeof matchup.h2hStats.winsA).toBe('number');
      expect(typeof matchup.h2hStats.winsB).toBe('number');
      expect(typeof matchup.h2hStats.ties).toBe('number');
    });
  });

  describe('formatTacticalDuelWhatsAppBanter', () => {
    it('formats a rich WhatsApp banter text with emojis and differential badges', () => {
      const matchup = computeTacticalMatchup(mgrAlfo, mgrVannico, allManagers);
      const banter = formatTacticalDuelWhatsAppBanter(matchup);

      expect(banter).toContain('⚔️ *DUELLO TATTICO');
      expect(banter).toContain('Alfo');
      expect(banter).toContain('Vannico');
      expect(banter).toContain('🎭 *Scontro di Filosofie:*');
      expect(banter).toContain('📊 *Confronto 5 Assi Tattici:*');
      expect(banter).toContain('📜 *Precedenti in Campionato');
      expect(banter).toContain('💡 *Chiave del Match:*');
    });
  });

  describe('renderDualRadar5AxesSVG', () => {
    it('renders responsive SVG with 2 manager polygons and dashed 50% baseline', () => {
      const matchup = computeTacticalMatchup(mgrAlfo, mgrVannico, allManagers);
      const svg = renderDualRadar5AxesSVG(
        matchup.profileA,
        matchup.profileB,
        mgrAlfo.name,
        mgrVannico.name,
        440,
        305
      );

      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox="0 0 440 305"');
      expect(svg).toContain('stroke-dasharray="5 3"'); // League baseline
      expect(svg).toContain('var(--h2h-contender-a, #f59e0b)'); // Manager A fill or stroke
      expect(svg).toContain('var(--h2h-contender-b, #06b6d4)'); // Manager B fill or stroke
      expect(svg).toContain('POTENZA');
      expect(svg).toContain('CINISMO');
      expect(svg).toContain('FORTUNA');
      expect(svg).toContain('STABILITÀ');
      expect(svg).toContain('COPPE');
    });
  });

  describe('renderPrecedentiCampionato', () => {
    it('renders 3-column scoreboard with big numbers', () => {
      const mockStats: HeadToHeadStats = {
        managerA: mgrAlfo,
        managerB: mgrVannico,
        winsA: 7,
        winsB: 4,
        ties: 2,
        sharedSeasonsCount: 5,
        duels: [],
        metricsA: {} as any,
        metricsB: {} as any,
        palmares: {} as any,
        narrativeVerdict: 'Sfida Storica'
      };

      const html = renderPrecedentiCampionato(mockStats, 'Alfo', 'Vannico');
      expect(html).toContain('Precedenti in Campionato');
      expect(html).toContain('5 Stagioni Condivise');
      expect(html).toContain('7');
      expect(html).toContain('4');
      expect(html).toContain('2');
      expect(html).toContain('Vittorie Alfo');
      expect(html).toContain('Vittorie Vannico');
      expect(html).toContain('Pareggi');
    });
  });

  describe('renderChiaveTattica', () => {
    it('renders lightbulb card with tactical headline and description', () => {
      const tacticalKey = {
        headline: 'Potenza di Fuoco vs Freddezza da Coppe',
        description: 'Alfo domina per fanta-media offensiva, mentre Vannico punta sulla regolarità.',
        edgeA: '+15.2% FP',
        edgeB: '3 Finali Vinte'
      };

      const html = renderChiaveTattica(tacticalKey);
      expect(html).toContain('fa-lightbulb');
      expect(html).toContain('Potenza di Fuoco vs Freddezza da Coppe');
      expect(html).toContain('Alfo domina per fanta-media offensiva');
    });
  });

  describe('renderHeadToHeadMatchupView', () => {
    it('renders unified single tab containing Hero, Dual Radar, Precedenti, and Chiave Tattica in strict vertical order', () => {
      const mockStats: HeadToHeadStats = {
        managerA: mgrAlfo,
        managerB: mgrVannico,
        winsA: 5,
        winsB: 3,
        ties: 1,
        sharedSeasonsCount: 4,
        duels: [],
        metricsA: {} as any,
        metricsB: {} as any,
        palmares: {} as any,
        narrativeVerdict: 'Sfida Equilibrata'
      };

      const html = renderHeadToHeadMatchupView(mockStats, allManagers);

      // Verify all components exist
      expect(html).toContain('Radar Tattico a 5 Assi');
      expect(html).toContain('Precedenti in Campionato');
      expect(html).toContain('Chiave Tattica');
      expect(html).toContain('Esporta Story 9:16 Duello');
      expect(html).toContain('Copia Banter WhatsApp');

      // Verify ordering: Precedenti in Campionato must appear before Chiave Tattica
      const posRadar = html.indexOf('Radar Tattico a 5 Assi');
      const posPrecedenti = html.indexOf('Precedenti in Campionato');
      const posChiave = html.indexOf('fa-lightbulb');
      const posButtons = html.indexOf('Esporta Story 9:16 Duello');

      expect(posRadar).toBeLessThan(posPrecedenti);
      expect(posPrecedenti).toBeLessThan(posChiave);
      expect(posChiave).toBeLessThan(posButtons);
    });
  });

  describe('renderH2HDuelStoryCanvas', () => {
    it('creates a 1080x1920 canvas for vertical social stories', async () => {
      const canvas = await renderH2HDuelStoryCanvas(mgrAlfo, mgrVannico);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(1080);
      expect(canvas.height).toBe(1920);
    });
  });
});
