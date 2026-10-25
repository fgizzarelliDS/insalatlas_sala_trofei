import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  openTrophyModal,
  closeTrophyModal,
  switchTrophyModalTab,
  shareTrophyWhatsApp,
  toggleTrophyShareDropdown,
  closeTrophyShareDropdown,
  exportTrophyModalHD,
  copyTrophyModalToClipboard,
  renderScudettiRollHTML,
  renderCupsContent,
  renderMundialitoContent,
  renderSpoonsContent,
  renderCartonatoContent,
  renderSeasonsOverviewRollHTML,
  getTrophyHeaderConfig
} from '@/components/modals/trophy';
import { getTrophyParamFromURL } from '@/router';
import { LEAGUE } from '@/config';
import { state } from '@/state';
import type { Manager, CompetitionRecord } from '@/types';
import dataJson from '../../public/data.json';

class MockDOMElement {
  id: string;
  innerHTML: string = '';
  style: Record<string, string> = {};
  classes = new Set<string>();

  constructor(id: string) {
    this.id = id;
  }

  get classList() {
    return {
      add: (...c: string[]) => c.forEach(cls => this.classes.add(cls)),
      remove: (...c: string[]) => c.forEach(cls => this.classes.delete(cls)),
      contains: (cls: string) => this.classes.has(cls),
      toggle: (cls: string, force?: boolean) => {
        if (force === undefined) {
          if (this.classes.has(cls)) this.classes.delete(cls);
          else this.classes.add(cls);
        } else if (force) {
          this.classes.add(cls);
        } else {
          this.classes.delete(cls);
        }
      }
    };
  }
}

describe('Interactive Trophy Modals & Roll of Honor Suite', () => {
  let mockRoot: MockDOMElement;
  let mockDropdown: MockDOMElement;
  let mockDialog: MockDOMElement;
  let originalDocument: unknown;
  let originalWindow: unknown;

  beforeEach(() => {
    state.managers = (dataJson.leagueData || (dataJson as any).managers) as Manager[];
    state.competitions = (dataJson.competitions || []) as CompetitionRecord[];

    originalDocument = (globalThis as unknown as { document?: unknown }).document;
    originalWindow = (globalThis as unknown as { window?: unknown }).window;

    mockRoot = new MockDOMElement('trophy-history-modal');
    mockRoot.classList.add('hidden');

    mockDropdown = new MockDOMElement('trophy-share-dropdown-menu');
    mockDropdown.classList.add('hidden');

    mockDialog = new MockDOMElement('trophy-history-dialog');

    (globalThis as unknown as { document: unknown }).document = {
      body: { style: {} },
      getElementById: (id: string) => {
        if (id === 'trophy-history-modal') return mockRoot;
        if (id === 'trophy-share-dropdown-menu') return mockDropdown;
        if (id === 'trophy-history-dialog') return mockDialog;
        return null;
      }
    };

    if (!(globalThis as unknown as { window?: unknown }).window) {
      (globalThis as unknown as { window: unknown }).window = {
        open: () => null,
        addEventListener: () => null,
        removeEventListener: () => null
      };
    }
  });

  afterEach(() => {
    closeTrophyModal(false);
    (globalThis as unknown as { document?: unknown }).document = originalDocument;
    (globalThis as unknown as { window?: unknown }).window = originalWindow;
    vi.restoreAllMocks();
  });

  describe('getTrophyParamFromURL (Router Extraction)', () => {
    it('extracts valid trophy parameter from query string', () => {
      const res = getTrophyParamFromURL('https://example.com/?trophy=mundialito');
      expect(res).toEqual({ trophy: 'mundialito', sub: undefined });
    });

    it('extracts cups parameter with sub-tab', () => {
      const res = getTrophyParamFromURL('https://example.com/?trophy=cups&sub=supercoppa');
      expect(res).toEqual({ trophy: 'cups', sub: 'supercoppa' });
    });

    it('extracts from hash query', () => {
      const res = getTrophyParamFromURL('https://example.com/#?trophy=scudetti');
      expect(res).toEqual({ trophy: 'scudetti', sub: undefined });
    });

    it('returns null for unknown trophy keys', () => {
      expect(getTrophyParamFromURL('https://example.com/?trophy=ballondor')).toBeNull();
      expect(getTrophyParamFromURL('https://example.com/')).toBeNull();
    });
  });

  describe('Trophy Modal Header Configs', () => {
    it('returns proper metadata for scudetti', () => {
      const cfg = getTrophyHeaderConfig('scudetti');
      expect(cfg.icon).toBe('🥇');
      expect(cfg.title).toContain("Albo d'Oro Scudetti");
    });

    it('returns proper metadata for mundialito', () => {
      const cfg = getTrophyHeaderConfig('mundialito');
      expect(cfg.icon).toBe('🌍');
      expect(cfg.title).toContain('Mundialito');
    });

    it('distinguishes coppa vs supercoppa header metadata', () => {
      const coppa = getTrophyHeaderConfig('cups', 'coppa');
      expect(coppa.icon).toBe('🏆');
      expect(coppa.title).toContain(LEAGUE.competitions.cup.title || 'Coppa');

      const supercup = getTrophyHeaderConfig('cups', 'supercoppa');
      expect(supercup.icon).toBe('⭐');
      expect(supercup.title).toContain('Supercoppa');
    });
  });

  describe('Trophy Content Renderers (Real Historical League Data)', () => {
    it('renders Scudetti Roll of Honor without in-progress editions and without gap badges', () => {
      const html = renderScudettiRollHTML(state.competitions, state.managers);
      expect(html).toContain('🥇 Campione');
      expect(html).toContain('🥈 2° Posto');
      expect(html).toContain('🥉 3° Posto');
      // In Corso must NOT be in Scudetti roll
      expect(html).not.toContain('In Corso');
      // Gap badge "+X pt sul 2°" must be removed
      expect(html).not.toContain('sul 2°');
      // Points for league standings are kept
      expect(html).toContain('pt');
    });

    it('renders Coppa di Lega finals strictly containing configured cup title without Supercoppa, Perdenti, in-progress or unnecessary points', () => {
      const html = renderCupsContent('coppa', state.competitions, state.managers);
      expect(html).toContain('🏆 Vincitore');
      expect(html).toContain('🥈 Finalista');
      expect(html).toContain(LEAGUE.competitions.cup.title || 'Coppa');
      expect(html).not.toContain('Coppa dei Perdenti');
      expect(html).not.toContain('Supercoppa');
      expect(html).not.toContain('In Corso');
      expect(html).not.toContain('<span class="text-[9px] font-normal opacity-70">pt</span>');
    });

    it('renders Supercoppa finals without in-progress and without unnecessary points', () => {
      const html = renderCupsContent('supercoppa', state.competitions, state.managers);
      expect(html).toContain('🏆 Vincitore');
      expect(html).toContain('🥈 Finalista');
      expect(html).not.toContain('In Corso');
      expect(html).not.toContain('<span class="text-[9px] font-normal opacity-70">pt</span>');
    });

    it('renders Mundialito editions without in-progress and without unnecessary points', () => {
      const html = renderMundialitoContent(state.competitions, state.managers);
      expect(html).toContain('🌍 Vincitore');
      expect(html).toContain('🥈 Finalista');
      expect(html).not.toContain('In Corso');
      expect(html).not.toContain('<span class="text-[9px] font-normal opacity-70">pt</span>');
    });

    it('renders Cucchiai di Legno wall of shame without in-progress, without redundant Ultimo Posto label and without unnecessary points', () => {
      const html = renderSpoonsContent(state.competitions, state.managers);
      expect(html).toContain('🥄');
      expect(html).toContain('Cucchiaio');
      expect(html).not.toContain('Ultimo Posto');
      expect(html).not.toContain('In Corso');
      expect(html).not.toContain('<span class="text-[9px] font-normal opacity-70">pt</span>');
    });

    it('renders Cartonati and Playout banners without in-progress', () => {
      const html = renderCartonatoContent(state.competitions, state.managers);
      expect(html).toContain('📦');
      expect(html).toContain('Banner Cartonato');
      expect(html).not.toContain('In Corso');
    });

    it('renders Seasons Overview Roll of Honor, retaining In Corso for 26/27 with hyphens for unassigned titles', () => {
      const html = renderSeasonsOverviewRollHTML(state.competitions, state.managers);
      expect(html).toContain('Stagione');
      expect(html).toContain('Scudetto');
      expect(html).toContain('Coppa');
      expect(html).toContain('Supercoppa');
      expect(html).toContain('Mundialito');
      // The Seasons Overview is the ONLY modal that keeps In Corso
      expect(html).toContain('In Corso');

      // Ongoing season card must NOT assign provisional titles with hyphens for unassigned
      const season2627Block = html.split('Stagione 2026/27')[1]?.split('Stagione 2025/26')[0] || '';
      if (season2627Block) {
        expect(season2627Block).toContain('In Corso');
        expect(season2627Block).toContain('>-<');
      }
    });
  });

  describe('Trophy Modal Lifecycle & Controller', () => {
    it('opens and closes trophy modal in DOM with export dropdown', () => {
      openTrophyModal('mundialito', undefined, false);
      expect(mockRoot.classList.contains('hidden')).toBe(false);
      expect(mockRoot.innerHTML).toContain('Albo d’Oro Mundialito');
      expect(mockRoot.innerHTML).toContain('btn-trophy-share-dropdown');
      expect(mockRoot.innerHTML).toContain('trophy-share-dropdown-menu');

      closeTrophyModal(false);
      expect(mockRoot.classList.contains('hidden')).toBe(true);
      expect(mockRoot.innerHTML).toBe('');
    });

    it('switches sub-tabs within cups modal', () => {
      openTrophyModal('cups', 'coppa', false);
      expect(mockRoot.innerHTML).toContain(LEAGUE.competitions.cup.title || 'Coppa');

      switchTrophyModalTab('supercoppa');
      expect(mockRoot.innerHTML).toContain('Supercoppa');
    });

    it('toggles and closes trophy share dropdown menu', () => {
      toggleTrophyShareDropdown();
      expect(mockDropdown.classList.contains('hidden')).toBe(false);

      closeTrophyShareDropdown();
      expect(mockDropdown.classList.contains('hidden')).toBe(true);
    });

    it('handles HD export and clipboard copy gracefully when modal dialog is present or absent', async () => {
      // Missing dialog
      (globalThis as unknown as { document: { getElementById: (id: string) => unknown } }).document.getElementById = () => null;
      await expect(exportTrophyModalHD()).resolves.toBeUndefined();
      const res = await copyTrophyModalToClipboard();
      expect(res).toBe(false);
    });

    it('triggers WhatsApp sharing window with formatted message', () => {
      const openSpy = vi.fn();
      ((globalThis as unknown as { window: { open: unknown } }).window).open = openSpy;
      shareTrophyWhatsApp('scudetti');
      expect(openSpy).toHaveBeenCalled();
      const calledUrl = openSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('whatsapp.com');
      expect(decodeURIComponent(calledUrl)).toContain('Scudetti');
    });

    it('excludes ongoing season (26/27) from the career bump chart timeline', async () => {
      const { renderRankTrajectorySparkline } = await import('@/components/modals/profile');
      const managerWithHistory = state.managers.find(m => m.history && m.history.some(h => !h.in_progress));
      expect(managerWithHistory).toBeDefined();
      const svg = renderRankTrajectorySparkline(managerWithHistory!.history || []);
      expect(svg).not.toContain('26/27');
    });

    it('attaches openProfileModal directly to entire podium and participant cards (card clickability)', () => {
      const scudettiHTML = renderScudettiRollHTML(state.competitions, state.managers);
      // Entire card has onclick="window.openProfileModal
      expect(scudettiHTML).toContain('onclick="window.openProfileModal && window.openProfileModal(');
      expect(scudettiHTML).toContain('title="Apri scheda profilo di');

      const cupsHTML = renderCupsContent('coppa', state.competitions, state.managers);
      expect(cupsHTML).toContain('onclick="window.openProfileModal && window.openProfileModal(');
      expect(cupsHTML).toContain('title="Apri scheda profilo di');
    });

    it('provides both sleek compact mobile layout with manager & team stacked next to crest and exact desktop layout', () => {
      const scudettiHTML = renderScudettiRollHTML(state.competitions, state.managers);
      // Mobile sleek container
      expect(scudettiHTML).toContain('flex sm:hidden items-center justify-between');
      // Desktop preserved container
      expect(scudettiHTML).toContain('hidden sm:flex flex-col justify-between');
      // Compact stacked 2-line layout without max-w-[85px]
      expect(scudettiHTML).toContain('leading-tight');
      expect(scudettiHTML).not.toContain('max-w-[85px]');
    });

    it('ensures manager profile modal has z-[90] to layer in front of trophy modal z-[80]', async () => {
      const { getProfileModalShellHTML } = await import('@/components/modals/profile/ProfileModalShell');
      const html = getProfileModalShellHTML();
      expect(html).toContain('z-[90]');
    });

    it('verifies ALBO_COLUMNS order with Cucchiaio at Column 6 between Mundialito and Cartonato when enabled', async () => {
      const { ALBO_COLUMNS } = await import('@/config');
      const spoonCol = ALBO_COLUMNS.find(c => c.key === 'spoon');
      if (spoonCol) {
        expect(spoonCol.order).toBe(6);
        expect(spoonCol.titleKey).toBe('col6');
      }
      // Order must be strictly ascending
      for (let i = 1; i < ALBO_COLUMNS.length; i++) {
        expect(ALBO_COLUMNS[i].order).toBeGreaterThan(ALBO_COLUMNS[i - 1].order);
      }
    });

    it('computes dynamic badgeLabels in getTrophyHeaderConfig based on completed data', () => {
      const scudetti = getTrophyHeaderConfig('scudetti');
      expect(scudetti.badgeLabel).toMatch(/\d+ Edizioni Concluse/);

      const coppa = getTrophyHeaderConfig('cups', 'coppa');
      expect(coppa.badgeLabel).toMatch(/\d+ Coppe Assegnate/);

      const supercoppa = getTrophyHeaderConfig('cups', 'supercoppa');
      expect(supercoppa.badgeLabel).toMatch(/\d+ Supercoppe Assegnate/);

      const mundialito = getTrophyHeaderConfig('mundialito');
      expect(mundialito.badgeLabel).toMatch(/\d+ Edizioni Concluse/);

      const spoons = getTrophyHeaderConfig('spoons');
      expect(spoons.badgeLabel).toMatch(/\d+ Cucchiai Assegnati/);

      const cartonato = getTrophyHeaderConfig('cartonato');
      expect(cartonato.badgeLabel).toMatch(/\d+ Cartonati Assegnati/);
    });
  });
});


