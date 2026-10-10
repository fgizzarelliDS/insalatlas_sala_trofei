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
import { renderAnalyticsModalDOM } from './ConcentrationModalTemplate';

let currentTab: AnalyticsTab = 'macro';
let tab2SortField: Tab2SortField = 'podiumRate';
let tab2SortDirection: Tab2SortDirection = 'desc';
let currentMacroMetricMode: MacroMetricMode = 'prestige';
let currentChronologySubView: ChronologySubView = 'managers';
let managerFilterMode: ManagerFilterMode = 'all';
let chronologySortField: ChronologySortField = 'avg_rank';
let chronologySortDirection: 'asc' | 'desc' = 'asc';
let seasonSortField: SeasonSortField = 'season';
let seasonSortDirection: 'asc' | 'desc' = 'desc';

/**
 * Triggers re-rendering of the analytics modal internal content
 */
function renderAnalyticsModalBody(): void {
  renderAnalyticsModalDOM(
    currentTab,
    currentMacroMetricMode,
    tab2SortField,
    tab2SortDirection,
    currentChronologySubView,
    chronologySortField,
    chronologySortDirection,
    seasonSortField,
    seasonSortDirection,
    managerFilterMode
  );
}

/**
 * Toggles or sets active macro metric mode for Tab 1 ('prestige' | 'raw')
 * @param mode - Mode key
 */
export function setMacroMetricMode(mode: MacroMetricMode): void {
  currentMacroMetricMode = mode;
  renderAnalyticsModalBody();
}

/**
 * Changes active sort field or toggles direction for Tab 2
 * @param field - Sort field ('name' | 'podiumRate' | 'killerInstinct' | 'clutch')
 */
export function changeTab2Sort(field: Tab2SortField): void {
  if (tab2SortField === field) {
    tab2SortDirection = tab2SortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    tab2SortField = field;
    tab2SortDirection = field === 'name' ? 'asc' : 'desc';
  }
  renderAnalyticsModalBody();
}

/**
 * Switches the active sub-tab inside the analytics modal
 * @param tab - Target tab ('macro' | 'clutch' | 'risk' | 'chronology')
 */
export function switchAnalyticsTab(tab: AnalyticsTab): void {
  currentTab = tab;
  renderAnalyticsModalBody();
}

/**
 * Switches between 'managers' and 'seasons' sub-views in Tab 4 (Chronology)
 */
export function switchChronologyView(subView: ChronologySubView): void {
  currentChronologySubView = subView;
  renderAnalyticsModalBody();
}

/**
 * Sets active manager filter mode in Tab 4 ('all' | 'veterans' | 'active')
 */
export function setManagerFilter(mode: ManagerFilterMode): void {
  managerFilterMode = mode;
  renderAnalyticsModalBody();
}

/**
 * Changes active sort field or toggles direction for Tab 4 Managers
 */
export function toggleChronologySort(field: ChronologySortField): void {
  if (chronologySortField === field) {
    chronologySortDirection = chronologySortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    chronologySortField = field;
    chronologySortDirection =
      field === 'avg_rank' || field === 'oscillation' || field === 'name' ? 'asc' : 'desc';
  }
  renderAnalyticsModalBody();
}

/**
 * Alias for toggleChronologySort
 */
export function changeChronologySort(field: ChronologySortField): void {
  toggleChronologySort(field);
}

/**
 * Changes active sort field or toggles direction for Tab 4 Seasons
 */
export function toggleSeasonSort(field: SeasonSortField): void {
  if (seasonSortField === field) {
    seasonSortDirection = seasonSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    seasonSortField = field;
    seasonSortDirection =
      field === 'step_gap' || field === 'total_gap' || field === 'podium_gap' || field === 'spoon_gap' ? 'asc' : 'desc';
  }
  renderAnalyticsModalBody();
}

/**
 * Alias for toggleSeasonSort
 */
export function changeSeasonSort(field: SeasonSortField): void {
  toggleSeasonSort(field);
}

/**
 * Toggles the floating contextual tier info popover in Tab 1
 * @param e - Optional click event
 */
export function toggleTierInfo(e?: Event): void {
  if (e) e.stopPropagation();
  const popover = document.getElementById('tier-info-popover');
  if (popover) {
    popover.classList.toggle('hidden');
  }
}

/**
 * Closes the floating contextual tier info popover
 */
export function closeTierInfo(): void {
  const popover = document.getElementById('tier-info-popover');
  if (popover) {
    popover.classList.add('hidden');
  }
}

/**
 * Toggles an educational guide accordion inside the concentration modal
 * @param guideId - Identifier prefix for the guide ('macro-guide' | 'risk-guide' | 'clutch-guide' | 'waterfall-rules' | 'chronology-manager-guide' | 'chronology-season-guide')
 */
export function toggleGuide(guideId: string): void {
  const guideContent = document.getElementById(`${guideId}-content`);
  const guideChevron = document.getElementById(`${guideId}-chevron`);
  if (guideContent && guideChevron) {
    const isHidden = guideContent.classList.contains('hidden');
    if (isHidden) {
      guideContent.classList.remove('hidden');
      guideChevron.classList.add('rotate-180');
    } else {
      guideContent.classList.add('hidden');
      guideChevron.classList.remove('rotate-180');
    }
  }
}

/**
 * Backward compatibility alias for toggleGuide
 */
export function toggleConcentrationGuide(guideId: string = 'macro-guide'): void {
  toggleGuide(guideId);
}

/**
 * Opens modal displaying league concentration, econometric balance, and historical parity
 */
export function openConcentrationModal(): void {
  const modal = document.getElementById('concentration-modal');
  if (!modal) return;
  currentTab = 'macro';
  currentMacroMetricMode = 'prestige';
  renderAnalyticsModalBody();
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

/**
 * Closes concentration modal
 */
export function closeConcentrationModal(): void {
  closeTierInfo();
  const modal = document.getElementById('concentration-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
