/**
 * src/components/board/seasons/NextRoundStrip.ts
 * Next Round Matchday Component for InsalAtlas:
 * - Option C: Collapsible Accordion Banner above standings table with educational guide.
 * Features team crests, tactical clima badges, clean team names with integer Elo pills,
 * and an integrated two-color duel Win Probability Gauge (Bradley-Terry).
 * Clicking any matchup opens the Head-to-Head comparator modal with the two managers.
 */

import type { LiveSeasonDetails } from '@/types';
import type { EloTrackMode } from '@/types/analytics';
import { getTeamFallbackCrest } from '@/crests';
import { getEloMode } from '@/analytics/analyticsCore';
import { escapeHtml } from '@/utils/dom';
import {
  computeMatchClima,
  findUpcomingRound,
  resolveMatchupMetrics,
  type MatchClima,
  type ResolvedMatchupMetrics
} from './nextRoundMetrics';
import {
  renderBradleyTerryFormulaHTML,
  buildNextRoundGuideHTML
} from './liveNextRoundGuide';

// Re-export domain logic and guide rendering for full backward compatibility
export {
  computeMatchClima,
  findUpcomingRound,
  resolveMatchupMetrics,
  type MatchClima,
  type ResolvedMatchupMetrics,
  renderBradleyTerryFormulaHTML,
  buildNextRoundGuideHTML
};

let cachedLiveData: LiveSeasonDetails | null = null;
let isNextRoundExpanded = false;
let isNextRoundGuideExpanded = false;

/**
 * Returns the currently cached live season details for Next Round
 */
export function getCachedNextRoundLiveData(): LiveSeasonDetails | null {
  return cachedLiveData;
}

/**
 * Toggles the accordion state for the Next Round section (Option C)
 */
export function toggleNextRoundAccordion(): void {
  isNextRoundExpanded = !isNextRoundExpanded;
  const content = document.getElementById('next-round-accordion-content');
  const chevron = document.getElementById('next-round-chevron');
  const toggleText = document.getElementById('next-round-toggle-text');
  const guideBtn = document.getElementById('btn-next-round-guide-toggle');

  if (content) {
    if (isNextRoundExpanded) {
      content.classList.remove('hidden');
    } else {
      content.classList.add('hidden');
    }
  }

  // Guide toggle button is only visible when duels are exposed
  if (guideBtn) {
    if (isNextRoundExpanded) {
      guideBtn.classList.remove('hidden');
      guideBtn.classList.add('flex');
    } else {
      guideBtn.classList.add('hidden');
      guideBtn.classList.remove('flex');
    }
  }

  // Share wrapper is only visible when duels are exposed
  const shareWrap = document.getElementById('next-round-share-wrapper');
  if (shareWrap) {
    if (isNextRoundExpanded) {
      shareWrap.classList.remove('hidden');
      shareWrap.classList.add('flex');
    } else {
      shareWrap.classList.add('hidden');
      shareWrap.classList.remove('flex');
    }
  }

  // Auto-collapse guide box and close share dropdown when duels are hidden
  if (!isNextRoundExpanded) {
    closeNextRoundShareDropdown();
    if (isNextRoundGuideExpanded) {
      isNextRoundGuideExpanded = false;
      const guide = document.getElementById('next-round-guide-box');
      const guideChevron = document.getElementById('next-round-guide-chevron');
      if (guide) guide.classList.add('hidden');
      if (guideChevron) guideChevron.style.transform = 'rotate(0deg)';
    }
  }

  if (chevron) {
    chevron.style.transform = isNextRoundExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
  }

  if (toggleText) {
    toggleText.textContent = isNextRoundExpanded ? 'Nascondi' : 'Mostra Duelli';
  }
}

/**
 * Toggles the educational guide box for the Next Round section
 */
export function toggleNextRoundGuide(event?: Event): void {
  if (event) {
    event.stopPropagation();
  }
  isNextRoundGuideExpanded = !isNextRoundGuideExpanded;
  const guide = document.getElementById('next-round-guide-box');
  const chevron = document.getElementById('next-round-guide-chevron');

  if (guide) {
    if (isNextRoundGuideExpanded) {
      guide.classList.remove('hidden');
    } else {
      guide.classList.add('hidden');
    }
  }

  if (chevron) {
    chevron.style.transform = isNextRoundGuideExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
  }
}

/**
 * Toggles the Next Round share dropdown menu
 */
export function toggleNextRoundShareDropdown(event?: Event): void {
  if (event) {
    event.stopPropagation();
  }
  const dropdown = document.getElementById('next-round-share-dropdown');
  if (!dropdown) return;
  const isHidden = dropdown.classList.contains('hidden');
  closeNextRoundShareDropdown();
  if (isHidden) {
    dropdown.classList.remove('hidden');
  }
}

/**
 * Closes the Next Round share dropdown menu
 */
export function closeNextRoundShareDropdown(): void {
  const dropdown = document.getElementById('next-round-share-dropdown');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    dropdown.classList.add('hidden');
  }
}

/**
 * Renders a single clean matchup card with team crests, names, rounded integer Elo pills, and Bradley-Terry gauge
 */
function renderMatchCard(
  m: any,
  idx: number,
  liveData: LiveSeasonDetails,
  mode: EloTrackMode,
  totalTeams: number
): string {
  const meta = resolveMatchupMetrics(m, idx, liveData, mode, totalTeams);

  return `
    <div onclick="window.openHeadToHeadModal && window.openHeadToHeadModal('${meta.homeMgrId}', '${meta.awayMgrId}');"
         class="p-3 rounded-2xl border transition-all duration-200 hover:scale-[1.01] hover:shadow-md cursor-pointer select-none flex flex-col justify-between gap-2.5"
         style="border-color: var(--table-border); background-color: var(--table-surface);"
         title="Analizza lo scontro diretto tra ${escapeHtml(meta.homeTeam)} e ${escapeHtml(meta.awayTeam)}">
      
      <!-- Header: Match Index + Clima Match Badge -->
      <div class="flex items-center justify-between gap-1 text-[10px] font-bold">
        <span class="opacity-40 text-[9px] font-mono tracking-wider" style="color: var(--text-muted);">
          MATCH ${idx + 1}
        </span>
        <span class="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide border flex items-center gap-1 ${meta.clima.badgeClass}">
          <span>${meta.clima.label}</span>
        </span>
      </div>

      <!-- Teams Rows: Crest, Name, and Clean Integer Elo Pill -->
      <div class="flex flex-col gap-2 py-0.5">
        <!-- Team 1 -->
        <div class="flex items-center justify-between gap-2 min-w-0">
          <div class="flex items-center gap-2 min-w-0 truncate">
            <span class="w-6 shrink-0 font-mono text-[10px] font-bold opacity-45 text-left inline-block" style="color: var(--text-muted);" title="Posizione attuale in classifica: #${meta.homeRank}">
              #${meta.homeRank}
            </span>
            <img src="${meta.homeLogo}" alt="${meta.homeTeam}"
                 class="w-6 h-6 rounded-full object-contain shrink-0 bg-white/10 border border-slate-300 dark:border-slate-700 shadow-xs"
                 onerror="this.onerror=null; this.src='${getTeamFallbackCrest(meta.homeTeam)}'">
            <span class="font-bold text-xs sm:text-sm leading-snug truncate" style="color: var(--text-main);">${escapeHtml(meta.homeTeam)}</span>
          </div>
          <span class="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border shrink-0 bg-black/5 dark:bg-white/5 border-slate-200 dark:border-slate-800"
                style="color: var(--text-muted);"
                title="Rating Elo: ${meta.homeEloInt} (preciso: ${meta.homeElo.toFixed(1)})">
            ${meta.homeEloInt}
          </span>
        </div>

        <!-- Team 2 -->
        <div class="flex items-center justify-between gap-2 min-w-0">
          <div class="flex items-center gap-2 min-w-0 truncate">
            <span class="w-6 shrink-0 font-mono text-[10px] font-bold opacity-45 text-left inline-block" style="color: var(--text-muted);" title="Posizione attuale in classifica: #${meta.awayRank}">
              #${meta.awayRank}
            </span>
            <img src="${meta.awayLogo}" alt="${meta.awayTeam}"
                 class="w-6 h-6 rounded-full object-contain shrink-0 bg-white/10 border border-slate-300 dark:border-slate-700 shadow-xs"
                 onerror="this.onerror=null; this.src='${getTeamFallbackCrest(meta.awayTeam)}'">
            <span class="font-bold text-xs sm:text-sm leading-snug truncate" style="color: var(--text-main);">${escapeHtml(meta.awayTeam)}</span>
          </div>
          <span class="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border shrink-0 bg-black/5 dark:bg-white/5 border-slate-200 dark:border-slate-800"
                style="color: var(--text-muted);"
                title="Rating Elo: ${meta.awayEloInt} (preciso: ${meta.awayElo.toFixed(1)})">
            ${meta.awayEloInt}
          </span>
        </div>
      </div>

      <!-- Duel Probability Bar with Integrated Percentages -->
      <div class="pt-2 border-t border-[var(--table-border)]/50 flex flex-col gap-1">
        <div class="flex items-center justify-between text-[11px] font-mono font-black">
          <span class="text-emerald-500 dark:text-emerald-400">${meta.winProbHome.toFixed(0)}%</span>
          <span class="text-[8px] uppercase tracking-wider opacity-60 font-sans font-semibold" style="color: var(--text-muted);">
            Probabilità Vittoria
          </span>
          <span class="text-rose-500 dark:text-rose-400">${meta.winProbAway.toFixed(0)}%</span>
        </div>
        <div class="w-full h-2 rounded-full overflow-hidden flex bg-slate-700/40">
          <div style="width: ${meta.winProbHome}%;" class="h-full bg-emerald-500 transition-all duration-300"></div>
          <div style="width: ${meta.winProbAway}%;" class="h-full bg-rose-500 transition-all duration-300"></div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Option C: Generates the HTML markup for the collapsible accordion banner above standings table
 * Styled discreetly to integrate seamlessly without competing with the main standings table header.
 */
export function renderNextRoundStrip(liveData: LiveSeasonDetails, mode: EloTrackMode = getEloMode()): string {
  cachedLiveData = liveData;

  const nextRound = findUpcomingRound(liveData);
  if (!nextRound || !nextRound.matches || nextRound.matches.length === 0) {
    return '';
  }

  const matches = nextRound.matches.filter(m => !m.isPlayed);
  if (matches.length === 0) {
    return '';
  }

  const modeLabel = mode === 'flat' ? '⚡ Elo Puro (1500)' : mode === 'historical' ? '🏛️ Elo Storico' : '🔮 Atlas Power';
  const totalTeams = liveData.standings?.length || 14;

  const guideBoxHtml = buildNextRoundGuideHTML(isNextRoundGuideExpanded);
  const cardsHtml = matches.map((m, idx) => renderMatchCard(m, idx, liveData, mode, totalTeams)).join('');

  return `
    <div id="next-round-strip-container" class="mb-4 rounded-2xl border overflow-hidden shadow-2xs transition-all duration-300"
         style="border-color: var(--table-border); background-color: var(--table-surface);">
      
      <!-- Discreet Clickable Accordion Header Bar (Differentiated from Main Standings Table Header) -->
      <div onclick="window.toggleNextRoundAccordion && window.toggleNextRoundAccordion();"
           class="px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 cursor-pointer select-none transition hover:bg-black/[0.03] dark:hover:bg-white/[0.03] border-b"
           style="border-color: var(--table-border); background-color: var(--table-surface); color: var(--text-main);">
        
        <!-- Row 1 (Mobile) / Left Block (Desktop): Calendar Icon + Title + Duelli Badge -->
        <div class="flex items-center justify-between sm:justify-start gap-2 sm:gap-2.5 min-w-0 w-full sm:w-auto">
          <div class="flex items-center gap-2 min-w-0 truncate">
            <span class="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs shadow-2xs shrink-0">
              <i class="fa-solid fa-calendar-day text-[11px]"></i>
            </span>
            <h3 class="font-sport font-bold text-xs sm:text-sm tracking-wide truncate" style="color: var(--text-main);">
              Prossimo Turno • Giornata ${nextRound.roundNumber}
            </h3>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0"
                style="border-color: var(--table-border); background-color: var(--modal-bg); color: var(--text-muted);">
            ${matches.length} Duelli
          </span>
        </div>

        <!-- Row 2 (Mobile) / Right Controls (Desktop): Guide + Share + Rating Mode + Accordion Action Button -->
        <div class="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2.5 w-full sm:w-auto shrink-0">
          <!-- Left on Mobile: Guide Toggle & Share -->
          <div class="flex items-center gap-1.5 sm:gap-2">
            <!-- Guide Toggle Button (i) - Displayed only when duels are exposed -->
            <button type="button"
                    id="btn-next-round-guide-toggle"
                    onclick="window.toggleNextRoundGuide && window.toggleNextRoundGuide(event);"
                    class="${isNextRoundExpanded ? 'flex' : 'hidden'} items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 cursor-pointer shadow-2xs"
                    style="border-color: var(--table-border); background-color: var(--modal-bg); color: var(--text-main);"
                    title="Guida previsioni e categorie match">
              <i class="fa-solid fa-circle-info text-amber-500 text-xs"></i>
              <span class="text-[11px]">Guida</span>
              <i id="next-round-guide-chevron" class="fa-solid fa-chevron-down text-[9px] opacity-60 transition-transform duration-200" style="transform: ${isNextRoundGuideExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>
            </button>

            <!-- Share Button with Dropdown (Displayed only when duels are exposed) -->
            <div id="next-round-share-wrapper" class="${isNextRoundExpanded ? 'flex' : 'hidden'} relative items-center">
              <button type="button"
                      id="btn-next-round-share"
                      onclick="window.toggleNextRoundShareDropdown && window.toggleNextRoundShareDropdown(event);"
                      class="next-round-share-btn flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 cursor-pointer shadow-2xs"
                      style="border-color: var(--table-border); background-color: var(--modal-bg); color: var(--text-main);"
                      title="Condividi Duelli">
                <i class="fa-solid fa-share-nodes text-amber-500 text-xs"></i>
                <span class="text-[11px]">Condividi</span>
              </button>
              <div id="next-round-share-dropdown"
                   onclick="event.stopPropagation();"
                   class="hidden absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-64 rounded-2xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md"
                   style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--modal-text);">
                <button type="button"
                        onclick="window.exportNextRoundPNG && window.exportNextRoundPNG(); window.closeNextRoundShareDropdown && window.closeNextRoundShareDropdown();"
                        class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2.5 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
                  <i class="fa-solid fa-download text-amber-500 text-xs"></i>
                  <span>Scarica Duelli PNG (HD)</span>
                </button>
                <button type="button"
                        onclick="window.copyNextRoundToClipboard && window.copyNextRoundToClipboard(); window.closeNextRoundShareDropdown && window.closeNextRoundShareDropdown();"
                        class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2.5 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
                  <i class="fa-solid fa-copy text-emerald-500 text-xs"></i>
                  <span>Copia per WhatsApp / Telegram</span>
                </button>
                <button type="button"
                        onclick="window.shareNextRoundWhatsApp && window.shareNextRoundWhatsApp(); window.closeNextRoundShareDropdown && window.closeNextRoundShareDropdown();"
                        class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2.5 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
                  <i class="fa-brands fa-whatsapp text-emerald-500 text-xs"></i>
                  <span>Invia Testo WhatsApp</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Right on Mobile & Desktop: Rating Mode (md+) + Accordion Action Button -->
          <div class="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto sm:ml-0">
            <div class="hidden md:flex items-center gap-1 text-[10px] font-medium" style="color: var(--text-muted);">
              <span>Rating:</span>
              <span id="next-round-mode-label" class="font-semibold text-amber-600 dark:text-amber-400">${modeLabel}</span>
            </div>

            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shadow-2xs"
                 style="border-color: var(--table-border); background-color: var(--modal-bg); color: var(--text-main);">
              <span id="next-round-toggle-text" class="text-[11px]">${isNextRoundExpanded ? 'Nascondi' : 'Mostra Duelli'}</span>
              <i id="next-round-chevron" class="fa-solid fa-chevron-down text-[10px] opacity-60 transition-transform duration-200" style="transform: ${isNextRoundExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Collapsible Section (Option C: Guide Box + Grid Exposed Together) -->
      <div id="next-round-accordion-content" class="${isNextRoundExpanded ? '' : 'hidden'} p-3 sm:p-4 border-t"
           style="border-color: var(--table-border);">
        <!-- Educational Guide Box (Only appears once duels are exposed) -->
        ${guideBoxHtml}

        <div id="next-round-cards-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
          ${cardsHtml}
        </div>
      </div>
    </div>
  `;
}

/**
 * Re-renders the Next Round strip in place when active Elo mode changes
 */
export function updateNextRoundStripUI(liveData?: LiveSeasonDetails): void {
  const container = document.getElementById('next-round-strip-container');

  const data = liveData || cachedLiveData;
  if (!data) return;

  const mode = getEloMode();

  // Update Accordion (Option C)
  if (container && container.parentElement) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderNextRoundStrip(data, mode);
    const newEl = tempDiv.firstElementChild;
    if (newEl) {
      container.parentElement.replaceChild(newEl, container);
    }
  }
}

declare global {
  interface Window {
    toggleNextRoundAccordion?: () => void;
    toggleNextRoundGuide?: (event?: Event) => void;
    toggleNextRoundShareDropdown?: (event?: Event) => void;
    closeNextRoundShareDropdown?: () => void;
    updateNextRoundStripUI?: (liveData?: LiveSeasonDetails) => void;
  }
}

// Global window registration
if (typeof window !== 'undefined') {
  window.toggleNextRoundAccordion = toggleNextRoundAccordion;
  window.toggleNextRoundGuide = toggleNextRoundGuide;
  window.toggleNextRoundShareDropdown = toggleNextRoundShareDropdown;
  window.closeNextRoundShareDropdown = closeNextRoundShareDropdown;
  window.updateNextRoundStripUI = updateNextRoundStripUI;

  // Global click outside to dismiss share dropdown
  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('.next-round-share-btn') && !target.closest('#next-round-share-dropdown')) {
        closeNextRoundShareDropdown();
      }
    });
  }
}
