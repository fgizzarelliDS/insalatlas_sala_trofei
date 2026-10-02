import type { AnalyticsTab, Tab2SortField, Tab2SortDirection, MacroMetricMode } from '@/types';
import { renderAnalyticsModalDOM } from './ConcentrationModalTemplate';

let currentTab: AnalyticsTab = 'macro';
let tab2SortField: Tab2SortField = 'podiumRate';
let tab2SortDirection: Tab2SortDirection = 'desc';
let currentMacroMetricMode: MacroMetricMode = 'prestige';

/**
 * Triggers re-rendering of the analytics modal internal content
 */
function renderAnalyticsModalBody(): void {
  renderAnalyticsModalDOM(currentTab, currentMacroMetricMode, tab2SortField, tab2SortDirection);
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
 * @param tab - Target tab ('macro' | 'clutch' | 'risk')
 */
export function switchAnalyticsTab(tab: AnalyticsTab): void {
  currentTab = tab;
  renderAnalyticsModalBody();
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
 * @param guideId - Identifier prefix for the guide ('macro-guide' | 'risk-guide' | 'clutch-guide' | 'waterfall-rules')
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
