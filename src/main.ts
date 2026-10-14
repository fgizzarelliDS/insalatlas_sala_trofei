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
  switchChronologyView,
  setManagerFilter,
  toggleChronologySort,
  toggleSeasonSort,
  changeChronologySort,
  changeSeasonSort,
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
  openHeadToHeadModal,
  closeHeadToHeadModal,
  swapH2HManagers,
  changeH2HManagerA,
  changeH2HManagerB,
  toggleH2HChronology,
  openH2HFromProfile,
  openH2HWithOpponent,
  shareH2HWhatsApp,
  setH2HVisualMode,
  setH2HTab,
  getH2HTab,
  selectH2HDuel,
  openNemesisMatrixModal,
  setNemesisFilter,
  toggleH2HShareDropdown,
  closeH2HShareDropdown,
  exportCurrentH2HDuelHD,
  copyCurrentH2HDuelToClipboard
} from '@/components/modals';
import {
  exportGraphicHD,
  exportManagerCardById,
  copyManagerCardById,
  shareManagerWhatsAppById,
  shareRecordWhatsApp
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
import {
  filterRecordsCategory,
  renderRecordsTab,
  toggleRecordShareDropdown,
  closeAllRecordShareDropdowns,
  exportRecordCard,
  copyRecordCard
} from '@/components/board/records';
import { findManagerByParam, getManagerParamFromURL, getH2HParamFromURL, getRecordParamFromURL } from '@/router';
import { initPWA, promptPWAInstall } from '@/pwa';

// Re-export router utilities, board controls, seasons archive, records, and PWA for unit tests and consumers
export { findManagerByParam, getManagerParamFromURL, getH2HParamFromURL, getRecordParamFromURL };
export { changeSort, toggleDisplayMode, renderBoard, dismissScrollHint };
export { switchMainViewTab, selectArchiveSeason, renderSeasonsArchive };
export {
  filterRecordsCategory,
  renderRecordsTab,
  toggleRecordShareDropdown,
  closeAllRecordShareDropdowns,
  exportRecordCard,
  copyRecordCard,
  shareRecordWhatsApp
};
export { updateStatistics };
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
    openSeasonModal: typeof openSeasonModal;
    closeSeasonModal: typeof closeSeasonModal;
    saveSeason: typeof saveSeason;
    changeSeasonTeamCount: typeof changeSeasonTeamCount;
    handleFantacalcioPasteParse: typeof handleFantacalcioPasteParse;
    handleFantacalcioFileUpload: typeof handleFantacalcioFileUpload;
    handleFantacalcioUrlFetch: typeof handleFantacalcioUrlFetch;
    handleManagerSelectChange: typeof handleManagerSelectChange;
    toggleSeasonSection: typeof toggleSeasonSection;
    switchAnalyticsTab: typeof switchAnalyticsTab;
    switchChronologyView: typeof switchChronologyView;
    setManagerFilter: typeof setManagerFilter;
    setNemesisFilter: typeof setNemesisFilter;
    toggleChronologySort: typeof toggleChronologySort;
    toggleSeasonSort: typeof toggleSeasonSort;
    changeChronologySort: typeof changeChronologySort;
    changeSeasonSort: typeof changeSeasonSort;
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
    filterRecordsCategory: typeof filterRecordsCategory;
    renderRecordsTab: typeof renderRecordsTab;
    openHeadToHeadModal: typeof openHeadToHeadModal;
    closeHeadToHeadModal: typeof closeHeadToHeadModal;
    swapH2HManagers: typeof swapH2HManagers;
    changeH2HManagerA: typeof changeH2HManagerA;
    changeH2HManagerB: typeof changeH2HManagerB;
    toggleH2HChronology: typeof toggleH2HChronology;
    openH2HFromProfile: typeof openH2HFromProfile;
    openH2HWithOpponent: typeof openH2HWithOpponent;
    shareH2HWhatsApp: typeof shareH2HWhatsApp;
    setH2HVisualMode: typeof setH2HVisualMode;
    setH2HTab: typeof setH2HTab;
    getH2HTab: typeof getH2HTab;
    selectH2HDuel: typeof selectH2HDuel;
    openNemesisMatrixModal: typeof openNemesisMatrixModal;
    toggleH2HShareDropdown: typeof toggleH2HShareDropdown;
    closeH2HShareDropdown: typeof closeH2HShareDropdown;
    exportCurrentH2HDuelHD: typeof exportCurrentH2HDuelHD;
    copyCurrentH2HDuelToClipboard: typeof copyCurrentH2HDuelToClipboard;
    toggleRecordShareDropdown: typeof toggleRecordShareDropdown;
    closeAllRecordShareDropdowns: typeof closeAllRecordShareDropdowns;
    exportRecordCard: typeof exportRecordCard;
    copyRecordCard: typeof copyRecordCard;
    shareRecordWhatsApp: typeof shareRecordWhatsApp;
  }
}

/**
 * Application Bootstrap Sequence
 */
export async function initApp(): Promise<void> {
  initModalMounts();
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

  // Deep-linking: auto-open H2H comparison if ?h2h=... in URL
  const h2hParam = getH2HParamFromURL();
  if (h2hParam) {
    const foundA = findManagerByParam(h2hParam.managerA);
    const foundB = findManagerByParam(h2hParam.managerB);
    if (foundA && foundB) {
      openHeadToHeadModal(foundA.id, foundB.id);
    }
  }

  // Deep-linking: auto-open and highlight record in Hall of Fame if ?record=... in URL
  const recordParam = getRecordParamFromURL();
  if (recordParam) {
    switchMainViewTab('records');
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
  }
}

// Bootstrap Sequence
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Global Window Assignment for inline HTML event handlers (attached immediately)
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
    openSeasonModal,
    closeSeasonModal,
    saveSeason,
    changeSeasonTeamCount,
    handleFantacalcioPasteParse,
    handleFantacalcioFileUpload,
    handleFantacalcioUrlFetch,
    handleManagerSelectChange,
    toggleSeasonSection,
    switchAnalyticsTab,
    switchChronologyView,
    setManagerFilter,
    setNemesisFilter,
    toggleChronologySort,
    toggleSeasonSort,
    changeChronologySort,
    changeSeasonSort,
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
    renderSeasonsArchive,
    filterRecordsCategory,
    renderRecordsTab,
    openHeadToHeadModal,
    closeHeadToHeadModal,
    swapH2HManagers,
    changeH2HManagerA,
    changeH2HManagerB,
    toggleH2HChronology,
    openH2HFromProfile,
    openH2HWithOpponent,
    shareH2HWhatsApp,
    setH2HVisualMode,
    setH2HTab,
    getH2HTab,
    selectH2HDuel,
    openNemesisMatrixModal,
    toggleH2HShareDropdown,
    closeH2HShareDropdown,
    exportCurrentH2HDuelHD,
    copyCurrentH2HDuelToClipboard,
    toggleRecordShareDropdown,
    closeAllRecordShareDropdowns,
    exportRecordCard,
    copyRecordCard,
    shareRecordWhatsApp
  });

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  // Popstate: handle browser back/forward navigation
  window.addEventListener('popstate', () => {
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

    const rec = getRecordParamFromURL();
    if (rec) {
      switchMainViewTab('records');
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
    }
  });
}
