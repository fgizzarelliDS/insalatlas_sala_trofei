import {
  changeTheme,
  toggleEditMode,
  handleTitleBlur
} from '@/ui';
import {
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
  switchEloMode,
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
  openProfileFromH2H,
  returnToPreviousH2HDuel,
  returnToPreviousProfile,
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
  copyCurrentH2HDuelToClipboard,
  exportCurrentH2HDuelStoryHD,
  openMultiManagerModal,
  changeMultiManager,
  addNextMultiManager,
  removeMultiManager,
  toggleMultiManagerVisibility,
  exportMultiManagerStoryHD,
  shareMultiManagerWhatsApp,
  exportCurrentProfileStoryHD,
  openTrophyModal,
  closeTrophyModal,
  switchTrophyModalTab,
  shareTrophyWhatsApp,
  toggleTrophyShareDropdown,
  closeTrophyShareDropdown,
  exportTrophyModalHD,
  copyTrophyModalToClipboard,
  switchProfileEloSeason,
  showProfileEloHover,
  clearProfileEloHover,
  selectProfileEloPoint,
  selectEloChartPoint,
  toggleProfileEloMode
} from '@/components/modals';
import {
  exportGraphicHD,
  exportManagerCardById,
  copyManagerCardById,
  shareManagerWhatsAppById,
  shareRecordWhatsApp,
  exportRecordStoryHD,
  exportRecordsSummaryStoryHD,
  exportHallOfFamePosterHD,
  copyHallOfFamePosterToClipboard,
  exportAlboHD,
  copyAlboToClipboard,
  shareAlboWhatsApp,
  sharePosterWhatsApp,
  exportStandingsPNG,
  copyStandingsToClipboard,
  shareStandingsWhatsApp,
  exportTeamMatchesPNG,
  copyTeamMatchesToClipboard
} from '@/export';
import {
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
} from '@/components/board/tableBoard';
import { updateStatistics, renderTopStatsCards } from '@/components/board/statsCounter';
import {
  switchMainViewTab,
  selectArchiveSeason,
  renderSeasonsArchive,
  navigateToSeasonStandings,
  openTeamMatchesModal,
  closeTeamMatchesModal
} from '@/components/board/seasonsArchive';
import {
  filterRecordsCategory,
  renderRecordsTab,
  searchRecords,
  clearRecordsSearch,
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
import { promptPWAInstall } from '@/pwa';

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
    switchEloMode: typeof switchEloMode;
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
    renderTopStatsCards: typeof renderTopStatsCards;
    updateStatistics: typeof updateStatistics;
    promptPWAInstall: typeof promptPWAInstall;
    dismissScrollHint: typeof dismissScrollHint;
    switchMainViewTab: typeof switchMainViewTab;
    selectArchiveSeason: typeof selectArchiveSeason;
    renderSeasonsArchive: typeof renderSeasonsArchive;
    navigateToSeasonStandings: typeof navigateToSeasonStandings;
    openTeamMatchesModal: typeof openTeamMatchesModal;
    closeTeamMatchesModal: typeof closeTeamMatchesModal;
    filterRecordsCategory: typeof filterRecordsCategory;
    renderRecordsTab: typeof renderRecordsTab;
    searchRecords: typeof searchRecords;
    clearRecordsSearch: typeof clearRecordsSearch;
    openHeadToHeadModal: typeof openHeadToHeadModal;
    closeHeadToHeadModal: typeof closeHeadToHeadModal;
    swapH2HManagers: typeof swapH2HManagers;
    changeH2HManagerA: typeof changeH2HManagerA;
    changeH2HManagerB: typeof changeH2HManagerB;
    toggleH2HChronology: typeof toggleH2HChronology;
    openH2HFromProfile: typeof openH2HFromProfile;
    openH2HWithOpponent: typeof openH2HWithOpponent;
    openProfileFromH2H: typeof openProfileFromH2H;
    returnToPreviousH2HDuel: typeof returnToPreviousH2HDuel;
    returnToPreviousProfile: typeof returnToPreviousProfile;
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
    exportCurrentH2HDuelStoryHD: typeof exportCurrentH2HDuelStoryHD;
    openMultiManagerModal: typeof openMultiManagerModal;
    changeMultiManager: typeof changeMultiManager;
    addNextMultiManager: typeof addNextMultiManager;
    removeMultiManager: typeof removeMultiManager;
    toggleMultiManagerVisibility: typeof toggleMultiManagerVisibility;
    exportMultiManagerStoryHD: typeof exportMultiManagerStoryHD;
    shareMultiManagerWhatsApp: typeof shareMultiManagerWhatsApp;
    exportCurrentProfileStoryHD: typeof exportCurrentProfileStoryHD;
    toggleRecordShareDropdown: typeof toggleRecordShareDropdown;
    closeAllRecordShareDropdowns: typeof closeAllRecordShareDropdowns;
    exportRecordCard: typeof exportRecordCard;
    copyRecordCard: typeof copyRecordCard;
    shareRecordWhatsApp: typeof shareRecordWhatsApp;
    togglePosterShareDropdown: typeof togglePosterShareDropdown;
    exportHallOfFamePoster: typeof exportHallOfFamePoster;
    copyHallOfFamePoster: typeof copyHallOfFamePoster;
    exportHallOfFamePosterHD: typeof exportHallOfFamePosterHD;
    copyHallOfFamePosterToClipboard: typeof copyHallOfFamePosterToClipboard;
    sharePosterWhatsApp: typeof sharePosterWhatsApp;
    shareHallOfFamePosterWhatsApp: typeof shareHallOfFamePosterWhatsApp;
    toggleAlboShareDropdown: typeof toggleAlboShareDropdown;
    closeAlboShareDropdown: typeof closeAlboShareDropdown;
    exportAlboGraphicHD: typeof exportAlboGraphicHD;
    copyAlboGraphicToClipboard: typeof copyAlboGraphicToClipboard;
    shareAlboGraphicWhatsApp: typeof shareAlboGraphicWhatsApp;
    exportAlboHD: typeof exportAlboHD;
    copyAlboToClipboard: typeof copyAlboToClipboard;
    shareAlboWhatsApp: typeof shareAlboWhatsApp;
    navigateToHome: typeof navigateToHome;
    handleBrandHomeClick: typeof handleBrandHomeClick;
    openTrophyModal: typeof openTrophyModal;
    closeTrophyModal: typeof closeTrophyModal;
    switchTrophyModalTab: typeof switchTrophyModalTab;
    shareTrophyWhatsApp: typeof shareTrophyWhatsApp;
    toggleTrophyShareDropdown: typeof toggleTrophyShareDropdown;
    closeTrophyShareDropdown: typeof closeTrophyShareDropdown;
    exportTrophyModalHD: typeof exportTrophyModalHD;
    copyTrophyModalToClipboard: typeof copyTrophyModalToClipboard;
    exportStandingsPNG: typeof exportStandingsPNG;
    copyStandingsToClipboard: typeof copyStandingsToClipboard;
    shareStandingsWhatsApp: typeof shareStandingsWhatsApp;
    exportTeamMatchesPNG: typeof exportTeamMatchesPNG;
    copyTeamMatchesToClipboard: typeof copyTeamMatchesToClipboard;
    switchProfileEloSeason: typeof switchProfileEloSeason;
    showProfileEloHover: typeof showProfileEloHover;
    clearProfileEloHover: typeof clearProfileEloHover;
    selectProfileEloPoint: typeof selectProfileEloPoint;
    selectEloChartPoint: typeof selectEloChartPoint;
    toggleProfileEloMode: typeof toggleProfileEloMode;
  }
}

/**
 * Attaches all application action handlers to window object for inline HTML event handling.
 */
export function registerGlobalWindowHandlers(): void {
  if (typeof window === 'undefined') return;

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
    switchEloMode,
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
    renderTopStatsCards,
    updateStatistics,
    promptPWAInstall,
    dismissScrollHint,
    switchMainViewTab,
    selectArchiveSeason,
    renderSeasonsArchive,
    navigateToSeasonStandings,
    openTeamMatchesModal,
    closeTeamMatchesModal,
    filterRecordsCategory,
    renderRecordsTab,
    searchRecords,
    clearRecordsSearch,
    openHeadToHeadModal,
    closeHeadToHeadModal,
    swapH2HManagers,
    changeH2HManagerA,
    changeH2HManagerB,
    toggleH2HChronology,
    openH2HFromProfile,
    openH2HWithOpponent,
    openProfileFromH2H,
    returnToPreviousH2HDuel,
    returnToPreviousProfile,
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
    exportCurrentH2HDuelStoryHD,
    openMultiManagerModal,
    changeMultiManager,
    addNextMultiManager,
    removeMultiManager,
    toggleMultiManagerVisibility,
    exportMultiManagerStoryHD,
    shareMultiManagerWhatsApp,
    exportCurrentProfileStoryHD,
    toggleRecordShareDropdown,
    closeAllRecordShareDropdowns,
    exportRecordCard,
    copyRecordCard,
    exportRecordStoryHD,
    exportRecordsSummaryStoryHD,
    shareRecordWhatsApp,
    togglePosterShareDropdown,
    closePosterShareDropdown,
    exportHallOfFamePoster,
    copyHallOfFamePoster,
    exportHallOfFamePosterHD,
    copyHallOfFamePosterToClipboard,
    sharePosterWhatsApp,
    shareHallOfFamePosterWhatsApp,
    toggleAlboShareDropdown,
    closeAlboShareDropdown,
    exportAlboGraphicHD,
    copyAlboGraphicToClipboard,
    shareAlboGraphicWhatsApp,
    exportAlboHD,
    copyAlboToClipboard,
    shareAlboWhatsApp,
    navigateToHome,
    handleBrandHomeClick,
    openTrophyModal,
    closeTrophyModal,
    switchTrophyModalTab,
    shareTrophyWhatsApp,
    toggleTrophyShareDropdown,
    closeTrophyShareDropdown,
    exportTrophyModalHD,
    copyTrophyModalToClipboard,
    exportStandingsPNG,
    copyStandingsToClipboard,
    shareStandingsWhatsApp,
    exportTeamMatchesPNG,
    copyTeamMatchesToClipboard,
    switchProfileEloSeason,
    showProfileEloHover,
    clearProfileEloHover,
    selectProfileEloPoint,
    selectEloChartPoint,
    toggleProfileEloMode
  });
}
