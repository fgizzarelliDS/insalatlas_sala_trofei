import type { SortMode, CompetitionDefinition, Manager } from '@/types';
import { state } from '@/state';
import { showToast } from '@/utils/toast';
import { renderTrophySVG, renderCoachBanner } from '@/trophies';
import {
  calculateManagerScore,
  formatScore,
  getSortedManagers,
  getManagerTrophyCount,
  getManagerTotalTrophies
} from '@/score';
import { LEAGUE, ALBO_COLUMNS, getActiveCompetitions, getCompetitionDef } from '@/config';
import { renderTopStatsCards } from '@/components/board/statsCounter';
import { escapeHtml } from '@/utils/dom';

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
 * Synchronizes the display mode toggle button text with responsive span
 */
export function syncDisplayModeButton(): void {
  const label = document.getElementById('display-mode-label');
  if (label) {
    label.innerHTML = state.displayMode === 'multiple'
      ? '<span class="hidden sm:inline">Mostra </span>Badge Compatti'
      : '<span class="hidden sm:inline">Mostra </span>Icone Multiple';
  }
}

/**
 * Automatically activates compact badges mode on mobile screens (< 768px) and listens to viewport changes
 */
export function initResponsiveDisplayMode(): void {
  if (typeof window !== 'undefined') {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (isMobile) {
      state.displayMode = 'compact';
    }
    syncDisplayModeButton();

    const mql = window.matchMedia('(max-width: 767px)');
    mql.addEventListener('change', (e) => {
      state.displayMode = e.matches ? 'compact' : 'multiple';
      syncDisplayModeButton();
      renderBoard();
    });
  }
}

/**
 * Dismisses the mobile horizontal scroll indicator pill
 */
export function dismissScrollHint(): void {
  const pill = document.getElementById('scroll-hint-pill');
  if (pill) {
    pill.style.opacity = '0';
    pill.style.transform = 'translateY(-6px)';
    setTimeout(() => {
      pill.style.display = 'none';
    }, 300);
  }
  try {
    sessionStorage.setItem(`${LEAGUE.storagePrefix}_dismissed_scroll_hint`, 'true');
  } catch {
    // ignore
  }
}

/**
 * Initializes scroll listener on table scroll container to auto-dismiss scroll hint
 */
export function initScrollHintListener(): void {
  if (typeof window === 'undefined') return;

  try {
    if (sessionStorage.getItem(`${LEAGUE.storagePrefix}_dismissed_scroll_hint`) === 'true') {
      const pill = document.getElementById('scroll-hint-pill');
      if (pill) pill.style.display = 'none';
      return;
    }
  } catch {
    // ignore
  }

  const container = document.getElementById('table-scroll-container');
  if (!container) return;

  let dismissed = false;
  container.addEventListener(
    'scroll',
    () => {
      if (!dismissed && container.scrollLeft > 15) {
        dismissed = true;
        dismissScrollHint();
      }
    },
    { passive: true }
  );
}

/**
 * Toggles between multiple trophies shelf view and compact counters
 */
export function toggleDisplayMode(): void {
  state.displayMode = state.displayMode === 'multiple' ? 'compact' : 'multiple';
  syncDisplayModeButton();
  renderBoard();
  showToast(`Visualizzazione: ${state.displayMode === 'multiple' ? 'Icone Multiple' : 'Badge Compatti'}`, 'info');
}

/**
 * Synchronizes the --albo-cols CSS variable with enabled columns in ALBO_COLUMNS
 */
/**
 * Synchronizes the --albo-cols CSS variable and competition column tracks with ALBO_COLUMNS
 */
export function syncAlboGridColumns(): void {
  if (typeof document === 'undefined' || !document.documentElement?.style?.setProperty) return;
  const isMobile = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 767px)').matches : false;
  for (const comp of getActiveCompetitions()) {
    const track = isMobile ? `${comp.grid.mobileWidthPx}px` : comp.grid.desktopTrack;
    document.documentElement.style.setProperty(`--col-${comp.id}`, track);
  }
  const colsTemplate = ALBO_COLUMNS.map(c => `var(${c.cssVar})`).join(' ');
  document.documentElement.style.setProperty('--albo-cols', colsTemplate);
}

/**
 * Synchronizes header columns in #albo-table-header dynamically with ALBO_COLUMNS
 */
export function renderBoardHeader(): void {
  const header = document.getElementById('albo-table-header');
  if (!header) return;

  header.innerHTML = ALBO_COLUMNS.map(col => {
    const title = (state.titles as unknown as Record<string, string>)[col.titleKey] || col.defaultTitle;
    if (col.key === 'manager') {
      return `
        <div id="th-col-1" data-title-key="col1" onblur="handleTitleBlur(this)"
          class="sticky left-0 z-20 px-2 sm:pl-4 sm:pr-3 transition border-r shadow-[3px_0_6px_-2px_rgba(0,0,0,0.25)] text-[11px] sm:text-xs truncate self-stretch flex items-center"
          style="background-color: var(--header-bg); border-color: rgba(255, 255, 255, 0.15);">
          ${title}
        </div>
      `;
    }
    const padding = col.key === 'championship' ? 'px-1 sm:px-3' : col.key === 'cartonato' ? 'px-2' : ['supercup', 'mundialito'].includes(col.key) ? 'px-1' : '';
    const extraClasses = ['supercup', 'mundialito'].includes(col.key) ? 'tracking-tight sm:tracking-wider truncate' : '';
    return `<div id="th-col-${col.order}" data-title-key="${col.titleKey}" onblur="handleTitleBlur(this)" class="text-center ${padding} transition text-[11px] sm:text-xs ${extraClasses}">${title}</div>`;
  }).join('');
}

/**
 * Renders the sticky manager name, ranking and score cell
 */
function renderManagerCell(
  m: Manager,
  index: number,
  totalMajor: number,
  score: number
): string {
  const safeName = escapeHtml(m.name);
  return `
    <div class="sticky left-0 z-10 px-2 sm:pl-4 sm:pr-3 self-stretch flex items-center justify-between pb-2 overflow-hidden border-r shadow-[3px_0_6px_-2px_rgba(0,0,0,0.20)]"
         style="background-color: var(--table-surface); border-color: var(--shelf-line);">
      <div class="flex items-center gap-1.5 sm:gap-2.5 overflow-hidden w-full">
        <span class="w-5 h-5 sm:w-6 sm:h-6 rounded bg-black/20 flex items-center justify-center font-sport font-bold text-[10px] sm:text-xs opacity-75 shrink-0">
          ${index + 1}
        </span>
        <div class="flex flex-col justify-center min-w-0 flex-1">
          <div class="font-sport font-bold text-xs sm:text-base tracking-normal uppercase leading-tight truncate" style="color: var(--text-main);" title="${safeName} (${m.years})">
            ${safeName} <span class="font-semibold text-[10px] sm:text-xs opacity-75">(${m.years})</span>
          </div>
          <div class="text-[10px] sm:text-[11px] font-bold leading-tight mt-0.5 flex items-center gap-1 sm:gap-1.5 truncate">
            ${totalMajor > 0 ? `
              <span class="font-extrabold shrink-0" style="color: var(--badge-trophy, #b45309);">🏆 ${totalMajor}</span>
              <span class="opacity-40">•</span>
            ` : ''}
            <span class="text-amber-500 font-extrabold shrink-0">⭐ ${formatScore(score)} pt</span>
          </div>
        </div>
      </div>

      ${state.isEditMode ? `
        <div class="flex items-center gap-1 shrink-0 ml-1">
          <button class="w-5 h-5 sm:w-6 sm:h-6 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-slate-950 flex items-center justify-center transition shrink-0">
            <i class="fa-solid fa-pen text-[9px] sm:text-[10px]"></i>
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Generic Cell Dispatcher: Renders any competition cell based on its CompetitionDefinition archetype
 */
function renderCompetitionCell(
  m: Manager,
  comp: CompetitionDefinition,
  displayMode: 'multiple' | 'compact'
): string {
  switch (comp.type) {
    case 'tier3': {
      const gold = getManagerTrophyCount(m, comp.id, 'gold');
      const silver = getManagerTrophyCount(m, comp.id, 'silver');
      const bronze = getManagerTrophyCount(m, comp.id, 'bronze');
      let cellInner = '';
      if (displayMode === 'multiple') {
        const items: string[] = [];
        for (let i = 0; i < gold; i++) items.push(renderTrophySVG(comp.trophyIcon));
        for (let i = 0; i < silver; i++) items.push(renderTrophySVG(comp.silverTrophyIcon || 'silver_cup'));
        for (let i = 0; i < bronze; i++) items.push(renderTrophySVG(comp.bronzeTrophyIcon || 'bronze_cup'));
        cellInner = items.length
          ? `<div class="flex flex-nowrap items-end justify-center gap-1.5 overflow-visible pb-0">${items.join('')}</div>`
          : '';
      } else {
        cellInner = `
          <div class="flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base font-extrabold pb-2">
            ${gold ? `<span class="inline-flex items-center gap-1 text-amber-400">${renderTrophySVG(comp.trophyIcon, 'compact')}<span>${gold}</span></span>` : ''}
            ${silver ? `<span class="inline-flex items-center gap-1 text-slate-300">${renderTrophySVG(comp.silverTrophyIcon || 'silver_cup', 'compact')}<span>${silver}</span></span>` : ''}
            ${bronze ? `<span class="inline-flex items-center gap-1 text-amber-600">${renderTrophySVG(comp.bronzeTrophyIcon || 'bronze_cup', 'compact')}<span>${bronze}</span></span>` : ''}
          </div>
        `;
      }
      return `
        <div class="flex items-end justify-center min-h-[38px] px-1 sm:px-3 pb-0">
          ${cellInner}
        </div>
      `;
    }

    case 'tier2': {
      const gold = getManagerTrophyCount(m, comp.id, 'gold');
      const silver = getManagerTrophyCount(m, comp.id, 'silver');
      let cellInner = '';
      if (displayMode === 'multiple') {
        const items: string[] = [];
        for (let i = 0; i < gold; i++) items.push(renderTrophySVG(comp.trophyIcon));
        for (let i = 0; i < silver; i++) items.push(renderTrophySVG(comp.silverTrophyIcon || 'coppa_silver'));
        cellInner = items.length
          ? `<div class="flex flex-nowrap items-end justify-center gap-1.5 pb-0">${items.join('')}</div>`
          : '';
      } else {
        cellInner = `
          <div class="flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base font-extrabold pb-2">
            ${gold ? `<span class="inline-flex items-center gap-1 text-amber-400">${renderTrophySVG(comp.trophyIcon, 'compact')}<span>${gold}</span></span>` : ''}
            ${silver ? `<span class="inline-flex items-center gap-1 text-slate-300">${renderTrophySVG(comp.silverTrophyIcon || 'coppa_silver', 'compact')}<span>${silver}</span></span>` : ''}
          </div>
        `;
      }
      return `
        <div class="flex items-end justify-center min-h-[38px] pb-0">
          ${cellInner}
        </div>
      `;
    }

    case 'single': {
      const gold = getManagerTrophyCount(m, comp.id, 'gold');
      let cellInner = '';
      if (displayMode === 'multiple') {
        const items: string[] = [];
        for (let i = 0; i < gold; i++) items.push(renderTrophySVG(comp.trophyIcon));
        cellInner = items.length
          ? `<div class="flex flex-nowrap items-end justify-center gap-1 pb-0">${items.join('')}</div>`
          : '';
      } else {
        const colorClass = comp.id === 'supercup' ? 'text-yellow-400' : comp.id === 'mundialito' ? 'text-cyan-400' : 'text-amber-400';
        cellInner = gold ? `
          <div class="flex items-center justify-center gap-1 text-sm sm:text-base font-extrabold ${colorClass} pb-2">
            ${renderTrophySVG(comp.trophyIcon, 'compact')}<span>${gold}</span>
          </div>
        ` : '';
      }
      return `
        <div class="flex items-end justify-center min-h-[38px] pb-0">
          ${cellInner}
        </div>
      `;
    }

    case 'dishonor': {
      const spoon = getManagerTrophyCount(m, comp.id, 'gold');
      let cellInner = '';
      if (displayMode === 'multiple') {
        const items: string[] = [];
        for (let i = 0; i < spoon; i++) items.push(renderTrophySVG(comp.trophyIcon));
        cellInner = items.length
          ? `<div class="flex flex-nowrap items-end justify-center gap-1 pb-0">${items.join('')}</div>`
          : '';
      } else {
        cellInner = spoon ? `
          <div class="flex items-center justify-center gap-1 text-sm sm:text-base font-extrabold text-amber-600 pb-2">
            ${renderTrophySVG(comp.trophyIcon, 'compact')}<span>${spoon}</span>
          </div>
        ` : '';
      }
      return `
        <div class="flex items-end justify-center min-h-[38px] pb-0">
          ${cellInner}
        </div>
      `;
    }

    case 'banners': {
      const count = getManagerTrophyCount(m, comp.id, 'gold');
      const coaches = m.coach_banners || m.cartonato_coaches || [];
      let cellInner = '';
      if (count > 0 || coaches.length > 0) {
        const bannersHTML: string[] = [];
        if (coaches.length > 0) {
          coaches.forEach(c => bannersHTML.push(renderCoachBanner(c)));
        } else {
          for (let i = 0; i < count; i++) bannersHTML.push(renderCoachBanner('CARTONATO'));
        }
        cellInner = `<div class="flex items-center gap-1.5 flex-nowrap max-w-full overflow-x-auto pb-1 scrollbar-none" style="justify-content: safe center;">${bannersHTML.join('')}</div>`;
      }
      return `
        <div class="banners-cell flex items-center justify-center self-center px-1 sm:px-2 pb-2 min-h-[38px] w-full max-w-full overflow-hidden">
          ${cellInner}
        </div>
      `;
    }

    default:
      return '';
  }
}

/**
 * Renders manager table rows onto the shelf grid.
 * Strict grid invariance: row cells map dynamically to ALBO_COLUMNS.
 */
export function renderBoard(): void {
  syncAlboGridColumns();
  renderBoardHeader();
  renderTopStatsCards();

  const container = document.getElementById('managers-table-body');
  if (!container) return;
  container.innerHTML = '';

  const managers = getSortedManagers();
  const useFragment = typeof document.createDocumentFragment === 'function' && typeof (container as unknown as Node).nodeType === 'number';
  const target = useFragment ? document.createDocumentFragment() : container;

  managers.forEach((m, index) => {
    const row = document.createElement('div');
    row.className = 'table-shelf-row albo-grid-row pt-2.5 pb-0 items-end cursor-pointer select-none overflow-visible';
    row.onclick = () => {
      if (state.isEditMode) {
        window.openManagerModal?.(m.id);
      } else {
        window.openProfileModal?.(m.id);
      }
    };

    const totalMajor = getManagerTotalTrophies(m);
    const score = calculateManagerScore(m);

    row.innerHTML = ALBO_COLUMNS.map(col => {
      if (col.key === 'manager') {
        return renderManagerCell(m, index, totalMajor, score);
      }
      const comp = getCompetitionDef(col.key);
      if (comp) {
        return renderCompetitionCell(m, comp, state.displayMode);
      }
      return '';
    }).join('');

    target.appendChild(row);
  });

  // In edit mode, append a prominent dashed row at the bottom of the table to add a new manager
  if (state.isEditMode) {
    const addRow = document.createElement('div');
    addRow.id = 'albo-add-manager-row';
    addRow.className = 'w-full my-3 p-3.5 rounded-2xl border-2 border-dashed border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition select-none shadow-sm';
    addRow.innerHTML = '<i class="fa-solid fa-user-plus text-amber-400 text-sm"></i> <span>+ Aggiungi Nuovo Allenatore alla Lega</span>';
    addRow.onclick = () => {
      window.openManagerModal?.(null);
    };
    target.appendChild(addRow);
  }

  if (useFragment) {
    container.appendChild(target);
  }
}

/**
 * Toggles the Albo d'Oro export/share popover dropdown
 */
export function toggleAlboShareDropdown(event?: Event): void {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const dropdown = document.getElementById('albo-share-dropdown-menu');
  if (!dropdown) return;
  dropdown.classList.toggle('hidden');
}

/**
 * Closes the Albo d'Oro export/share popover dropdown
 */
export function closeAlboShareDropdown(): void {
  const dropdown = document.getElementById('albo-share-dropdown-menu');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    dropdown.classList.add('hidden');
  }
}

/**
 * Triggers HD export for the Albo d'Oro
 */
export async function exportAlboGraphicHD(event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  closeAlboShareDropdown();
  const { exportGraphicHD } = await import('@/export/canvas');
  await exportGraphicHD();
}

/**
 * Copies the Albo d'Oro high-res graphic to clipboard
 */
export async function copyAlboGraphicToClipboard(event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  closeAlboShareDropdown();
  const { copyAlboToClipboard } = await import('@/export/canvas');
  await copyAlboToClipboard();
}

/**
 * Shares the Albo d'Oro ranking summary on WhatsApp
 */
export async function shareAlboGraphicWhatsApp(event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  closeAlboShareDropdown();
  const { shareAlboWhatsApp } = await import('@/export/share');
  shareAlboWhatsApp();
}

/**
 * Navigates back to application Home (Albo d'Oro):
 * - Closes any open modals (Profile, H2H, Concentration, Season, TierInfo)
 * - Sets the main view tab to 'albo'
 * - Smoothly scrolls to the top of the window
 * - Cleans up URL search and hash parameters (?tab, ?manager, ?h2h, ?record, ?q, ?season, ?category)
 * - Preserves user theme and sort settings
 */
export async function navigateToHome(event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
  }

  // 1. Close any open modals
  if (typeof window !== 'undefined') {
    window.closeProfileModal?.();
    window.closeHeadToHeadModal?.();
    window.closeConcentrationModal?.();
    window.closeSeasonModal?.();
    window.closeTierInfo?.();
    // 2. Switch main tab to albo d'oro
    window.switchMainViewTab?.('albo', false);
  }

  // 3. Smooth scroll to top of window
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 4. Clean up URL search and hash parameters
    try {
      const url = new URL(window.location.href);
      if (url.search || url.hash) {
        url.search = '';
        url.hash = '';
        window.history.pushState({ tab: 'albo' }, '', url.pathname);
      }
    } catch {
      // Ignored in non-browser env
    }
  }
}

/**
 * Handles click on brand group (gold cup and title) in the site header
 */
export function handleBrandHomeClick(event?: Event): void {
  // If user is actively editing text in edit mode, don't navigate
  if (state.isEditMode) {
    const target = event?.target as HTMLElement | null;
    if (target && (target.isContentEditable || target.hasAttribute('contenteditable'))) {
      return;
    }
  }
  void navigateToHome(event);
}

