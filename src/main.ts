import {
  changeTheme,
  toggleEditMode,
  handleTitleBlur,
  applyTitlesToDOM
} from '@/ui';
import {
  loadLeagueData,
  exportBackupJSON,
  importBackupJSON,
  resetDefaultTitles,
  resetOfficialData
} from '@/storage';
import {
  openProfileModal,
  closeProfileModal,
  openManagerModal,
  closeManagerModal,
  openConcentrationModal,
  closeConcentrationModal,
  switchAnalyticsTab,
  changeTab2Sort,
  toggleGuide,
  toggleConcentrationGuide,
  toggleTierInfo,
  closeTierInfo,
  setMacroMetricMode,
  saveManager,
  deleteCurrentManager,
  exportCurrentProfileModalHD,
  copyCurrentProfileModalToClipboard,
  exportCurrentManagerCard,
  copyCurrentManagerCardToClipboard,
  shareCurrentManagerWhatsApp,
  toggleShareDropdown,
  closeShareDropdown,
  initModalListeners
} from '@/components/modals';
import {
  exportGraphicHD,
  exportManagerCardById,
  copyManagerCardById,
  shareManagerWhatsAppById
} from '@/export';
import {
  changeSort,
  toggleDisplayMode,
  renderBoard,
  dismissScrollHint,
  initResponsiveDisplayMode,
  initScrollHintListener
} from '@/components/board/tableBoard';
import { updateStatistics } from '@/components/board/statsCounter';
import {
  switchMainViewTab,
  selectArchiveSeason,
  renderSeasonsArchive
} from '@/components/board/seasonsArchive';
import { findManagerByParam, getManagerParamFromURL } from '@/router';
import { initPWA, promptPWAInstall } from '@/pwa';

// Re-export router utilities, board controls, seasons archive, and PWA for unit tests and consumers
export { findManagerByParam, getManagerParamFromURL };
export { changeSort, toggleDisplayMode, renderBoard, dismissScrollHint };
export { switchMainViewTab, selectArchiveSeason, renderSeasonsArchive };
export { updateStatistics };
export { promptPWAInstall };

// Global window augmentation for inline HTML event handlers
declare global {
  interface Window {
    changeTheme: typeof changeTheme;
    changeSort: typeof changeSort;
    toggleDisplayMode: typeof toggleDisplayMode;
    toggleEditMode: typeof toggleEditMode;
    openManagerModal: typeof openManagerModal;
    closeManagerModal: typeof closeManagerModal;
    openProfileModal: typeof openProfileModal;
    closeProfileModal: typeof closeProfileModal;
    openConcentrationModal: typeof openConcentrationModal;
    closeConcentrationModal: typeof closeConcentrationModal;
    switchAnalyticsTab: typeof switchAnalyticsTab;
    changeTab2Sort: typeof changeTab2Sort;
    toggleGuide: typeof toggleGuide;
    toggleConcentrationGuide: typeof toggleConcentrationGuide;
    toggleTierInfo: typeof toggleTierInfo;
    closeTierInfo: typeof closeTierInfo;
    setMacroMetricMode: typeof setMacroMetricMode;
    saveManager: typeof saveManager;
    deleteCurrentManager: typeof deleteCurrentManager;
    exportCurrentProfileModalHD: typeof exportCurrentProfileModalHD;
    copyCurrentProfileModalToClipboard: typeof copyCurrentProfileModalToClipboard;
    exportCurrentManagerCard: typeof exportCurrentManagerCard;
    exportManagerCardById: typeof exportManagerCardById;
    copyCurrentManagerCardToClipboard: typeof copyCurrentManagerCardToClipboard;
    copyManagerCardById: typeof copyManagerCardById;
    shareCurrentManagerWhatsApp: typeof shareCurrentManagerWhatsApp;
    shareManagerWhatsAppById: typeof shareManagerWhatsAppById;
    toggleShareDropdown: typeof toggleShareDropdown;
    closeShareDropdown: typeof closeShareDropdown;
    exportGraphicHD: typeof exportGraphicHD;
    exportBackupJSON: typeof exportBackupJSON;
    importBackupJSON: typeof importBackupJSON;
    resetDefaultTitles: typeof resetDefaultTitles;
    resetOfficialData: typeof resetOfficialData;
    handleTitleBlur: typeof handleTitleBlur;
    renderBoard: typeof renderBoard;
    updateStatistics: typeof updateStatistics;
    promptPWAInstall: typeof promptPWAInstall;
    dismissScrollHint: typeof dismissScrollHint;
    switchMainViewTab: typeof switchMainViewTab;
    selectArchiveSeason: typeof selectArchiveSeason;
    renderSeasonsArchive: typeof renderSeasonsArchive;
  }
}

/**
 * Application Bootstrap Sequence
 */
export async function initApp(): Promise<void> {
  initModalListeners();
  initResponsiveDisplayMode();
  await loadLeagueData();
  applyTitlesToDOM();
  renderBoard();
  updateStatistics();
  initScrollHintListener();
  initPWA();

  // Deep-linking: auto-open manager profile if ?manager=... in URL
  const managerParam = getManagerParamFromURL();
  if (managerParam) {
    const found = findManagerByParam(managerParam);
    if (found) {
      openProfileModal(found.id);
    }
  }
}

// Bootstrap Sequence
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  // Popstate: handle browser back/forward navigation
  window.addEventListener('popstate', () => {
    const p = getManagerParamFromURL();
    if (p) {
      const found = findManagerByParam(p);
      if (found) {
        openProfileModal(found.id);
        return;
      }
    }
    closeProfileModal();
  });

  // Global Window Assignment for inline HTML event handlers
  Object.assign(window, {
    changeTheme,
    changeSort,
    toggleDisplayMode,
    toggleEditMode,
    openManagerModal,
    closeManagerModal,
    openProfileModal,
    closeProfileModal,
    openConcentrationModal,
    closeConcentrationModal,
    switchAnalyticsTab,
    changeTab2Sort,
    toggleGuide,
    toggleConcentrationGuide,
    toggleTierInfo,
    closeTierInfo,
    setMacroMetricMode,
    saveManager,
    deleteCurrentManager,
    exportCurrentProfileModalHD,
    copyCurrentProfileModalToClipboard,
    exportCurrentManagerCard,
    exportManagerCardById,
    copyCurrentManagerCardToClipboard,
    copyManagerCardById,
    shareCurrentManagerWhatsApp,
    shareManagerWhatsAppById,
    toggleShareDropdown,
    closeShareDropdown,
    exportGraphicHD,
    exportBackupJSON,
    importBackupJSON,
    resetDefaultTitles,
    resetOfficialData,
    handleTitleBlur,
    renderBoard,
    updateStatistics,
    promptPWAInstall,
    dismissScrollHint,
    switchMainViewTab,
    selectArchiveSeason,
    renderSeasonsArchive
  });
}
