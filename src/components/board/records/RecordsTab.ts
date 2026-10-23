import { state } from '@/state';
import { LEAGUE } from '@/config';
import { computeAllLeagueRecords, filterRecordsByCategory } from '@/analytics/records';
import { getLeagueYearSpan } from '@/analytics/records/helpers';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import { escapeHtml } from '@/utils/dom';
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
      <span onclick="window.navigateToSeasonStandings && window.navigateToSeasonStandings('${distinctSeasons[0]}', undefined, event)"
        title="Vai alla classifica della stagione ${distinctSeasons[0]}"
        class="text-xs font-mono font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1.5 shadow-xs cursor-pointer hover:border-amber-400 hover:bg-amber-500/15 hover:text-amber-400 transition-all"
        style="border-color: var(--input-border); background-color: var(--input-bg); color: var(--text-main);">
        <i class="fa-regular fa-calendar-days text-[10px] text-amber-500"></i>
        <span>${distinctSeasons[0]}</span>
        <i class="fa-solid fa-arrow-right text-[8px] opacity-70"></i>
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
      const boxClickAttr = h.season
        ? `onclick="window.navigateToSeasonStandings && window.navigateToSeasonStandings('${h.season}', '${h.managerId || ''}', event)" title="Vai alla classifica della stagione ${h.season}" class="p-2 sm:p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-colors cursor-pointer hover:bg-white/5 hover:border-amber-500/40"`
        : (h.managerId
          ? `onclick="openProfileModal('${h.managerId}')" title="Apri scheda di ${h.managerName}" class="p-2 sm:p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-colors cursor-pointer hover:bg-white/5"`
          : `class="p-2 sm:p-2.5 rounded-xl border flex items-center justify-between gap-2.5"`);

      const managerClickAttr = h.managerId
        ? `onclick="window.openProfileModal && window.openProfileModal('${h.managerId}'); event.stopPropagation();" title="Apri scheda di ${h.managerName}" class="manager-record-name font-bold text-xs inline-block cursor-pointer hover:underline hover:text-amber-400 transition-colors"`
        : `class="manager-record-name font-bold text-xs inline-block"`;

      const logoMarkup = h.managerId
        ? `<div onclick="window.openProfileModal && window.openProfileModal('${h.managerId}'); event.stopPropagation();" title="Apri scheda di ${h.managerName}" class="cursor-pointer transition-transform hover:scale-105 shrink-0">${renderHolderLogoMarkup(h, 'w-8 h-8')}</div>`
        : renderHolderLogoMarkup(h, 'w-8 h-8');

      return `
        <div ${boxClickAttr} style="border-color: var(--input-border); background-color: var(--input-bg);">
          <div class="flex items-center gap-2.5 min-w-0">
            ${logoMarkup}
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span ${managerClickAttr} style="color: var(--text-main); line-height: 1.35;">
                  ${h.managerName}
                </span>
                <span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 inline-flex items-center leading-tight">1°</span>
                ${h.season
          ? `<span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-xs inline-flex items-center gap-1 leading-tight"
                        title="Vai alla classifica della stagione ${h.season}">
                        <i class="fa-regular fa-calendar-days text-[8px]"></i>
                        <span>${h.season}</span>
                        <i class="fa-solid fa-arrow-right text-[7px] opacity-60"></i>
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
          ${h.season
          ? `<span class="flex items-center gap-1 text-[10px] font-bold opacity-60 hover:opacity-100 transition shrink-0 text-amber-400" title="Classifica ${h.season}"><i class="fa-regular fa-calendar-days text-[10px]"></i><i class="fa-solid fa-chevron-right text-[8px]"></i></span>`
          : (h.managerId
            ? `<i class="fa-solid fa-chevron-right text-[10px] shrink-0 opacity-40 hover:opacity-100 transition" style="color: var(--text-main);"></i>`
            : '')
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
    const heroBoxClickAttr = primary.season
      ? `onclick="window.navigateToSeasonStandings && window.navigateToSeasonStandings('${primary.season}', '${primary.managerId || ''}', event)" title="Vai alla classifica della stagione ${primary.season}" class="p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors cursor-pointer hover:bg-white/5 hover:border-amber-500/40"`
      : (primary.managerId
        ? `onclick="openProfileModal('${primary.managerId}')" title="Apri scheda di ${primary.managerName}" class="p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors cursor-pointer hover:bg-white/5"`
        : `class="p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors"`);

    const heroManagerClickAttr = primary.managerId
      ? `onclick="window.openProfileModal && window.openProfileModal('${primary.managerId}'); event.stopPropagation();" title="Apri scheda di ${primary.managerName}" class="manager-record-name font-bold text-xs sm:text-sm inline-block cursor-pointer hover:underline hover:text-amber-400 transition-colors"`
      : `class="manager-record-name font-bold text-xs sm:text-sm inline-block"`;

    const heroLogoMarkup = primary.managerId
      ? `<div onclick="window.openProfileModal && window.openProfileModal('${primary.managerId}'); event.stopPropagation();" title="Apri scheda di ${primary.managerName}" class="cursor-pointer transition-transform hover:scale-105 shrink-0">${renderHolderLogoMarkup(primary)}</div>`
      : renderHolderLogoMarkup(primary);

    primaryHoldersHTML = `
      <div ${heroBoxClickAttr} 
        style="border-color: var(--input-border); background-color: var(--input-bg);">
        <div class="flex items-center gap-2.5 min-w-0">
          ${heroLogoMarkup}
          <div class="min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span ${heroManagerClickAttr} style="color: var(--text-main); line-height: 1.35;">
                ${primary.managerName}
              </span>
              <span class="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 inline-flex items-center leading-tight">1°</span>
              ${primary.season
        ? `<span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-xs inline-flex items-center gap-1 leading-tight"
                      title="Vai alla classifica della stagione ${primary.season}">
                      <i class="fa-regular fa-calendar-days text-[9px]"></i>
                      <span>${primary.season}</span>
                      <i class="fa-solid fa-arrow-right text-[8px] opacity-60"></i>
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
        ${primary.season
        ? `<span class="flex items-center gap-1 text-[11px] font-bold opacity-60 hover:opacity-100 transition shrink-0 text-amber-400" title="Classifica ${primary.season}"><i class="fa-regular fa-calendar-days text-xs"></i><i class="fa-solid fa-chevron-right text-[10px]"></i></span>`
        : (primary.managerId
          ? `<i class="fa-solid fa-chevron-right text-xs shrink-0 opacity-40 hover:opacity-100 transition" style="color: var(--text-main);"></i>`
          : '')
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
      const normStr = ru.normalizedDetail ? ` · <span class="font-mono text-[10px] opacity-80">${ru.normalizedDetail}</span>` : '';

      const seasonBadge = ru.season
        ? `<span onclick="window.navigateToSeasonStandings && window.navigateToSeasonStandings('${ru.season}', '${ru.managerId || ''}', event)"
                 title="Vai alla classifica della stagione ${ru.season}"
                 class="cursor-pointer font-mono font-bold text-[10px] px-1.5 py-0.2 rounded border border-amber-500/30 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 transition inline-flex items-center gap-1 shadow-xs">
             <i class="fa-regular fa-calendar-days text-[8px]"></i>
             <span>${ru.season}</span>
             <i class="fa-solid fa-arrow-right text-[7px] opacity-60"></i>
           </span>`
        : '';

      const clickHandler = ru.managerId
        ? `onclick="window.openProfileModal && window.openProfileModal('${ru.managerId}'); event.stopPropagation();" title="Apri scheda di ${ru.managerName}" class="cursor-pointer hover:underline font-bold" style="color: var(--text-main);"`
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
          ${seasonBadge}
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
    ? `<div class="record-watermark absolute top-3 right-3 sm:top-4 sm:right-4 text-4xl sm:text-5xl select-none pointer-events-none transform rotate-12 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 flex items-center justify-center [&>svg]:w-9 [&>svg]:h-9 sm:[&>svg]:w-11 sm:[&>svg]:h-11"
        style="opacity: ${RECORD_WATERMARK_DEFAULT_OPACITY}; font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif; line-height: 1;"
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
              class="hidden absolute bottom-full right-0 mb-2 w-52 rounded-2xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md"
              style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--modal-text);">
              <button onclick="window.exportRecordStoryHD && window.exportRecordStoryHD('${record.id}'); closeAllRecordShareDropdowns();"
                class="w-full px-2.5 py-1.5 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
                <i class="fa-solid fa-mobile-screen text-indigo-400"></i>
                <span>Story (9:16)</span>
              </button>
              <button onclick="copyRecordCard('${record.id}', event)"
                class="w-full px-2.5 py-1.5 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer mt-0.5">
                <i class="fa-solid fa-copy text-emerald-500"></i>
                <span>Copia per WhatsApp</span>
              </button>
              <button onclick="shareRecordWhatsApp('${record.id}'); closeAllRecordShareDropdowns();"
                class="w-full px-2.5 py-1.5 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition mt-0.5 cursor-pointer">
                <i class="fa-brands fa-whatsapp text-emerald-400"></i>
                <span>Invia Link WhatsApp</span>
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
 * Filters a list of LeagueRecords by search query string
 */
export function filterRecordsBySearch(records: LeagueRecord[], query: string): LeagueRecord[] {
  if (!query || !query.trim()) return records;
  const q = query.trim().toLowerCase();
  return records.filter(rec => {
    if (rec.title.toLowerCase().includes(q)) return true;
    if (rec.description && rec.description.toLowerCase().includes(q)) return true;
    if (rec.primaryHolder.managerName.toLowerCase().includes(q)) return true;
    if (rec.primaryHolder.teamName && rec.primaryHolder.teamName.toLowerCase().includes(q)) return true;
    if (rec.primaryHolder.detail && rec.primaryHolder.detail.toLowerCase().includes(q)) return true;
    if (rec.primaryHolders && rec.primaryHolders.some(h =>
      h.managerName.toLowerCase().includes(q) || (h.teamName && h.teamName.toLowerCase().includes(q))
    )) return true;
    return false;
  });
}

/**
 * Generates empty state markup when no records match search query
 */
export function renderRecordsEmptyState(query: string): string {
  const safeQuery = escapeHtml(query);
  return `
    <div class="col-span-full py-12 px-4 text-center rounded-2xl border border-dashed border-slate-700/60 bg-black/10 dark:bg-white/5">
      <div class="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl">
        <i class="fa-solid fa-magnifying-glass"></i>
      </div>
      <h3 class="font-sport font-bold text-base mb-1" style="color: var(--text-main);">Nessun primato trovato</h3>
      <p class="text-xs max-w-sm mx-auto mb-4" style="color: var(--text-muted);">
        Nessun record corrisponde alla ricerca "<strong>${safeQuery}</strong>".
      </p>
      <button type="button" onclick="window.clearRecordsSearch && window.clearRecordsSearch()" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition shadow-sm cursor-pointer">
        Azzera Ricerca
      </button>
    </div>
  `;
}

/**
 * Main Template Generator for the Records & Primati Tab
 */
export function renderRecordsContentHTML(
  activeCategory: RecordCategory | 'all' = 'all',
  searchQuery: string = ''
): string {
  const allRecords = computeAllLeagueRecords(state.managers, state.competitions);
  const byCategory = filterRecordsByCategory(allRecords, activeCategory);
  const filtered = filterRecordsBySearch(byCategory, searchQuery);
  const leagueSpan = getLeagueYearSpan(state.competitions);

  const pillsHTML = renderRecordsCategoryPills(activeCategory);
  const cardsHTML = filtered.length > 0
    ? filtered.map(r => renderRecordCard(r)).join('')
    : renderRecordsEmptyState(searchQuery);

  const safeSearch = escapeHtml(searchQuery);

  return `
    <div class="space-y-4">
      <!-- Header Banner & Search -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b" style="border-color: var(--table-border);">
        <div>
          <h2 class="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2" style="color: var(--text-main);">
            <i class="fa-solid fa-medal text-amber-500"></i>
            <span>Record &amp; Primati Storici</span>
            <span id="records-counter-badge" class="text-xs font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
              ${filtered.length} Primati
            </span>
          </h2>
          <p class="text-xs" style="color: var(--text-muted);">
            I numeri, le imprese e le sventure all-time che hanno fatto la storia della ${LEAGUE.brand.championshipLabel || LEAGUE.brand.name} (${leagueSpan.spanText}).
          </p>
        </div>

        <!-- Controls: Live Search + Poster HD Export Dropdown -->
        <div class="flex items-center gap-2 w-full md:w-auto">
          <div class="relative flex-1 min-w-0 sm:w-64 md:w-72">
            <i class="fa-solid fa-magnifying-glass absolute text-xs opacity-50 pointer-events-none" style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); pointer-events: none; opacity: 0.5;"></i>
            <input 
              id="records-search-input"
              type="text"
              inputmode="search"
              autocomplete="off"
              spellcheck="false"
              value="${safeSearch}"
              placeholder="Cerca manager, club..."
              oninput="window.searchRecords && window.searchRecords(this.value)"
              class="w-full py-1.5 rounded-xl text-xs border transition focus:outline-none focus:ring-1 focus:ring-amber-500"
              style="padding-left: 2.35rem !important; padding-right: 2.25rem !important; background-color: var(--table-surface); border-color: var(--table-border); color: var(--text-main);"
            />
            <button 
              id="records-search-clear-btn"
              type="button" 
              onclick="window.clearRecordsSearch && window.clearRecordsSearch()"
              class="absolute text-xs opacity-60 hover:opacity-100 transition px-1 py-0.5 rounded cursor-pointer ${searchQuery ? '' : 'hidden'}"
              style="position: absolute; right: 0.65rem; top: 50%; transform: translateY(-50%);"
              title="Cancella ricerca"
            >✕</button>
          </div>

          <!-- Poster HD Dropdown -->
          <div class="relative shrink-0">
            <button 
              id="btn-poster-share-dropdown"
              type="button"
              onclick="window.togglePosterShareDropdown && window.togglePosterShareDropdown(event)"
              class="px-3 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm flex items-center gap-1.5 opacity-90 hover:opacity-100 cursor-pointer"
              style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);"
              title="Esporta il poster ufficiale ad alta risoluzione con tutti i ${allRecords.length} record"
            >
              <i class="fa-solid fa-camera text-amber-500"></i>
              <span class="hidden sm:inline">Poster HD</span>
              <i class="fa-solid fa-chevron-down text-[10px] ml-0.5 opacity-70"></i>
            </button>
            <div 
              id="poster-share-dropdown-menu"
              class="hidden absolute right-0 top-full mt-1.5 w-56 rounded-2xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md"
              style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--modal-text);"
            >
              <button 
                type="button"
                onclick="window.exportRecordsSummaryStoryHD && window.exportRecordsSummaryStoryHD(); window.closePosterShareDropdown && window.closePosterShareDropdown();"
                class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <i class="fa-solid fa-mobile-screen text-indigo-400"></i>
                <span>Story Top Primati (9:16)</span>
              </button>
              <button 
                type="button"
                onclick="window.exportHallOfFamePosterHD && window.exportHallOfFamePosterHD(); window.closePosterShareDropdown && window.closePosterShareDropdown();"
                class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer mt-0.5"
              >
                <i class="fa-solid fa-download text-amber-500"></i>
                <span>Scarica Poster PNG (HD)</span>
              </button>
              <button 
                type="button"
                onclick="window.copyHallOfFamePosterToClipboard && window.copyHallOfFamePosterToClipboard(); window.closePosterShareDropdown && window.closePosterShareDropdown();"
                class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <i class="fa-solid fa-copy text-emerald-500"></i>
                <span>Copia per WhatsApp</span>
              </button>
              <button 
                type="button"
                onclick="window.sharePosterWhatsApp && window.sharePosterWhatsApp(); window.closePosterShareDropdown && window.closePosterShareDropdown();"
                class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer border-t mt-1 pt-2"
                style="border-color: var(--table-border);"
              >
                <i class="fa-brands fa-whatsapp text-emerald-500"></i>
                <span>Invia Link WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Filter Pills -->
      ${pillsHTML}

      <!-- Responsive Cards Grid -->
      <div id="records-cards-container" class="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
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
 * Closes all open record share dropdowns (including the poster dropdown)
 */
export function closeAllRecordShareDropdowns(): void {
  document.querySelectorAll('[id^="record-share-dropdown-"]').forEach(el => {
    el.classList.add('hidden');
  });
  closePosterShareDropdown();
}

/**
 * Toggles the Poster HD share/export dropdown
 */
export function togglePosterShareDropdown(event?: Event): void {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const dropdown = document.getElementById('poster-share-dropdown-menu');
  if (!dropdown) return;
  const isHidden = dropdown.classList.contains('hidden');
  closeAllRecordShareDropdowns();
  if (isHidden) {
    dropdown.classList.remove('hidden');
  }
}

/**
 * Closes the Poster HD share/export dropdown
 */
export function closePosterShareDropdown(): void {
  const dropdown = document.getElementById('poster-share-dropdown-menu');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    dropdown.classList.add('hidden');
  }
}

/**
 * Triggers export of the full Hall of Fame Poster to high-definition PNG
 */
export async function exportHallOfFamePoster(event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  closePosterShareDropdown();
  const { exportHallOfFamePosterHD } = await import('@/export/share');
  await exportHallOfFamePosterHD();
}

/**
 * Copies the full Hall of Fame Poster image to system clipboard
 */
export async function copyHallOfFamePoster(event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  closePosterShareDropdown();
  const { copyHallOfFamePosterToClipboard } = await import('@/export/share');
  await copyHallOfFamePosterToClipboard();
}

/**
 * Shares the full Hall of Fame Poster link via WhatsApp
 */
export async function shareHallOfFamePosterWhatsApp(event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  closePosterShareDropdown();
  const { sharePosterWhatsApp } = await import('@/export/share');
  sharePosterWhatsApp();
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

/**
 * Triggers export of an individual record card to 9:16 Instagram/WhatsApp Story
 */
export async function exportRecordStory(recordId: string, event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  closeAllRecordShareDropdowns();
  const { exportRecordStoryHD } = await import('@/export/share');
  await exportRecordStoryHD(recordId);
}

/**
 * Triggers export of the Top Primati Hall of Fame Summary Poster to 9:16 Story
 */
export async function exportRecordsSummaryStory(event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  closePosterShareDropdown();
  const { exportRecordsSummaryStoryHD } = await import('@/export/share');
  await exportRecordsSummaryStoryHD();
}

// Global window registrations for inline onclick handlers
if (typeof window !== 'undefined') {
  window.toggleRecordShareDropdown = toggleRecordShareDropdown;
  window.closeAllRecordShareDropdowns = closeAllRecordShareDropdowns;
  window.togglePosterShareDropdown = togglePosterShareDropdown;
  window.closePosterShareDropdown = closePosterShareDropdown;
  window.exportHallOfFamePoster = exportHallOfFamePoster;
  window.copyHallOfFamePoster = copyHallOfFamePoster;
  window.shareHallOfFamePosterWhatsApp = shareHallOfFamePosterWhatsApp;
  window.exportRecordCard = exportRecordCard;
  window.copyRecordCard = copyRecordCard;
  window.exportRecordStory = exportRecordStory;
  window.exportRecordsSummaryStory = exportRecordsSummaryStory;
  window.exportRecordStoryHD = exportRecordStory;
  window.exportRecordsSummaryStoryHD = exportRecordsSummaryStory;
}


