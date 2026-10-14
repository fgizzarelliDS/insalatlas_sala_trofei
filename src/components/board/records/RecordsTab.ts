import { state } from '@/state';
import { computeAllLeagueRecords, filterRecordsByCategory } from '@/analytics/records';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import type { LeagueRecord, RecordCategory, RecordHolder } from '@/types';

/**
 * Global default opacity for background watermarks in record cards (0.0 to 1.0)
 * Can also be customized per theme in css/themes.css via --record-watermark-opacity
 */
export const RECORD_WATERMARK_DEFAULT_OPACITY = '0.4';

/**
 * Returns color classes and hex styles for each category badge
 */
function getCategoryBadgeStyles(color: string): { bg: string; text: string; border: string; glow: string } {
  switch (color) {
    case 'amber':
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        glow: 'shadow-amber-500/10'
      };
    case 'emerald':
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        glow: 'shadow-emerald-500/10'
      };
    case 'rose':
      return {
        bg: 'bg-rose-500/15',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        glow: 'shadow-rose-500/10'
      };
    case 'indigo':
      return {
        bg: 'bg-indigo-500/15',
        text: 'text-indigo-400',
        border: 'border-indigo-500/30',
        glow: 'shadow-indigo-500/10'
      };
    case 'blue':
    default:
      return {
        bg: 'bg-blue-500/15',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
        glow: 'shadow-blue-500/10'
      };
  }
}

/**
 * Renders the Category Filter Pills navigation bar
 */
export function renderRecordsCategoryPills(activeCategory: RecordCategory | 'all'): string {
  const categories: { id: RecordCategory | 'all'; label: string; icon: string }[] = [
    { id: 'all', label: 'Tutti i Record', icon: 'fa-solid fa-sparkles' },
    { id: 'points', label: 'Punti & Podi', icon: 'fa-solid fa-bolt' },
    { id: 'titles', label: 'Dominio & Coppe', icon: 'fa-solid fa-trophy' },
    { id: 'h2h', label: 'Rivalità H2H', icon: 'fa-solid fa-skull-crossbones' },
    { id: 'streaks', label: 'Strisce & Fedeltà', icon: 'fa-solid fa-medal' },
    { id: 'banter', label: 'Disonori & Curiosità', icon: 'fa-solid fa-masks-theater' }
  ];

  const pillButtons = categories.map(cat => {
    const isActive = activeCategory === cat.id;
    return `
      <button 
        type="button" 
        onclick="filterRecordsCategory('${cat.id}')"
        class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm whitespace-nowrap ${isActive
        ? 'bg-amber-500 text-slate-950 font-black shadow-md'
        : 'border opacity-80 hover:opacity-100 hover:bg-white/5'
      }"
        style="${isActive
        ? 'color: #020617;'
        : 'border-color: var(--table-border); background-color: var(--table-surface); color: var(--text-main);'
      }"
      >
        <i class="${cat.icon} text-[11px] ${isActive ? 'text-slate-950' : 'text-amber-500 dark:text-amber-400'}"></i>
        <span>${cat.label}</span>
      </button>
    `;
  }).join('');

  return `
    <div class="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 mb-4 pr-1" style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
      ${pillButtons}
    </div>
  `;
}

/**
 * Helper to render an authentic crest / logo image markup or initials fallback
 */
function renderHolderLogoMarkup(holder: RecordHolder, sizeClass = 'w-9 h-9 sm:w-10 sm:h-10'): string {
  const logoUrl = holder.logo || (holder.teamName ? resolveTeamLogo(holder.teamName) : null);
  const fallbackLogo = holder.fallbackCrest || (holder.teamName ? getTeamFallbackCrest(holder.teamName) : '');

  if (logoUrl) {
    return `
      <img src="${logoUrl}" alt="${holder.teamName || holder.managerName}"
        class="${sizeClass} record-holder-logo rounded-full object-contain shrink-0 border border-white/10 shadow-sm bg-white/10"
        onerror="this.onerror=null; this.src='${fallbackLogo}';" />
    `;
  }

  const initials = holder.managerName ? holder.managerName.slice(0, 2).toUpperCase() : 'IA';
  return `
    <div class="${sizeClass} rounded-full flex items-center justify-center font-black text-xs sm:text-sm shrink-0 border shadow-sm bg-amber-500/15 text-amber-400"
      style="border-color: var(--table-border);">
      ${initials}
    </div>
  `;
}

/**
 * Renders an individual Hall of Fame Record Card with support for ties (ex-aequo)
 */
export function renderRecordCard(record: LeagueRecord): string {
  const styles = getCategoryBadgeStyles(record.badgeColor);
  const holders = record.primaryHolders && record.primaryHolders.length > 0
    ? record.primaryHolders
    : (record.primaryHolder ? [record.primaryHolder] : []);

  const primary = holders[0] || {
    managerId: '',
    managerName: 'Sconosciuto',
    value: 0,
    formattedValue: '-'
  };

  const distinctSeasons = Array.from(new Set(holders.map(h => h.season).filter(Boolean))) as string[];
  let seasonBadgeHTML = '';
  if (distinctSeasons.length === 1) {
    seasonBadgeHTML = `
      <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1.5 shadow-xs"
        style="border-color: var(--input-border); background-color: var(--input-bg); color: var(--text-main);">
        <i class="fa-regular fa-calendar text-[10px] opacity-75"></i>
        <span>${distinctSeasons[0]}</span>
      </span>
    `;
  } else if (distinctSeasons.length > 1) {
    seasonBadgeHTML = `
      <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1.5 shadow-xs"
        style="border-color: var(--input-border); background-color: var(--input-bg); color: var(--text-main);">
        <i class="fa-regular fa-calendar-days text-[10px] opacity-75"></i>
        <span>${distinctSeasons.join(', ')}</span>
      </span>
    `;
  }

  // 1. Primary Holders Area (Single Holder vs Ex-Aequo List)
  let primaryHoldersHTML = '';
  if (holders.length > 1) {
    // Ex-Aequo ties display
    const itemsHTML = holders.map(h => {
      const clickAttr = h.managerId
        ? `onclick="openProfileModal('${h.managerId}')" title="Apri scheda di ${h.managerName}" class="p-2 sm:p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-colors cursor-pointer hover:bg-white/5"`
        : `class="p-2 sm:p-2.5 rounded-xl border flex items-center justify-between gap-2.5"`;

      return `
        <div ${clickAttr} style="border-color: var(--input-border); background-color: var(--input-bg);">
          <div class="flex items-center gap-2.5 min-w-0">
            ${renderHolderLogoMarkup(h, 'w-8 h-8')}
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="manager-record-name font-bold text-xs inline-block" style="color: var(--text-main); line-height: 1.35;">
                  ${h.managerName}
                </span>
                <span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 inline-flex items-center leading-tight">1°</span>
                ${h.season
          ? `<span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shadow-xs inline-flex items-center leading-tight"
                        style="border-color: var(--table-border); background-color: var(--table-surface); color: var(--text-main);">
                        ${h.season}
                      </span>`
          : ''
        }
              </div>
              ${h.teamName
          ? `<div class="text-[11px] truncate opacity-75" style="color: var(--text-muted);">${h.teamName}</div>`
          : ''
        }
              ${h.detail
          ? `<div class="text-[10px] font-medium" style="color: var(--text-muted);">${h.detail}</div>`
          : ''
        }
            </div>
          </div>
          ${h.managerId
          ? `<i class="fa-solid fa-chevron-right text-[10px] shrink-0 opacity-40 hover:opacity-100 transition" style="color: var(--text-main);"></i>`
          : ''
        }
        </div>
      `;
    }).join('');

    primaryHoldersHTML = `
      <div class="space-y-1.5 mb-1">
        <div class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider mb-1.5" style="color: var(--accent-color);">
          <i class="fa-solid fa-handshake text-xs"></i>
          <span>${holders.length} Co-Primatisti (Pari Merito)</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${itemsHTML}
        </div>
      </div>
    `;
  } else {
    // Single leader hero card
    const clickAttr = primary.managerId
      ? `onclick="openProfileModal('${primary.managerId}')" title="Apri scheda di ${primary.managerName}"`
      : '';

    primaryHoldersHTML = `
      <div ${clickAttr} 
        class="p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${primary.managerId ? 'cursor-pointer hover:bg-white/5' : ''}"
        style="border-color: var(--input-border); background-color: var(--input-bg);">
        <div class="flex items-center gap-2.5 min-w-0">
          ${renderHolderLogoMarkup(primary)}
          <div class="min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="manager-record-name font-bold text-xs sm:text-sm inline-block" style="color: var(--text-main); line-height: 1.35;">
                ${primary.managerName}
              </span>
              <span class="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 inline-flex items-center leading-tight">1°</span>
              ${primary.season
        ? `<span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shadow-xs inline-flex items-center leading-tight"
                      style="border-color: var(--table-border); background-color: var(--table-surface); color: var(--text-main);">
                      ${primary.season}
                    </span>`
        : ''
      }
            </div>
            ${primary.teamName
        ? `<div class="text-[11px] truncate opacity-80" style="color: var(--text-muted);">${primary.teamName}</div>`
        : ''
      }
            ${primary.detail
        ? `<div class="text-[10px] font-medium" style="color: var(--text-muted);">${primary.detail}</div>`
        : ''
      }
          </div>
        </div>
        ${primary.managerId
        ? `<i class="fa-solid fa-chevron-right text-xs shrink-0 opacity-40 hover:opacity-100 transition" style="color: var(--text-main);"></i>`
        : ''
      }
      </div>
    `;
  }

  // 2. Runner-ups strip with mini-crests
  let runnerUpsHTML = '';
  if (record.runnerUps && record.runnerUps.length > 0) {
    const contenders = record.runnerUps.map((ru, idx) => {
      const pos = idx === 0 ? '🥈 2°' : '🥉 3°';
      const detailStr = ru.detail ? ` · <span style="color: var(--text-muted);">${ru.detail}</span>` : '';
      const seasonStr = ru.season ? ` (${ru.season})` : '';
      const normStr = ru.normalizedDetail ? ` · <span class="font-mono text-[10px] opacity-80">${ru.normalizedDetail}</span>` : '';

      const clickHandler = ru.managerId
        ? `onclick="openProfileModal('${ru.managerId}')" class="cursor-pointer hover:underline font-bold" style="color: var(--text-main);"`
        : `class="font-bold" style="color: var(--text-main);"`;

      const miniLogoUrl = ru.logo || (ru.teamName ? resolveTeamLogo(ru.teamName) : null);
      const miniFallback = ru.fallbackCrest || (ru.teamName ? getTeamFallbackCrest(ru.teamName) : '');
      const miniCrest = miniLogoUrl
        ? `<img src="${miniLogoUrl}" alt="${ru.teamName || ru.managerName}" class="w-4 h-4 runnerup-crest rounded-full object-contain inline-block border shrink-0 bg-white/10" style="border-color: var(--table-border);" onerror="this.onerror=null; this.src='${miniFallback}';" />`
        : (miniFallback ? `<img src="${miniFallback}" alt="${ru.teamName || ru.managerName}" class="w-4 h-4 runnerup-crest rounded-full object-contain inline-block border shrink-0 bg-white/10" style="border-color: var(--table-border);" />` : '');

      return `
        <div class="flex items-center gap-1.5 text-[11px] leading-normal flex-wrap">
          <span class="font-bold opacity-75 shrink-0">${pos}</span>
          ${miniCrest}
          <span ${clickHandler}>${ru.managerName}</span>
          <span class="font-mono font-bold" style="color: var(--text-main);">${ru.formattedValue}</span>
          <span class="text-[10px]" style="color: var(--text-muted);">${seasonStr}</span>
          ${normStr}
          ${detailStr}
        </div>
      `;
    }).join('');

    runnerUpsHTML = `
      <div class="pt-2.5 mt-2.5 border-t space-y-1.5" style="border-color: var(--table-border);">
        <span class="text-[9px] uppercase tracking-wider font-extrabold opacity-70 block" style="color: var(--text-muted);">Contendenti &amp; Piazzati:</span>
        <div class="space-y-1">
          ${contenders}
        </div>
      </div>
    `;
  }

  const watermarkHTML = record.watermark
    ? `<div class="record-watermark absolute -right-1 -top-1 sm:right-2 sm:top-2 text-5xl sm:text-6xl select-none pointer-events-none transform rotate-12 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
        style="opacity: ${RECORD_WATERMARK_DEFAULT_OPACITY}; font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;"
        aria-hidden="true">${record.watermark}</div>`
    : '';

  return `
    <div id="record-card-${record.id}"
      class="group rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:border-amber-500/40 shadow-sm relative"
      style="background-color: var(--table-surface); border-color: var(--table-border);">
      
      <!-- Thematic Background Watermark (Clipped inside rounded container) -->
      <div class="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" aria-hidden="true">
        ${watermarkHTML}
      </div>

      <!-- Card Top: Category Badge -->
      <div>
        <div class="flex items-center gap-2 mb-2.5">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${styles.bg} ${styles.text} ${styles.border}">
            <i class="${record.icon} text-[9px]"></i>
            <span>${record.badgeLabel}</span>
          </span>
        </div>

        <!-- Record Title -->
        <h3 class="text-sm sm:text-base font-black tracking-tight mb-2" style="color: var(--text-main);">
          ${record.title}
        </h3>

        <!-- Big Hero Metric Value -->
        <div class="flex items-center gap-2 mb-3 flex-wrap record-metric-row">
          <span class="font-sport font-black text-2xl sm:text-3xl tracking-tight leading-none shrink-0" style="color: var(--accent-color);">
            ${primary.formattedValue}
          </span>
          ${primary.normalizedDetail
      ? `<span class="text-xs font-mono font-semibold px-2 py-0.5 rounded-md border inline-flex items-center shadow-xs"
                  style="border-color: var(--table-border); background: rgba(255,255,255,0.03); color: var(--text-muted);">
                  ${primary.normalizedDetail}
                </span>`
      : ''
    }
          ${seasonBadgeHTML}
        </div>

        <!-- Primary Holders Section (Single or Ex-Aequo Grid) -->
        ${primaryHoldersHTML}

        <!-- Description Note -->
        <p class="text-xs mt-3 leading-relaxed opacity-75" style="color: var(--text-muted);">
          ${record.description}
        </p>
      </div>

      <!-- Card Bottom: Runner-ups + Action Toolbar -->
      <div class="mt-3">
        ${runnerUpsHTML}

        <div class="flex items-center justify-between gap-2 pt-2.5 mt-2.5 border-t record-card-footer" style="border-color: var(--table-border);">
          <div class="text-[10px] font-bold tracking-wider uppercase opacity-50 flex items-center gap-1" style="color: var(--text-muted);">
            <i class="fa-solid fa-medal text-[9px]"></i>
            <span>Primato Ufficiale</span>
          </div>

          <!-- Share Popover Menu Trigger -->
          <div class="relative record-card-actions shrink-0">
            <button id="btn-record-share-${record.id}"
              onclick="toggleRecordShareDropdown('${record.id}', event)"
              title="Condividi o esporta la scheda di questo record"
              aria-label="Condividi record"
              class="px-2.5 py-1 rounded-lg text-xs font-bold border transition-all duration-200 flex items-center gap-1.5 shadow-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
              style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
              <i class="fa-solid fa-share-nodes text-[11px]"></i>
              <span class="text-[11px] font-semibold">Condividi</span>
            </button>

            <!-- Popover Dropdown Menu -->
            <div id="record-share-dropdown-${record.id}"
              class="hidden absolute bottom-full right-0 mb-2 w-48 rounded-2xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md"
              style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--modal-text);">
              <button onclick="copyRecordCard('${record.id}', event)"
                class="w-full px-2.5 py-1.5 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
                <i class="fa-solid fa-copy text-emerald-500"></i>
                <span>Copia per WhatsApp</span>
              </button>
              <button onclick="exportRecordCard('${record.id}', event)"
                class="w-full px-2.5 py-1.5 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition mt-0.5 cursor-pointer">
                <i class="fa-solid fa-download text-amber-500"></i>
                <span>Scarica PNG HD</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Main Template Generator for the Records & Primati Tab
 */
export function renderRecordsContentHTML(activeCategory: RecordCategory | 'all' = 'all'): string {
  const allRecords = computeAllLeagueRecords(state.managers, state.competitions);
  const filtered = filterRecordsByCategory(allRecords, activeCategory);

  const pillsHTML = renderRecordsCategoryPills(activeCategory);
  const cardsHTML = filtered.map(r => renderRecordCard(r)).join('');

  return `
    <div class="space-y-4">
      <!-- Header Banner & Category Filter -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b" style="border-color: var(--table-border);">
        <div>
          <h2 class="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2" style="color: var(--text-main);">
            <i class="fa-solid fa-medal text-amber-500"></i>
            <span>Record &amp; Primati Storici</span>
            <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
              ${filtered.length} Primati
            </span>
          </h2>
          <p class="text-xs" style="color: var(--text-muted);">
            I numeri, le imprese e le sventure all-time che hanno fatto la storia della Serie Atlas (2016-2026).
          </p>
        </div>
      </div>

      <!-- Category Filter Pills -->
      ${pillsHTML}

      <!-- Responsive Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        ${cardsHTML}
      </div>
    </div>
  `;
}

/**
 * Toggles the export/share popover dropdown on a specific record card
 */
export function toggleRecordShareDropdown(recordId: string, event?: Event): void {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const dropdown = document.getElementById(`record-share-dropdown-${recordId}`);
  if (!dropdown) return;

  const isHidden = dropdown.classList.contains('hidden');
  closeAllRecordShareDropdowns();

  if (isHidden) {
    dropdown.classList.remove('hidden');
  }
}

/**
 * Closes all open record share dropdowns
 */
export function closeAllRecordShareDropdowns(): void {
  document.querySelectorAll('[id^="record-share-dropdown-"]').forEach(el => {
    el.classList.add('hidden');
  });
}

/**
 * Triggers export of a record card to high-definition PNG
 */
export async function exportRecordCard(recordId: string, event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  closeAllRecordShareDropdowns();
  const { exportRecordCardHD } = await import('@/export/share');
  await exportRecordCardHD(recordId);
}

/**
 * Copies a record card image to system clipboard
 */
export async function copyRecordCard(recordId: string, event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  closeAllRecordShareDropdowns();
  const { copyRecordCardToClipboard } = await import('@/export/share');
  await copyRecordCardToClipboard(recordId);
}

