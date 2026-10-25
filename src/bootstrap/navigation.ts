import {
  openProfileModal,
  closeProfileModal,
  openHeadToHeadModal,
  closeHeadToHeadModal,
  openMultiManagerModal,
  openTrophyModal,
  closeTrophyModal,
  openEloModal,
  closeEloModal
} from '@/components/modals';
import {
  switchMainViewTab,
  selectArchiveSeason,
  openTeamMatchesModal,
  closeTeamMatchesModal,
  switchLiveStandingsView
} from '@/components/board/seasonsArchive';
import {
  filterRecordsCategory,
  searchRecords
} from '@/components/board/records';
import {
  findManagerByParam,
  getManagerParamFromURL,
  getH2HParamFromURL,
  getMultiH2HParamFromURL,
  getRecordParamFromURL,
  getSearchParamFromURL,
  getMainTabParamFromURL,
  getSeasonParamFromURL,
  getRecordCategoryParamFromURL,
  getTrophyParamFromURL,
  getTeamParamFromURL,
  getViewParamFromURL,
  getURLParam
} from '@/router';

/**
 * Parses URL query parameters on initial application load and opens the relevant
 * modal, deep-linked tab, or filtered view.
 */
export async function handleInitialDeepLinking(): Promise<void> {
  // Deep-linking: auto-open Elo Modal if ?modal=elo in URL
  const modalParam = getURLParam('modal');
  if (modalParam === 'elo' || getURLParam('elo') !== null) {
    const eloTab = (getURLParam('tab') || 'trajectories') as any;
    const eloMode = getURLParam('elo_mode') as any;
    const season = getURLParam('season') || undefined;
    openEloModal(eloTab, eloMode, season);
  }

  // Deep-linking: auto-open manager profile if ?manager=... in URL
  const managerParam = getManagerParamFromURL();
  if (managerParam) {
    const found = findManagerByParam(managerParam);
    if (found) {
      openProfileModal(found.id);
    }
  }

  // Deep-linking: auto-open multi-manager or H2H comparison
  const multiH2HParam = getMultiH2HParamFromURL();
  if (multiH2HParam) {
    const validIds = multiH2HParam
      .map(p => findManagerByParam(p)?.id)
      .filter((id): id is string => Boolean(id));
    if (validIds.length >= 2) {
      openMultiManagerModal(validIds);
    }
  } else {
    const h2hParam = getH2HParamFromURL();
    if (h2hParam) {
      const foundA = findManagerByParam(h2hParam.managerA);
      const foundB = findManagerByParam(h2hParam.managerB);
      if (foundA && foundB) {
        openHeadToHeadModal(foundA.id, foundB.id);
      }
    }
  }

  // Deep-linking: auto-open Trophy History Modal if ?trophy=... in URL
  const trophyParam = getTrophyParamFromURL();
  if (trophyParam) {
    openTrophyModal(trophyParam.trophy, trophyParam.sub, false);
  }

  // Deep-linking: auto-open and highlight record in Hall of Fame if ?record=... in URL
  const recordParam = getRecordParamFromURL();
  const categoryParam = getRecordCategoryParamFromURL();

  if (recordParam) {
    if (categoryParam) {
      filterRecordsCategory(categoryParam, false);
    } else {
      filterRecordsCategory('all', false);
    }
    switchMainViewTab('records', false);
    setTimeout(() => {
      const card = document.getElementById(`record-card-${recordParam}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('ring-2', 'ring-amber-500', 'shadow-2xl');
        setTimeout(() => {
          card.classList.remove('ring-2', 'ring-amber-500', 'shadow-2xl');
        }, 2500);
      }
    }, 150);
  } else {
    // Navigation state restoration on refresh
    const mainTab = getMainTabParamFromURL();
    const teamParam = getTeamParamFromURL();
    const viewParam = getViewParamFromURL();

    if (mainTab === 'seasons' || teamParam || viewParam) {
      const seasonParam = getSeasonParamFromURL();
      if (seasonParam) {
        selectArchiveSeason(seasonParam, false);
      }
      switchMainViewTab('seasons', false);
      if (viewParam === 'merit') {
        switchLiveStandingsView('merit', false);
      }
      if (teamParam) {
        await openTeamMatchesModal(undefined, teamParam, false, false);
      }
    } else if (mainTab === 'records') {
      if (categoryParam) {
        filterRecordsCategory(categoryParam, false);
      }
      switchMainViewTab('records', false);
      const searchParam = getSearchParamFromURL();
      if (searchParam) {
        searchRecords(searchParam, false);
      }
    } else {
      const searchParam = getSearchParamFromURL();
      if (searchParam) {
        switchMainViewTab('records', false);
        searchRecords(searchParam, false);
      }
    }
  }
}

/**
 * Registers browser popstate (back/forward button) listener to synchronize
 * active modals, tabs, and filters with browser history.
 */
export function initPopstateNavigation(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('popstate', () => {
    const modalParam = getURLParam('modal');
    if (modalParam === 'elo' || getURLParam('elo') !== null) {
      const eloTab = (getURLParam('tab') || 'trajectories') as any;
      const eloMode = getURLParam('elo_mode') as any;
      const season = getURLParam('season') || undefined;
      openEloModal(eloTab, eloMode, season);
      return;
    }
    closeEloModal(false);

    const h2h = getH2HParamFromURL();
    if (h2h) {
      const foundA = findManagerByParam(h2h.managerA);
      const foundB = findManagerByParam(h2h.managerB);
      if (foundA && foundB) {
        closeProfileModal();
        openHeadToHeadModal(foundA.id, foundB.id);
        return;
      }
    }
    closeHeadToHeadModal();

    const p = getManagerParamFromURL();
    if (p) {
      const found = findManagerByParam(p);
      if (found) {
        openProfileModal(found.id);
        return;
      }
    }
    closeProfileModal();

    const trophyParam = getTrophyParamFromURL();
    if (trophyParam) {
      openTrophyModal(trophyParam.trophy, trophyParam.sub, false);
      return;
    }
    closeTrophyModal(false);

    const rec = getRecordParamFromURL();
    const cat = getRecordCategoryParamFromURL();
    if (rec) {
      if (cat) {
        filterRecordsCategory(cat, false);
      } else {
        filterRecordsCategory('all', false);
      }
      switchMainViewTab('records', false);
      setTimeout(() => {
        const card = document.getElementById(`record-card-${rec}`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('ring-2', 'ring-amber-500', 'shadow-2xl');
          setTimeout(() => {
            card.classList.remove('ring-2', 'ring-amber-500', 'shadow-2xl');
          }, 2500);
        }
      }, 150);
      return;
    }

    const teamParam = getTeamParamFromURL();
    if (teamParam) {
      openTeamMatchesModal(undefined, teamParam, false, false);
    } else {
      closeTeamMatchesModal(false);
    }

    const viewParam = getViewParamFromURL();
    if (viewParam === 'merit') {
      switchLiveStandingsView('merit', false);
    } else if (document.getElementById('live-view-merit-container') && !document.getElementById('live-view-merit-container')?.classList.contains('hidden')) {
      switchLiveStandingsView('real', false);
    }

    const targetTab = getMainTabParamFromURL() || 'albo';
    const q = getSearchParamFromURL();
    if (targetTab === 'seasons') {
      const seasonParam = getSeasonParamFromURL();
      if (seasonParam) {
        selectArchiveSeason(seasonParam, false);
      }
      switchMainViewTab('seasons', false);
    } else if (targetTab === 'records') {
      if (q) {
        switchMainViewTab('records', false);
        searchRecords(q, false);
      } else {
        filterRecordsCategory(cat || 'all', false);
        switchMainViewTab('records', false);
      }
    } else {
      switchMainViewTab(targetTab, false);
    }
  });
}
