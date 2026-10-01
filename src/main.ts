import { SortMode } from './types';
import { state } from './state';
import { renderTrophySVG, renderCoachBanner } from './trophies';
import { calculateManagerScore, formatScore, getSortedManagers } from './score';
import {
  changeTheme,
  showToast,
  toggleEditMode,
  handleTitleBlur,
  applyTitlesToDOM
} from './ui';
import {
  loadLeagueData,
  exportBackupJSON,
  importBackupJSON,
  resetDefaultTitles,
  resetOfficialData
} from './storage';
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
  saveManager,
  deleteCurrentManager,
  initModalListeners
} from './modals';
import { exportGraphicHD } from './export';

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
    saveManager: typeof saveManager;
    deleteCurrentManager: typeof deleteCurrentManager;
    exportGraphicHD: typeof exportGraphicHD;
    exportBackupJSON: typeof exportBackupJSON;
    importBackupJSON: typeof importBackupJSON;
    resetDefaultTitles: typeof resetDefaultTitles;
    resetOfficialData: typeof resetOfficialData;
    handleTitleBlur: typeof handleTitleBlur;
    renderBoard: typeof renderBoard;
    updateStatistics: typeof updateStatistics;
  }
}

/**
 * Changes active sorting criterion and updates table
 * @param sort - Sort key identifier
 */
export function changeSort(sort: SortMode): void {
  state.currentSort = sort;
  renderBoard();
  showToast('Ordinamento aggiornato!', 'info');
}

/**
 * Toggles between multiple trophies shelf view and compact counters
 */
export function toggleDisplayMode(): void {
  state.displayMode = state.displayMode === 'multiple' ? 'compact' : 'multiple';
  const label = document.getElementById('display-mode-label');
  if (label) {
    label.textContent = state.displayMode === 'multiple' ? 'Mostra Badge Compatti' : 'Mostra Icone Multiple';
  }
  renderBoard();
  showToast(`Visualizzazione: ${state.displayMode === 'multiple' ? 'Icone Multiple' : 'Badge Compatti'}`, 'info');
}

/**
 * Recalculates and updates header summary counters
 */
export function updateStatistics(): void {
  let totalScudetti = 0;
  let totalCups = 0;
  let totalMundialito = 0;
  let totalSpoons = 0;
  let totalCartonati = 0;

  state.managers.forEach(m => {
    totalScudetti += m.gold || 0;
    totalCups += (m.cup_gold || 0) + (m.supercup || 0);
    totalMundialito += m.mundialito || 0;
    totalSpoons += m.spoon || 0;
    totalCartonati += m.cartonato || 0;
  });

  const scudettiEl = document.getElementById('stat-total-scudetti');
  const cupsEl = document.getElementById('stat-total-cups');
  const mundialitoEl = document.getElementById('stat-total-mundialito');
  const spoonsEl = document.getElementById('stat-total-spoons');
  const cartonatiEl = document.getElementById('stat-total-cartonati');

  if (scudettiEl) scudettiEl.textContent = String(totalScudetti);
  if (cupsEl) cupsEl.textContent = String(totalCups);
  if (mundialitoEl) mundialitoEl.textContent = String(totalMundialito);
  if (spoonsEl) spoonsEl.textContent = String(totalSpoons);
  if (cartonatiEl) cartonatiEl.textContent = String(totalCartonati);
}

/**
 * Renders manager table rows onto the shelf grid.
 * STRICT INVARIANCE: Every row in .albo-grid-row must contain EXACTLY 7 direct child <div> elements:
 * 1. Col 1: Manager & Presenze
 * 2. Col 2: Campionato (Scudetto / Argento / Bronzo)
 * 3. Col 3: Cucchiaio di Legno
 * 4. Col 4: Coppa di Lega (Oro / Argento)
 * 5. Col 5: Supercoppa
 * 6. Col 6: Mundialito
 * 7. Col 7: Cartonato (Playout)
 */
export function renderBoard(): void {
  const container = document.getElementById('managers-table-body');
  if (!container) return;
  container.innerHTML = '';

  const managers = getSortedManagers();

  managers.forEach((m, index) => {
    const row = document.createElement('div');
    row.className = 'table-shelf-row albo-grid-row pt-2.5 pb-0 items-end cursor-pointer select-none overflow-visible';
    row.onclick = () => {
      if (state.isEditMode) {
        openManagerModal(m.id);
      } else {
        openProfileModal(m.id);
      }
    };

    const totalMajor = (m.gold || 0) + (m.cup_gold || 0) + (m.supercup || 0) + (m.mundialito || 0);
    const score = calculateManagerScore(m);

    // 1. Campionato
    let champHTML = '';
    if (state.displayMode === 'multiple') {
      const items: string[] = [];
      for (let i = 0; i < (m.gold || 0); i++) items.push(renderTrophySVG('gold_cup'));
      for (let i = 0; i < (m.silver || 0); i++) items.push(renderTrophySVG('silver_cup'));
      for (let i = 0; i < (m.bronze || 0); i++) items.push(renderTrophySVG('bronze_cup'));
      champHTML = items.length
        ? `<div class="flex flex-nowrap items-end justify-center gap-1.5 overflow-visible pb-0">${items.join('')}</div>`
        : '';
    } else {
      champHTML = `
        <div class="flex items-center justify-center gap-2 text-xs font-bold pb-2">
          ${m.gold ? `<span class="text-amber-400">🥇 ${m.gold}</span>` : ''}
          ${m.silver ? `<span class="text-slate-300">🥈 ${m.silver}</span>` : ''}
          ${m.bronze ? `<span class="text-amber-600">🥉 ${m.bronze}</span>` : ''}
        </div>
      `;
    }

    // 2. Cucchiaio
    let spoonHTML = '';
    if (state.displayMode === 'multiple') {
      const items: string[] = [];
      for (let i = 0; i < (m.spoon || 0); i++) items.push(renderTrophySVG('wooden_spoon'));
      spoonHTML = items.length
        ? `<div class="flex flex-nowrap items-end justify-center gap-1 pb-0">${items.join('')}</div>`
        : '';
    } else {
      spoonHTML = m.spoon ? `<span class="text-xs font-bold text-amber-600 pb-2 inline-block">🥄 x${m.spoon}</span>` : '';
    }

    // 3. Coppa di Lega
    let cupHTML = '';
    if (state.displayMode === 'multiple') {
      const items: string[] = [];
      for (let i = 0; i < (m.cup_gold || 0); i++) items.push(renderTrophySVG('coppa_gold'));
      for (let i = 0; i < (m.cup_silver || 0); i++) items.push(renderTrophySVG('coppa_silver'));
      cupHTML = items.length
        ? `<div class="flex flex-nowrap items-end justify-center gap-1.5 pb-0">${items.join('')}</div>`
        : '';
    } else {
      cupHTML = `
        <div class="flex items-center justify-center gap-2 text-xs font-bold pb-2">
          ${m.cup_gold ? `<span class="text-amber-400">🏆 ${m.cup_gold}</span>` : ''}
          ${m.cup_silver ? `<span class="text-slate-300">🥈 ${m.cup_silver}</span>` : ''}
        </div>
      `;
    }

    // 4. Supercoppa
    let superHTML = '';
    if (state.displayMode === 'multiple') {
      const items: string[] = [];
      for (let i = 0; i < (m.supercup || 0); i++) items.push(renderTrophySVG('supercup'));
      superHTML = items.length
        ? `<div class="flex flex-nowrap items-end justify-center gap-1 pb-0">${items.join('')}</div>`
        : '';
    } else {
      superHTML = m.supercup ? `<span class="text-xs font-bold text-yellow-400 pb-2 inline-block">⭐ x${m.supercup}</span>` : '';
    }

    // 5. Mundialito
    let mundialitoHTML = '';
    if (state.displayMode === 'multiple') {
      const items: string[] = [];
      for (let i = 0; i < (m.mundialito || 0); i++) items.push(renderTrophySVG('mundialito'));
      mundialitoHTML = items.length
        ? `<div class="flex flex-nowrap items-end justify-center gap-1.5 pb-0">${items.join('')}</div>`
        : '';
    } else {
      mundialitoHTML = m.mundialito ? `<span class="text-xs font-bold text-cyan-400 pb-2 inline-block">🌍 x${m.mundialito}</span>` : '';
    }

    // 6. Cartonato (Playout) - Solo Banner
    let cartonatoHTML = '';
    const count = m.cartonato || 0;
    const coaches = m.coach_banners || m.cartonato_coaches || [];

    if (count > 0 || coaches.length > 0) {
      const bannersHTML: string[] = [];
      if (coaches.length > 0) {
        coaches.forEach(c => bannersHTML.push(renderCoachBanner(c)));
      } else {
        for (let i = 0; i < count; i++) bannersHTML.push(renderCoachBanner('CARTONATO'));
      }
      cartonatoHTML = `<div class="flex items-center justify-end gap-1.5 flex-nowrap overflow-visible pb-2">${bannersHTML.join('')}</div>`;
    }

    // Strictly EXACTLY 7 direct child <div> elements
    row.innerHTML = `
      <!-- Col 1: Manager & Presenze -->
      <div class="sticky left-0 z-10 pl-4 pr-3 self-stretch flex items-center justify-between pb-2 overflow-visible border-r shadow-[3px_0_6px_-2px_rgba(0,0,0,0.20)]"
           style="background-color: var(--table-surface); border-color: var(--shelf-line);">
        <div class="flex items-center gap-2.5 overflow-visible">
          <span class="w-6 h-6 rounded-md bg-black/20 flex items-center justify-center font-sport font-bold text-xs opacity-75 shrink-0">
            ${index + 1}
          </span>
          <div class="flex flex-col justify-center overflow-visible">
            <div class="font-sport font-bold text-sm sm:text-base tracking-normal uppercase leading-tight whitespace-nowrap overflow-visible" style="color: var(--text-main);">
              ${m.name} <span class="font-semibold text-xs opacity-75">(${m.years})</span>
            </div>
            <div class="text-[11px] font-bold leading-tight overflow-visible mt-0.5 flex items-center gap-1.5">
              ${totalMajor > 0 ? `
                <span class="font-extrabold" style="color: var(--badge-trophy, #b45309);">🏆 ${totalMajor} titol${totalMajor === 1 ? 'o' : 'i'}</span>
                <span class="opacity-40">•</span>
              ` : ''}
              <span class="text-amber-500 font-extrabold">⭐ ${formatScore(score)} pt</span>
            </div>
          </div>
        </div>

        ${state.isEditMode ? `
          <button class="w-6 h-6 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-slate-950 flex items-center justify-center transition shrink-0 ml-1">
            <i class="fa-solid fa-pen text-[10px]"></i>
          </button>
        ` : ''}
      </div>

      <!-- Col 2: Campionato -->
      <div class="flex items-end justify-center min-h-[38px] px-3 pb-0">
        ${champHTML}
      </div>

      <!-- Col 3: Cucchiaio -->
      <div class="flex items-end justify-center min-h-[38px] pb-0">
        ${spoonHTML}
      </div>

      <!-- Col 4: Coppa di Lega -->
      <div class="flex items-end justify-center min-h-[38px] pb-0">
        ${cupHTML}
      </div>

      <!-- Col 5: Supercoppa -->
      <div class="flex items-end justify-center min-h-[38px] pb-0">
        ${superHTML}
      </div>

      <!-- Col 6: Mundialito -->
      <div class="flex items-end justify-center min-h-[38px] pb-0">
        ${mundialitoHTML}
      </div>

      <!-- Col 7: Cartonato (Playout) -->
      <div class="flex items-center justify-end pr-4 self-center pb-2 min-h-[38px]">
        ${cartonatoHTML}
      </div>
    `;

    container.appendChild(row);
  });
}

// Bootstrap Sequence
window.addEventListener('DOMContentLoaded', async () => {
  initModalListeners();
  await loadLeagueData();
  applyTitlesToDOM();
  renderBoard();
  updateStatistics();
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
  saveManager,
  deleteCurrentManager,
  exportGraphicHD,
  exportBackupJSON,
  importBackupJSON,
  resetDefaultTitles,
  resetOfficialData,
  handleTitleBlur,
  renderBoard,
  updateStatistics
});
