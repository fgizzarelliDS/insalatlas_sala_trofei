import type {
  AnalyticsTab,
  Tab2SortField,
  Tab2SortDirection,
  MacroMetricMode,
  ChronologySubView,
  ChronologySortField,
  SeasonSortField,
  ManagerFilterMode
} from '@/types';
import { state } from '@/state';
import { computeLeagueConcentration } from '@/analytics';
import { renderMacroTab } from './MacroTab';
import { renderClutchTab } from './ClutchTab';
import { renderRiskTab } from './RiskTab';
import { renderChronologyTab } from './ChronologyTab';

export { renderMacroTab } from './MacroTab';
export { renderClutchTab } from './ClutchTab';
export { renderRiskTab } from './RiskTab';
export { renderChronologyTab } from './ChronologyTab';

/**
 * Builds and renders the multi-tab HTML inside #concentration-modal-content
 */
export function renderAnalyticsModalDOM(
  currentTab: AnalyticsTab,
  currentMacroMetricMode: MacroMetricMode,
  tab2SortField: Tab2SortField,
  tab2SortDirection: Tab2SortDirection,
  currentChronologySubView: ChronologySubView = 'managers',
  chronologySortField: ChronologySortField = 'avg_rank',
  chronologySortDirection: 'asc' | 'desc' = 'asc',
  seasonSortField: SeasonSortField = 'season',
  seasonSortDirection: 'asc' | 'desc' = 'desc',
  managerFilterMode: ManagerFilterMode = 'all'
): void {
  const container = document.getElementById('concentration-modal-content');
  if (!container) return;

  const analysis = computeLeagueConcentration(state.managers);
  const isPrestige = currentMacroMetricMode === 'prestige';

  const tableProfiles = isPrestige
    ? [...analysis.profiles].sort((a, b) => b.prestigeScore - a.prestigeScore || b.prestigeEfficiency - a.prestigeEfficiency)
    : [...analysis.profiles].sort((a, b) => b.trophies - a.trophies || b.efficiency - a.efficiency);

  // Sub-tab Navigation button generator
  const tabButton = (id: AnalyticsTab, label: string, mobileLabel: string, icon: string) => {
    const isActive = currentTab === id;
    return `
      <button 
        type="button" 
        onclick="switchAnalyticsTab('${id}')" 
        class="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition shadow-sm whitespace-nowrap ${isActive ? '' : 'hover:bg-white/5'}"
        style="${isActive
        ? 'background-color: var(--btn-bg); color: var(--btn-text); border: 1px solid var(--btn-border);'
        : 'color: var(--text-muted); background: transparent; border: 1px solid transparent;'
      }"
      >
        <i class="${icon} text-[9px] sm:text-xs shrink-0"></i>
        <span>
          <span class="sm:hidden">${mobileLabel}</span>
          <span class="hidden sm:inline">${label}</span>
        </span>
      </button>
    `;
  };

  let tabContentHTML = '';

  if (currentTab === 'macro') {
    tabContentHTML = renderMacroTab(analysis, isPrestige, tableProfiles);
  } else if (currentTab === 'clutch') {
    tabContentHTML = renderClutchTab(analysis, tab2SortField, tab2SortDirection);
  } else if (currentTab === 'risk') {
    tabContentHTML = renderRiskTab(analysis);
  } else if (currentTab === 'chronology') {
    tabContentHTML = renderChronologyTab(
      currentChronologySubView,
      chronologySortField,
      chronologySortDirection,
      seasonSortField,
      seasonSortDirection,
      managerFilterMode
    );
  }

  container.innerHTML = `
    <!-- Modal Fixed Header -->
    <div class="px-3.5 py-2.5 sm:px-6 sm:py-3.5 border-b flex items-center justify-between shrink-0" style="border-color: var(--table-border);">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-sm" style="background: rgba(255,255,255,0.05); border: 1px solid var(--table-border);">
          <i class="fa-solid fa-chart-pie text-amber-400"></i>
        </div>
        <div>
          <h2 class="flex items-center gap-2 text-sm sm:text-base font-black tracking-tight" style="color: var(--text-main);">
            <span>Analisi InsalAtlas</span>
            <img src="favicon-64x64.png" alt="InsalAtlas logo" class="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
          </h2>
          <span class="text-[11px]" style="color: var(--text-muted);">Analisi &amp; Filosofie di Roster</span>
        </div>
      </div>
      <button type="button" onclick="closeConcentrationModal()" class="w-7 h-7 rounded-full flex items-center justify-center transition border"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    </div>

    <!-- Navigation Tabs Bar -->
    <div class="px-2 sm:px-6 py-2 border-b grid grid-cols-4 sm:flex items-center gap-1 sm:gap-2 shrink-0" style="border-color: var(--table-border); background: rgba(0,0,0,0.08);">
      ${tabButton('macro', 'Equilibrio & Macro', 'Equilibrio', 'fa-solid fa-scale-balanced')}
      ${tabButton('clutch', 'Cinismo & Podi', 'Cinismo', 'fa-solid fa-bullseye')}
      ${tabButton('risk', 'Archetipi', 'Archetipi', 'fa-solid fa-dice')}
      ${tabButton('chronology', 'Dinamica Storica', 'Storico', 'fa-solid fa-timeline')}
    </div>

    <!-- Modal Scrollable Body -->
    <div class="px-3 py-2.5 sm:px-6 sm:py-3.5 overflow-y-auto space-y-2.5 flex-1 min-h-0" style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
      
      <!-- Dynamic Tab Content -->
      ${tabContentHTML}

    </div>

    <!-- Modal Fixed Footer -->
    <div class="px-3.5 py-2 sm:px-6 sm:py-3 border-t flex justify-end shrink-0" style="border-color: var(--table-border);">
      <button type="button" onclick="closeConcentrationModal()" class="px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition shadow-sm"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        Chiudi
      </button>
    </div>
  `;
}
