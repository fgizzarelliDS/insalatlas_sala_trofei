import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '@/state';
import type { Manager } from '@/types';
import dataJson from '../../public/data.json';
import {
  getMainTabParamFromURL,
  getSeasonParamFromURL,
  getRecordParamFromURL,
  getSearchParamFromURL,
  getManagerParamFromURL,
  getH2HParamFromURL,
  findManagerByParam,
  getRecordCategoryParamFromURL
} from '@/router';
import { switchMainViewTab, selectArchiveSeason } from '@/components/board/seasons';
import { filterRecordsCategory, searchRecords, clearRecordsSearch } from '@/components/board/records';

describe('Exhaustive URL & Deep-Linking Test Matrix', () => {
  beforeEach(() => {
    state.managers = dataJson.leagueData as unknown as Manager[];
  });
  describe('1. Root and Default URLs', () => {
    it('handles root URL cleanly', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/';
      expect(getMainTabParamFromURL(url)).toBeNull();
      expect(getSeasonParamFromURL(url)).toBeNull();
      expect(getRecordParamFromURL(url)).toBeNull();
      expect(getManagerParamFromURL(url)).toBeNull();
      expect(getH2HParamFromURL(url)).toBeNull();
    });

    it('handles explicit ?tab=albo URL', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/?tab=albo';
      expect(getMainTabParamFromURL(url)).toBe('albo');
      expect(getSeasonParamFromURL(url)).toBeNull();
      expect(getRecordParamFromURL(url)).toBeNull();
    });
  });

  describe('2. Seasons Archive URLs', () => {
    it('handles ?tab=seasons without season parameter', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/?tab=seasons';
      expect(getMainTabParamFromURL(url)).toBe('seasons');
      expect(getSeasonParamFromURL(url)).toBeNull();
    });

    it('handles ?tab=seasons&season=2024-25 with hyphenated season', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/?tab=seasons&season=2024-25';
      expect(getMainTabParamFromURL(url)).toBe('seasons');
      expect(getSeasonParamFromURL(url)).toBe('2024/25');
    });

    it('handles ?tab=seasons&season=2023%2F24 with encoded slash', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/?tab=seasons&season=2023%2F24';
      expect(getMainTabParamFromURL(url)).toBe('seasons');
      expect(getSeasonParamFromURL(url)).toBe('2023/24');
    });

    it('infers seasons tab when ?season= is provided alone', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/?season=2018-19';
      expect(getMainTabParamFromURL(url)).toBe('seasons');
      expect(getSeasonParamFromURL(url)).toBe('2018/19');
    });
  });

  describe('3. Records & Primati Storici URLs & Category Filters', () => {
    it('handles ?tab=records without record ID', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/?tab=records';
      expect(getMainTabParamFromURL(url)).toBe('records');
      expect(getRecordParamFromURL(url)).toBeNull();
      expect(getRecordCategoryParamFromURL(url)).toBeNull();
    });

    it('parses each exact technical category parameter', () => {
      expect(getRecordCategoryParamFromURL('https://insalatlas.it/?tab=records&category=points')).toBe('points');
      expect(getRecordCategoryParamFromURL('https://insalatlas.it/?tab=records&category=titles')).toBe('titles');
      expect(getRecordCategoryParamFromURL('https://insalatlas.it/?tab=records&category=h2h')).toBe('h2h');
      expect(getRecordCategoryParamFromURL('https://insalatlas.it/?tab=records&category=streaks')).toBe('streaks');
      expect(getRecordCategoryParamFromURL('https://insalatlas.it/?tab=records&category=banter')).toBe('banter');
      expect(getRecordCategoryParamFromURL('https://insalatlas.it/?tab=records&category=all')).toBe('all');
    });

    it('supports short ?cat= parameter and infers records tab', () => {
      const url = 'https://insalatlas.it/?cat=points';
      expect(getMainTabParamFromURL(url)).toBe('records');
      expect(getRecordCategoryParamFromURL(url)).toBe('points');
    });

    it('rejects invalid or unsupported category values', () => {
      expect(getRecordCategoryParamFromURL('https://insalatlas.it/?category=invalid_cat')).toBeNull();
      expect(getRecordCategoryParamFromURL('https://insalatlas.it/?category=123')).toBeNull();
    });

    it('handles ?record=most_cups alone and infers records tab', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/?record=most_cups';
      expect(getMainTabParamFromURL(url)).toBe('records');
      expect(getRecordParamFromURL(url)).toBe('most_cups');
      expect(getRecordCategoryParamFromURL(url)).toBeNull();
    });

    it('handles combined ?tab=records&category=titles&record=most_cups', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/?tab=records&category=titles&record=most_cups';
      expect(getMainTabParamFromURL(url)).toBe('records');
      expect(getRecordCategoryParamFromURL(url)).toBe('titles');
      expect(getRecordParamFromURL(url)).toBe('most_cups');
    });

    it('synchronizes browser URL when filterRecordsCategory is clicked', () => {
      if (typeof window !== 'undefined' && window.location) {
        window.history.pushState({}, '', 'https://insalatlas.it/?tab=records');

        filterRecordsCategory('points', true);
        expect(window.location.search).toContain('tab=records');
        expect(window.location.search).toContain('category=points');
        expect(getRecordCategoryParamFromURL()).toBe('points');

        filterRecordsCategory('all', true);
        expect(window.location.search).toBe('?tab=records');
        expect(getRecordCategoryParamFromURL()).toBeNull();
      }
    });

    it('extracts ?q= query parameter for Hall of Fame search', () => {
      const url = 'https://fgizzarellids.github.io/insalatlas_sala_trofei/?tab=records&q=alfo';
      expect(getSearchParamFromURL(url)).toBe('alfo');
    });

    it('extracts ?q= from hash query', () => {
      const url = 'https://fgizzarellids.github.io/insalatlas_sala_trofei/#?q=steven%20bradbury';
      expect(getSearchParamFromURL(url)).toBe('steven bradbury');
    });

    it('synchronizes ?q= when searchRecords and clearRecordsSearch are called', () => {
      if (typeof window !== 'undefined' && window.location) {
        window.history.pushState({}, '', 'https://insalatlas.it/?tab=records');

        searchRecords('alfo', true);
        expect(window.location.search).toContain('tab=records');
        expect(window.location.search).toContain('q=alfo');
        expect(getSearchParamFromURL()).toBe('alfo');

        clearRecordsSearch();
        expect(window.location.search).not.toContain('q=');
        expect(getSearchParamFromURL()).toBeNull();
      }
    });
  });

  describe('4. Manager Profile URLs', () => {
    it('extracts manager by ID', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/?manager=m_lucchetto';
      expect(getManagerParamFromURL(url)).toBe('m_lucchetto');
    });

    it('extracts manager by name with URL encoding', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/?manager=Gigi%20%26%20Dr.Cholo';
      expect(getManagerParamFromURL(url)).toBe('Gigi & Dr.Cholo');
    });

    it('finds manager correctly with findManagerByParam', () => {
      expect(findManagerByParam('m_lucchetto')?.name).toBe('Lucchetto');
      expect(findManagerByParam('Lucchetto')?.id).toBe('m_lucchetto');
      expect(findManagerByParam('makako')?.id).toBe('m_makako');
      expect(findManagerByParam('inexistent_manager_xyz')).toBeUndefined();
    });
  });

  describe('5. Head-to-Head (H2H) Comparison URLs', () => {
    it('extracts duel manager pair by IDs', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/?h2h=m_makako:m_lucchetto';
      const h2h = getH2HParamFromURL(url);
      expect(h2h).not.toBeNull();
      expect(h2h?.managerA).toBe('m_makako');
      expect(h2h?.managerB).toBe('m_lucchetto');
    });

    it('extracts duel manager pair by names', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/?h2h=Vannico:Alfo';
      const h2h = getH2HParamFromURL(url);
      expect(h2h).not.toBeNull();
      expect(h2h?.managerA).toBe('Vannico');
      expect(h2h?.managerB).toBe('Alfo');
    });

    it('extracts duel manager pair using _vs_ separator', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/?h2h=Alfo_vs_Gigi';
      const h2h = getH2HParamFromURL(url);
      expect(h2h).not.toBeNull();
      expect(h2h?.managerA).toBe('Alfo');
      expect(h2h?.managerB).toBe('Gigi');
    });

    it('extracts duel manager pair using -vs- separator', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/?h2h=m_alfo-vs-m_gigi';
      const h2h = getH2HParamFromURL(url);
      expect(h2h).not.toBeNull();
      expect(h2h?.managerA).toBe('m_alfo');
      expect(h2h?.managerB).toBe('m_gigi');
    });

    it('extracts duel manager pair inside hash with _vs_', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/#?h2h=Alfo_vs_Gigi';
      const h2h = getH2HParamFromURL(url);
      expect(h2h).not.toBeNull();
      expect(h2h?.managerA).toBe('Alfo');
      expect(h2h?.managerB).toBe('Gigi');
    });
  });

  describe('6. Composite & Combined Query URLs', () => {
    it('handles manager profile combined with seasons tab and season', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/?manager=m_lucchetto&tab=seasons&season=2024-25';
      expect(getManagerParamFromURL(url)).toBe('m_lucchetto');
      expect(getMainTabParamFromURL(url)).toBe('seasons');
      expect(getSeasonParamFromURL(url)).toBe('2024/25');
    });

    it('handles H2H duel combined with records tab and specific record', () => {
      const url = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/?h2h=m_makako:m_lucchetto&tab=records&record=most_cups';
      const h2h = getH2HParamFromURL(url);
      expect(h2h?.managerA).toBe('m_makako');
      expect(h2h?.managerB).toBe('m_lucchetto');
      expect(getMainTabParamFromURL(url)).toBe('records');
      expect(getRecordParamFromURL(url)).toBe('most_cups');
    });
  });

  describe('7. Hash-based Routing URLs', () => {
    it('extracts tabs from hash path', () => {
      expect(getMainTabParamFromURL('https://insalatlas.it/#/seasons')).toBe('seasons');
      expect(getMainTabParamFromURL('https://insalatlas.it/#seasons')).toBe('seasons');
      expect(getMainTabParamFromURL('https://insalatlas.it/#/records')).toBe('records');
      expect(getMainTabParamFromURL('https://insalatlas.it/#records')).toBe('records');
      expect(getMainTabParamFromURL('https://insalatlas.it/#/albo')).toBe('albo');
      expect(getMainTabParamFromURL('https://insalatlas.it/#albo')).toBe('albo');
    });

    it('extracts query parameters inside hash query strings', () => {
      expect(getMainTabParamFromURL('https://insalatlas.it/#/view?tab=records')).toBe('records');
      expect(getRecordParamFromURL('https://insalatlas.it/#/view?record=most_scudetti')).toBe('most_scudetti');
      expect(getSeasonParamFromURL('https://insalatlas.it/#/view?season=2022-23')).toBe('2022/23');
      expect(getManagerParamFromURL('https://insalatlas.it/#/profile?manager=m_valery')).toBe('m_valery');
      expect(getH2HParamFromURL('https://insalatlas.it/#/duel?h2h=m_sebba:m_vannico')?.managerA).toBe('m_sebba');
    });
  });

  describe('8. Edge Cases, Malformed and Empty URLs', () => {
    it('returns null for empty string or invalid URL format', () => {
      expect(getMainTabParamFromURL('')).toBeNull();
      expect(getSeasonParamFromURL('')).toBeNull();
      expect(getRecordParamFromURL('')).toBeNull();
      expect(getManagerParamFromURL('')).toBeNull();
      expect(getH2HParamFromURL('')).toBeNull();
    });

    it('returns null for unknown tabs or unrelated params', () => {
      expect(getMainTabParamFromURL('https://insalatlas.it/?tab=stats')).toBeNull();
      expect(getMainTabParamFromURL('https://insalatlas.it/?foo=bar')).toBeNull();
      expect(getSeasonParamFromURL('https://insalatlas.it/?tab=seasons')).toBeNull();
      expect(getRecordParamFromURL('https://insalatlas.it/?tab=records')).toBeNull();
    });

    it('handles empty param values gracefully', () => {
      expect(getMainTabParamFromURL('https://insalatlas.it/?tab=')).toBeNull();
      expect(getSeasonParamFromURL('https://insalatlas.it/?season=')).toBeNull();
      expect(getRecordParamFromURL('https://insalatlas.it/?record=')).toBeNull();
      expect(getManagerParamFromURL('https://insalatlas.it/?manager=')).toBeNull();
      expect(getH2HParamFromURL('https://insalatlas.it/?h2h=')).toBeNull();
      expect(getH2HParamFromURL('https://insalatlas.it/?h2h=singleidwithoutcolon')).toBeNull();
    });
  });

  describe('9. Browser History State Synchronization Lifecycle', () => {
    it('transitions across tabs and verifies history URL state', () => {
      if (typeof window === 'undefined' || !window.location) return;

      // Start on Albo d'Oro
      window.history.pushState({}, '', 'https://insalatlas.it/');
      expect(window.location.search).toBe('');

      // Go to Records tab
      switchMainViewTab('records', true);
      expect(window.location.search).toBe('?tab=records');
      expect(getMainTabParamFromURL()).toBe('records');

      // Go to Seasons tab and select 2024/25
      switchMainViewTab('seasons', true);
      expect(window.location.search).toContain('tab=seasons');

      selectArchiveSeason('2024/25', true);
      expect(window.location.search).toBe('?tab=seasons&season=2024-25');
      expect(getSeasonParamFromURL()).toBe('2024/25');

      // Switch to another season
      selectArchiveSeason('2023/24', true);
      expect(window.location.search).toBe('?tab=seasons&season=2023-24');
      expect(getSeasonParamFromURL()).toBe('2023/24');

      // Return to Albo d'Oro
      switchMainViewTab('albo', true);
      expect(window.location.search).toBe('');
      expect(getMainTabParamFromURL()).toBeNull();
    });
  });

  describe('10. Navigate to Home Feature (Brand & Cup Header Navigation)', () => {
    it('resets URL search params, switches to Albo tab, and scrolls to top', async () => {
      const { navigateToHome } = await import('@/components/board/tableBoard');
      const { switchMainViewTab } = await import('@/components/board/seasons');

      if (typeof window === 'undefined' || !window.location) return;

      // Simulate being on records tab with URL parameters
      switchMainViewTab('records', true);
      window.history.pushState({}, '', 'https://insalatlas.it/?tab=records&q=makako');
      expect(window.location.search).toBe('?tab=records&q=makako');

      let scrolledTo: any = null;
      window.scrollTo = (opts: any) => {
        scrolledTo = opts;
      };

      await navigateToHome();

      // Verified smooth scroll to top
      expect(scrolledTo).toEqual({ top: 0, behavior: 'smooth' });
      // Verified URL cleared
      expect(window.location.search).toBe('');
    });

    it('handles brand home clicks respecting active edit mode on editable fields', async () => {
      const { handleBrandHomeClick } = await import('@/components/board/tableBoard');
      const { state } = await import('@/state');

      if (typeof window === 'undefined') return;

      let scrolledTo: any = null;
      window.scrollTo = (opts: any) => {
        scrolledTo = opts;
      };

      // 1. Normal mode (not editing): clicking anywhere on brand navigates home
      state.isEditMode = false;
      const normalEvent = {
        target: { isContentEditable: false },
        stopPropagation: () => {}
      };
      handleBrandHomeClick(normalEvent as any);
      expect(scrolledTo).toEqual({ top: 0, behavior: 'smooth' });

      // 2. Edit mode active: clicking a contenteditable title span does NOT navigate
      scrolledTo = null;
      state.isEditMode = true;
      const editTitleEvent = {
        target: { isContentEditable: true },
        stopPropagation: () => {}
      };
      handleBrandHomeClick(editTitleEvent as any);
      expect(scrolledTo).toBeNull();

      // 3. Edit mode active: clicking the trophy icon (not contenteditable) DOES navigate home
      scrolledTo = null;
      const editCupEvent = {
        target: { isContentEditable: false },
        stopPropagation: () => {}
      };
      handleBrandHomeClick(editCupEvent as any);
      expect(scrolledTo).toEqual({ top: 0, behavior: 'smooth' });

      // Restore
      state.isEditMode = false;
    });

    it('verifies index.html has brand header and palmares favicon linked to Home', async () => {
      const indexHtml = (await import('../../index.html?raw')).default;

      // Header brand
      expect(indexHtml).toContain('id="league-brand-header"');
      expect(indexHtml).toContain('handleBrandHomeClick');

      // Favicon logo in board
      expect(indexHtml).toContain('favicon-512x512.png');
      expect(indexHtml).toContain('navigateToHome');
    });
  });
});

