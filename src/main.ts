import { applyTitlesToDOM } from '@/ui';
import { loadLeagueData } from '@/storage';
import { loadLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';
import { loadAnalyticsEloData } from '@/analytics/analyticsCore';
import {
  initModalMounts,
  initModalListeners,
  openSeasonModal,
  closeSeasonModal,
  saveSeason,
  changeSeasonTeamCount,
  handleFantacalcioPasteParse,
  handleFantacalcioFileUpload,
  handleFantacalcioUrlFetch,
  handleManagerSelectChange,
  toggleSeasonSection,
  openMultiManagerModal
} from '@/components/modals';
import {
  changeSort,
  toggleDisplayMode,
  renderBoard,
  dismissScrollHint,
  initResponsiveDisplayMode,
  initScrollHintListener,
  toggleAlboShareDropdown,
  closeAlboShareDropdown,
  exportAlboGraphicHD,
  copyAlboGraphicToClipboard,
  shareAlboGraphicWhatsApp,
  navigateToHome,
  handleBrandHomeClick
} from '@/components/board/tableBoard';
import { updateStatistics, renderTopStatsCards } from '@/components/board/statsCounter';
import {
  switchMainViewTab,
  selectArchiveSeason,
  renderSeasonsArchive,
  navigateToSeasonStandings
} from '@/components/board/seasonsArchive';
import {
  filterRecordsCategory,
  renderRecordsTab,
  toggleRecordShareDropdown,
  closeAllRecordShareDropdowns,
  exportRecordCard,
  copyRecordCard,
  togglePosterShareDropdown,
  closePosterShareDropdown,
  exportHallOfFamePoster,
  copyHallOfFamePoster,
  shareHallOfFamePosterWhatsApp
} from '@/components/board/records';
import {
  exportHallOfFamePosterHD,
  copyHallOfFamePosterToClipboard,
  sharePosterWhatsApp,
  exportAlboHD,
  copyAlboToClipboard,
  shareAlboWhatsApp,
  shareRecordWhatsApp
} from '@/export';
import {
  findManagerByParam,
  getManagerParamFromURL,
  getH2HParamFromURL,
  getMultiH2HParamFromURL,
  getRecordParamFromURL,
  getMainTabParamFromURL,
  getSeasonParamFromURL,
  getRecordCategoryParamFromURL,
  getTeamParamFromURL,
  getViewParamFromURL
} from '@/router';
import { initPWA, promptPWAInstall } from '@/pwa';
import {
  registerGlobalWindowHandlers,
  initDropdownClickOutsideListener,
  handleInitialDeepLinking,
  initPopstateNavigation
} from '@/bootstrap';

// Attach action handlers to window object immediately for inline HTML event handling
registerGlobalWindowHandlers();

/**
 * Application Bootstrap Sequence
 */
export async function initApp(): Promise<void> {
  initModalMounts();
  initModalListeners();
  initResponsiveDisplayMode();
  await loadLeagueData();
  // Prefetch live season details and dynamic Elo data eagerly
  loadLiveSeasonDetails().catch(() => {});
  loadAnalyticsEloData().catch(() => {});
  applyTitlesToDOM();
  renderBoard();
  renderTopStatsCards();
  updateStatistics();
  initScrollHintListener();
  initPWA();
  await handleInitialDeepLinking();
  initDropdownClickOutsideListener();
}

// Bootstrap execution
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
  initPopstateNavigation();
}

// Re-export router utilities, board controls, seasons archive, records, and PWA for unit tests and consumers
export {
  findManagerByParam,
  getManagerParamFromURL,
  getH2HParamFromURL,
  getMultiH2HParamFromURL,
  openMultiManagerModal,
  getRecordParamFromURL,
  getMainTabParamFromURL,
  getSeasonParamFromURL,
  getRecordCategoryParamFromURL,
  getTeamParamFromURL,
  getViewParamFromURL
};
export {
  changeSort,
  toggleDisplayMode,
  renderBoard,
  dismissScrollHint,
  toggleAlboShareDropdown,
  closeAlboShareDropdown,
  exportAlboGraphicHD,
  copyAlboGraphicToClipboard,
  shareAlboGraphicWhatsApp,
  navigateToHome,
  handleBrandHomeClick
};
export { switchMainViewTab, selectArchiveSeason, renderSeasonsArchive, navigateToSeasonStandings };
export {
  filterRecordsCategory,
  renderRecordsTab,
  toggleRecordShareDropdown,
  closeAllRecordShareDropdowns,
  exportRecordCard,
  copyRecordCard,
  shareRecordWhatsApp,
  togglePosterShareDropdown,
  closePosterShareDropdown,
  exportHallOfFamePoster,
  copyHallOfFamePoster,
  exportHallOfFamePosterHD,
  copyHallOfFamePosterToClipboard,
  sharePosterWhatsApp,
  shareHallOfFamePosterWhatsApp,
  exportAlboHD,
  copyAlboToClipboard,
  shareAlboWhatsApp
};
export { updateStatistics, renderTopStatsCards };
export { promptPWAInstall };
export {
  openSeasonModal,
  closeSeasonModal,
  saveSeason,
  changeSeasonTeamCount,
  handleFantacalcioPasteParse,
  handleFantacalcioFileUpload,
  handleFantacalcioUrlFetch,
  handleManagerSelectChange,
  toggleSeasonSection
};
