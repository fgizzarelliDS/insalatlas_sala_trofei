import type { SortMode } from '@/types';
import { state } from '@/state';
import { showToast } from '@/ui';
import { renderTrophySVG, renderCoachBanner } from '@/trophies';
import { calculateManagerScore, formatScore, getSortedManagers } from '@/score';
import { openManagerModal, openProfileModal } from '@/components/modals';

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
      if (e.matches) {
        state.displayMode = 'compact';
        syncDisplayModeButton();
        renderBoard();
      }
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
    sessionStorage.setItem('insalatlas_dismissed_scroll_hint', 'true');
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
    if (sessionStorage.getItem('insalatlas_dismissed_scroll_hint') === 'true') {
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
        <div class="flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base font-extrabold pb-2">
          ${m.gold ? `<span class="inline-flex items-center gap-1 text-amber-400">${renderTrophySVG('gold_cup', 'compact')}<span>${m.gold}</span></span>` : ''}
          ${m.silver ? `<span class="inline-flex items-center gap-1 text-slate-300">${renderTrophySVG('silver_cup', 'compact')}<span>${m.silver}</span></span>` : ''}
          ${m.bronze ? `<span class="inline-flex items-center gap-1 text-amber-600">${renderTrophySVG('bronze_cup', 'compact')}<span>${m.bronze}</span></span>` : ''}
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
      spoonHTML = m.spoon ? `
        <div class="flex items-center justify-center gap-1 text-sm sm:text-base font-extrabold text-amber-600 pb-2">
          ${renderTrophySVG('wooden_spoon', 'compact')}<span>${m.spoon}</span>
        </div>
      ` : '';
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
        <div class="flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base font-extrabold pb-2">
          ${m.cup_gold ? `<span class="inline-flex items-center gap-1 text-amber-400">${renderTrophySVG('coppa_gold', 'compact')}<span>${m.cup_gold}</span></span>` : ''}
          ${m.cup_silver ? `<span class="inline-flex items-center gap-1 text-slate-300">${renderTrophySVG('coppa_silver', 'compact')}<span>${m.cup_silver}</span></span>` : ''}
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
      superHTML = m.supercup ? `
        <div class="flex items-center justify-center gap-1 text-sm sm:text-base font-extrabold text-yellow-400 pb-2">
          ${renderTrophySVG('supercup', 'compact')}<span>${m.supercup}</span>
        </div>
      ` : '';
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
      mundialitoHTML = m.mundialito ? `
        <div class="flex items-center justify-center gap-1 text-sm sm:text-base font-extrabold text-cyan-400 pb-2">
          ${renderTrophySVG('mundialito', 'compact')}<span>${m.mundialito}</span>
        </div>
      ` : '';
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
      <!-- Col 1: Manager & Presenze (Responsive Sticky Column) -->
      <div class="sticky left-0 z-10 px-2 sm:pl-4 sm:pr-3 self-stretch flex items-center justify-between pb-2 overflow-hidden border-r shadow-[3px_0_6px_-2px_rgba(0,0,0,0.20)]"
           style="background-color: var(--table-surface); border-color: var(--shelf-line);">
        <div class="flex items-center gap-1.5 sm:gap-2.5 overflow-hidden w-full">
          <span class="w-5 h-5 sm:w-6 sm:h-6 rounded bg-black/20 flex items-center justify-center font-sport font-bold text-[10px] sm:text-xs opacity-75 shrink-0">
            ${index + 1}
          </span>
          <div class="flex flex-col justify-center min-w-0 flex-1">
            <div class="font-sport font-bold text-xs sm:text-base tracking-normal uppercase leading-tight truncate" style="color: var(--text-main);" title="${m.name} (${m.years})">
              ${m.name} <span class="font-semibold text-[10px] sm:text-xs opacity-75">(${m.years})</span>
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

      <!-- Col 2: Campionato -->
      <div class="flex items-end justify-center min-h-[38px] px-1 sm:px-3 pb-0">
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
      <div class="flex items-center justify-end pr-2 sm:pr-4 self-center pb-2 min-h-[38px]">
        ${cartonatoHTML}
      </div>
    `;

    container.appendChild(row);
  });

  // In edit mode, append a prominent dashed row at the bottom of the table to add a new manager
  if (state.isEditMode) {
    const addRow = document.createElement('div');
    addRow.id = 'albo-add-manager-row';
    addRow.className = 'w-full my-3 p-3.5 rounded-2xl border-2 border-dashed border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition select-none shadow-sm';
    addRow.innerHTML = '<i class="fa-solid fa-user-plus text-amber-400 text-sm"></i> <span>+ Aggiungi Nuovo Allenatore alla Lega</span>';
    addRow.onclick = () => openManagerModal(null);
    container.appendChild(addRow);
  }
}
