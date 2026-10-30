import type { CompetitionRecord } from '@/types';
import { state } from '@/state';
import { renderTrophySVG } from '@/trophies';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import { LEAGUE } from '@/config';
import { getLiveSeasonDetails } from './liveAnalytics';
import { buildLiveStandingsGuideHTML, toggleLiveStandingsGuide } from './liveStandingsGuide';
import { renderRealViewContainer, switchRealSort, toggleRealEloMode } from './liveRealView';
import {
  renderMeritViewContainer,
  switchMeritSort,
  toggleMobileMeritSort,
  toggleMeritEloMode
} from './liveMeritView';
import { renderNextRoundStrip } from './NextRoundStrip';

// Re-export submodules for 100% backward compatibility
export { toggleLiveStandingsGuide } from './liveStandingsGuide';
export { switchRealSort, toggleRealEloMode } from './liveRealView';
export { switchMeritSort, toggleMobileMeritSort, toggleMeritEloMode } from './liveMeritView';

/**
 * Renders the enhanced Live In-Progress Standings Table (Desktop & Mobile)
 */
function renderLiveChampionshipTable(
  championship: CompetitionRecord,
  liveData: ReturnType<typeof getLiveSeasonDetails>
): string {
  if (!liveData || !liveData.standings || liveData.standings.length === 0) {
    return '';
  }

  const standings = liveData.standings;
  const lastCompleted = liveData.lastCompletedRound || 0;
  const totalRounds = liveData.totalRounds || 0;

  const realViewContainerHTML = renderRealViewContainer(standings);
  const meritViewContainerHTML = renderMeritViewContainer(standings);
  const guideBoxHTML = buildLiveStandingsGuideHTML();
  const nextRoundStripHTML = renderNextRoundStrip(liveData);

  return `
    <!-- Upcoming Round Fixtures & Duel Odds Strip -->
    ${nextRoundStripHTML}

    <div class="albo-table-wrap rounded-2xl overflow-hidden border mb-6 shadow-sm" style="border-color: var(--table-border); background-color: var(--table-surface);">
      <!-- Table Header Banner (Integrated with Switcher & Compact Guide Toggle) -->
      <div class="px-3 sm:px-4 py-2 sm:py-2.5 border-b"
           style="border-color: var(--table-border); background-color: var(--header-bg); color: var(--header-text);">
        
        <!-- Desktop Layout (>= md): Single Sleek Broadcast Row -->
        <div class="hidden md:flex items-center justify-between gap-3">
          <!-- Left: Trophy + Title + In Corso Badge -->
          <div class="flex items-center gap-2.5 font-sport font-bold text-sm tracking-wide shrink-0">
            ${renderTrophySVG('gold_cup', 'compact')}
            <span>${championship.name} (${championship.season})</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              In corso • G${lastCompleted}/${totalRounds}
            </span>
          </div>

          <!-- Center: 2-Way View Switcher (Desktop) -->
          <div class="inline-flex items-center p-0.5 rounded-xl bg-black/25 backdrop-blur-xs border border-white/15 shadow-inner">
            <button id="btn-live-view-real"
                    type="button"
                    onclick="window.switchLiveStandingsView && window.switchLiveStandingsView('real')"
                    class="px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-amber-500 text-slate-950 shadow-xs">
              <i class="fa-solid fa-list-ol text-[11px]"></i>
              <span>Classifica Reale</span>
            </button>
            <button id="btn-live-view-merit"
                    type="button"
                    onclick="window.switchLiveStandingsView && window.switchLiveStandingsView('merit')"
                    class="px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer text-white/75 hover:text-white hover:bg-white/10">
              <i class="fa-solid fa-scale-balanced text-[11px]"></i>
              <span>Merito & Fortuna</span>
            </button>
          </div>

          <!-- Right: Guide Toggle + Merit Share + Teams Count -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- Desktop Standings Share Button (Always Visible) -->
            <div class="relative">
              <button type="button"
                      id="btn-merit-share-desktop"
                      onclick="window.toggleMeritShareDropdown && window.toggleMeritShareDropdown('desktop', event)"
                      class="merit-share-btn flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition hover:bg-white/20 active:scale-95 cursor-pointer shadow-xs bg-white/10 text-white/90 border-white/20 backdrop-blur-xs"
                      title="Condividi Classifica">
                <i class="fa-solid fa-share-nodes text-amber-300"></i>
                <span>Condividi</span>
              </button>
              <div id="merit-share-dropdown-desktop"
                   class="hidden absolute right-0 top-full mt-1.5 w-60 rounded-2xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md"
                   style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--modal-text);">
                <button type="button"
                        onclick="window.exportStandingsPNG && window.exportStandingsPNG(); window.closeMeritShareDropdown && window.closeMeritShareDropdown();"
                        class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
                  <i class="fa-solid fa-download text-amber-500"></i>
                  <span>Scarica Classifica PNG (HD)</span>
                </button>
                <button type="button"
                        onclick="window.copyStandingsToClipboard && window.copyStandingsToClipboard(); window.closeMeritShareDropdown && window.closeMeritShareDropdown();"
                        class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
                  <i class="fa-solid fa-copy text-emerald-500"></i>
                  <span>Copia per WhatsApp</span>
                </button>
                <button type="button"
                        onclick="window.shareStandingsWhatsApp && window.shareStandingsWhatsApp(); window.closeMeritShareDropdown && window.closeMeritShareDropdown();"
                        class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
                  <i class="fa-brands fa-whatsapp text-emerald-500"></i>
                  <span>Invia Link WhatsApp</span>
                </button>
              </div>
            </div>

            <button type="button"
                    onclick="window.toggleLiveStandingsGuide && window.toggleLiveStandingsGuide()"
                    class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition hover:bg-white/20 active:scale-95 cursor-pointer shadow-xs bg-white/10 text-white/90 border-white/20 backdrop-blur-xs"
                    title="Clicca per aprire la guida">
              <i class="fa-solid fa-circle-info text-amber-300"></i>
              <span>Guida & Legenda</span>
              <i id="live-guide-chevron" class="fa-solid fa-chevron-down text-[10px] ml-0.5 transition-transform duration-200"></i>
            </button>
            <div class="text-xs font-semibold opacity-75">
              ${standings.length} Squadre
            </div>
          </div>
        </div>

        <!-- Mobile Layout (< md): 2 Clean Rows with Compact Guida Button in Row 1 -->
        <div class="md:hidden flex flex-col gap-2">
          <!-- Row 1: Title (left) & Live Badge + Compact Guide Button (right) -->
          <div class="flex items-center justify-between gap-2 min-w-0">
            <div class="flex items-center gap-1.5 font-sport font-bold text-xs tracking-wide truncate min-w-0">
              ${renderTrophySVG('gold_cup', 'compact')}
              <span class="truncate">${championship.name}</span>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <!-- Live Badge (Adaptive width: shows 'In corso • G1/26' on xs+ and 'G1/26' on tight screens) -->
              <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 whitespace-nowrap shadow-xs">
                <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span class="hidden xs:inline">In corso • </span>
                <span>G${lastCompleted}/${totalRounds}</span>
              </span>

              <!-- Compact Standings Share Button (Always Visible) -->
              <div class="relative">
                <button type="button"
                        id="btn-merit-share-mobile"
                        onclick="window.toggleMeritShareDropdown && window.toggleMeritShareDropdown('mobile', event)"
                        class="merit-share-btn flex items-center px-2 py-1 rounded-full border text-xs font-semibold transition hover:bg-white/20 active:scale-95 cursor-pointer shadow-xs bg-white/10 text-white/90 border-white/20 backdrop-blur-xs"
                        title="Condividi Classifica">
                  <i class="fa-solid fa-share-nodes text-amber-300 text-xs"></i>
                </button>
                <div id="merit-share-dropdown-mobile"
                     class="hidden absolute right-0 top-full mt-1.5 w-60 rounded-2xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md"
                     style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--modal-text);">
                  <button type="button"
                          onclick="window.exportStandingsPNG && window.exportStandingsPNG(); window.closeMeritShareDropdown && window.closeMeritShareDropdown();"
                          class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
                    <i class="fa-solid fa-download text-amber-500"></i>
                    <span>Scarica Classifica PNG (HD)</span>
                  </button>
                  <button type="button"
                          onclick="window.copyStandingsToClipboard && window.copyStandingsToClipboard(); window.closeMeritShareDropdown && window.closeMeritShareDropdown();"
                          class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
                    <i class="fa-solid fa-copy text-emerald-500"></i>
                    <span>Copia per WhatsApp</span>
                  </button>
                  <button type="button"
                          onclick="window.shareStandingsWhatsApp && window.shareStandingsWhatsApp(); window.closeMeritShareDropdown && window.closeMeritShareDropdown();"
                          class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
                    <i class="fa-brands fa-whatsapp text-emerald-500"></i>
                    <span>Invia Link WhatsApp</span>
                  </button>
                </div>
              </div>

              <!-- Compact Guide Button in Row 1 -->
              <button type="button"
                      onclick="window.toggleLiveStandingsGuide && window.toggleLiveStandingsGuide()"
                      class="flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold transition hover:bg-white/20 active:scale-95 cursor-pointer shadow-xs bg-white/10 text-white/90 border-white/20 backdrop-blur-xs"
                      title="Apri guida e legenda">
                <i class="fa-solid fa-circle-info text-amber-300 text-xs"></i>
                <i id="live-guide-chevron-mobile" class="fa-solid fa-chevron-down text-[9px] opacity-75 transition-transform duration-200"></i>
              </button>
            </div>
          </div>

          <!-- Row 2: Full-Width 2-Column Glass Switcher (Mobile) -->
          <div class="grid grid-cols-2 p-0.5 rounded-xl bg-black/25 backdrop-blur-xs border border-white/15 shadow-inner w-full">
            <button id="btn-live-view-real-mobile"
                    type="button"
                    onclick="window.switchLiveStandingsView && window.switchLiveStandingsView('real')"
                    class="px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer bg-amber-500 text-slate-950 shadow-xs">
              <i class="fa-solid fa-list-ol text-[11px]"></i>
              <span>Reale</span>
            </button>
            <button id="btn-live-view-merit-mobile"
                    type="button"
                    onclick="window.switchLiveStandingsView && window.switchLiveStandingsView('merit')"
                    class="px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-white/75 hover:text-white hover:bg-white/10">
              <i class="fa-solid fa-scale-balanced text-[11px]"></i>
              <span>Merito</span>
            </button>
          </div>
        </div>
      </div>

      ${guideBoxHTML}
      ${realViewContainerHTML}
      ${meritViewContainerHTML}
    </div>
  `;
}

/**
 * Standard championship table for past/completed seasons or graceful fallback
 */
function renderStandardChampionshipTable(championship: CompetitionRecord): string {
  const isInProgress = !!championship.in_progress || championship.status === 'in_progress';
  const numericRanks = championship.ranking
    .map(r => r.rank)
    .filter((rk): rk is number => typeof rk === 'number' && rk > 0);
  const lastRank = numericRanks.length > 0 ? Math.max(...numericRanks) : 0;
  const isSpoonCompetition = LEAGUE.features.spoon && lastRank >= (LEAGUE.rules.spoonMinTeams || 8);

  const sortedRanking = [...championship.ranking].sort((a, b) => {
    const getWeight = (r: typeof a) => {
      if (typeof r.rank === 'number' && r.rank > 0) {
        if (!isInProgress && isSpoonCompetition && r.rank === lastRank) return 999999;
        return r.rank;
      }
      return 500000;
    };
    return getWeight(a) - getWeight(b);
  });

  let rowsHtml = '';
  sortedRanking.forEach(r => {
    let rankLabel = 'N/D';
    let rankBadgeClass = 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700/50';

    if (typeof r.rank === 'number' && r.rank > 0) {
      rankLabel = `#${r.rank}`;
      rankBadgeClass = 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

      if (!isInProgress) {
        if (r.rank === 1) {
          rankLabel = '🥇 1°<span class="hidden sm:inline"> Scudetto</span>';
          rankBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/25 dark:text-amber-300 dark:border-amber-500/40 font-black';
        } else if (r.rank === 2) {
          rankLabel = '🥈 2°<span class="hidden sm:inline"> Posto</span>';
          rankBadgeClass = 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600 font-bold';
        } else if (r.rank === 3) {
          rankLabel = '🥉 3°<span class="hidden sm:inline"> Posto</span>';
          rankBadgeClass = 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-700/25 dark:text-amber-400 dark:border-amber-700/40 font-bold';
        } else if (r.rank === lastRank && lastRank >= 8) {
          rankLabel = `🥄 ${r.rank}°<span class="hidden sm:inline"> Cucchiaio</span>`;
          rankBadgeClass = 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40 font-bold';
        }
      } else {
        if (r.rank === 1) {
          rankBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 font-bold';
        }
      }
    }

    const mgr = state.managers?.find(m => m.id === r.managerId);
    const managerName = mgr ? mgr.name : (r.coach || 'Sconosciuto');
    const hasValidPoints = typeof r.points === 'number' && r.points > 0;
    const ptsStr = hasValidPoints ? `${r.points} pt` : '-';
    const clickHandler = r.managerId ? `onclick="openProfileModal('${r.managerId}')"` : '';
    const cursorClass = r.managerId ? 'cursor-pointer hover:bg-amber-500/10' : '';

    rowsHtml += `
      <tr ${clickHandler} data-manager-id="${r.managerId || ''}" id="standings-row-${r.managerId || ''}" class="border-b last:border-b-0 transition-colors ${cursorClass}" style="border-color: var(--table-border);">
        <td class="py-2 sm:py-2.5 px-1.5 sm:px-3 text-center align-middle whitespace-nowrap w-14 sm:w-28">
          <span class="px-1.5 sm:px-2 py-0.5 rounded-lg text-[11px] sm:text-xs border shadow-sm inline-block ${rankBadgeClass}">
            ${rankLabel}
          </span>
        </td>
        <td class="py-2 sm:py-2.5 px-2 sm:px-3 text-left align-middle min-w-0">
          <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <img src="${resolveTeamLogo(r.teamName, r.logo)}" alt="${r.teamName}" 
                 class="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-contain shrink-0 bg-white/20 border border-slate-300 dark:border-slate-700 shadow-sm"
                 onerror="this.onerror=null; this.src='${getTeamFallbackCrest(r.teamName)}'">
            <div class="min-w-0 flex-1">
              <div class="font-bold text-xs sm:text-sm leading-snug break-words" style="color: var(--text-main); word-break: break-word;">
                ${r.teamName}
              </div>
              <div class="text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 mt-0.5 truncate" style="color: var(--accent-color, #f59e0b);">
                <i class="fa-solid fa-user-tie text-[9px] opacity-70 shrink-0"></i>
                <span class="truncate">${managerName}</span>
              </div>
            </div>
          </div>
        </td>
        <td class="py-2 sm:py-2.5 px-1.5 sm:px-3 text-right align-middle whitespace-nowrap font-mono text-xs sm:text-sm font-extrabold w-14 sm:w-20" style="color: var(--text-main);">
          ${ptsStr}
        </td>
      </tr>
    `;
  });

  return `
    <div class="albo-table-wrap rounded-2xl overflow-hidden border mb-6" style="border-color: var(--table-border); background-color: var(--table-surface);">
      <div class="px-3.5 sm:px-4 py-2.5 sm:py-3 border-b flex items-center justify-between" style="border-color: var(--table-border); background-color: var(--header-bg); color: var(--header-text);">
        <div class="flex items-center gap-2 font-sport font-bold text-xs sm:text-sm tracking-wide">
          ${renderTrophySVG('gold_cup', 'compact')}
          <span>${championship.name} (${championship.season})</span>
          ${isInProgress ? `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse"></span>
              In corso
            </span>
          ` : ''}
        </div>
        <span class="text-xs font-semibold opacity-75 shrink-0 ml-2">
          ${championship.ranking.length} Squadre
        </span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse table-auto sm:table-fixed">
          <thead>
            <tr class="border-b text-[10px] sm:text-[11px] uppercase tracking-wider opacity-70" style="border-color: var(--table-border);">
              <th class="py-2 px-1.5 sm:px-3 text-center w-14 sm:w-28">Posizione</th>
              <th class="py-2 px-2 sm:px-3 text-left">Squadra / Allenatore</th>
              <th class="py-2 px-1.5 sm:px-3 text-right w-14 sm:w-20">Punti</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Public export: renders championship table (live with 2-way switch if active, or standard)
 */
export function renderChampionshipTable(championship: CompetitionRecord): string {
  if (!championship || !championship.ranking || championship.ranking.length === 0) {
    return '';
  }

  const isInProgress = !!championship.in_progress || championship.status === 'in_progress';

  // If in progress, check if live season details are loaded
  if (isInProgress) {
    const liveData = getLiveSeasonDetails();
    if (liveData && liveData.season === championship.season && liveData.standings && liveData.standings.length > 0) {
      return renderLiveChampionshipTable(championship, liveData);
    }
  }

  return renderStandardChampionshipTable(championship);
}

// 2-Way View Switching Logic
const INACTIVE_TAB_CLASSES = ['text-white/75', 'hover:text-white', 'hover:bg-white/10'];
const ACTIVE_TAB_CLASSES = ['bg-amber-500', 'text-slate-950', 'shadow-xs'];

export function toggleMeritShareDropdown(target: 'desktop' | 'mobile', event?: Event): void {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const otherTarget = target === 'desktop' ? 'mobile' : 'desktop';
  const otherDd = document.getElementById(`merit-share-dropdown-${otherTarget}`);
  if (otherDd) otherDd.classList.add('hidden');

  const dd = document.getElementById(`merit-share-dropdown-${target}`);
  if (dd) dd.classList.toggle('hidden');
}

export function closeMeritShareDropdown(): void {
  const ddDesktop = document.getElementById('merit-share-dropdown-desktop');
  const ddMobile = document.getElementById('merit-share-dropdown-mobile');
  if (ddDesktop) ddDesktop.classList.add('hidden');
  if (ddMobile) ddMobile.classList.add('hidden');
}

export function switchLiveStandingsView(mode: 'real' | 'merit', updateUrl = true): void {
  if (typeof document === 'undefined') return;

  const btnReal = document.getElementById('btn-live-view-real');
  const btnRealMobile = document.getElementById('btn-live-view-real-mobile');
  const btnMerit = document.getElementById('btn-live-view-merit');
  const btnMeritMobile = document.getElementById('btn-live-view-merit-mobile');

  const viewReal = document.getElementById('live-view-real-container');
  const viewMerit = document.getElementById('live-view-merit-container');

  const guideReal = document.getElementById('guide-content-real');
  const guideMerit = document.getElementById('guide-content-merit');

  const realButtons = [btnReal, btnRealMobile].filter(Boolean) as HTMLElement[];
  const meritButtons = [btnMerit, btnMeritMobile].filter(Boolean) as HTMLElement[];

  closeMeritShareDropdown();

  if (mode === 'real') {
    realButtons.forEach(btn => {
      btn.classList.remove(...INACTIVE_TAB_CLASSES);
      btn.classList.add(...ACTIVE_TAB_CLASSES);
    });

    meritButtons.forEach(btn => {
      btn.classList.remove(...ACTIVE_TAB_CLASSES);
      btn.classList.add(...INACTIVE_TAB_CLASSES);
    });

    viewReal?.classList.remove('hidden');
    viewMerit?.classList.add('hidden');

    guideReal?.classList.remove('hidden');
    guideMerit?.classList.add('hidden');

    if (updateUrl && typeof window !== 'undefined' && window.history && window.location) {
      const url = new URL(window.location.href);
      if (url.searchParams.has('view')) {
        url.searchParams.delete('view');
        window.history.replaceState({ tab: 'seasons' }, '', url.toString());
      }
    }
  } else {
    meritButtons.forEach(btn => {
      btn.classList.remove(...INACTIVE_TAB_CLASSES);
      btn.classList.add(...ACTIVE_TAB_CLASSES);
    });

    realButtons.forEach(btn => {
      btn.classList.remove(...ACTIVE_TAB_CLASSES);
      btn.classList.add(...INACTIVE_TAB_CLASSES);
    });

    viewReal?.classList.add('hidden');
    viewMerit?.classList.remove('hidden');

    guideReal?.classList.add('hidden');
    guideMerit?.classList.remove('hidden');

    if (updateUrl && typeof window !== 'undefined' && window.history && window.location) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'seasons');
      url.searchParams.set('view', 'merit');
      window.history.replaceState({ tab: 'seasons', view: 'merit' }, '', url.toString());
    }
  }
}

export const toggleStandingsShareDropdown = toggleMeritShareDropdown;
export const closeStandingsShareDropdown = closeMeritShareDropdown;

declare global {
  interface Window {
    toggleLiveStandingsGuide?: () => void;
    switchLiveStandingsView?: (mode: 'real' | 'merit', updateUrl?: boolean) => void;
    switchRealSort?: (order: 'rank' | 'elo') => void;
    toggleRealEloMode?: (event?: Event) => void;
    switchMeritSort?: (order: 'xpts' | 'luck' | 'elo') => void;
    toggleMobileMeritSort?: () => void;
    toggleMeritEloMode?: (event?: Event) => void;
    toggleMeritShareDropdown?: (target: 'desktop' | 'mobile') => void;
    closeMeritShareDropdown?: () => void;
    toggleStandingsShareDropdown?: (target: 'desktop' | 'mobile') => void;
    closeStandingsShareDropdown?: () => void;
  }
}

if (typeof window !== 'undefined') {
  window.toggleLiveStandingsGuide = toggleLiveStandingsGuide;
  window.switchLiveStandingsView = switchLiveStandingsView;
  window.switchRealSort = switchRealSort;
  window.toggleRealEloMode = toggleRealEloMode;
  window.switchMeritSort = switchMeritSort;
  window.toggleMobileMeritSort = toggleMobileMeritSort;
  window.toggleMeritEloMode = toggleMeritEloMode;
  window.toggleMeritShareDropdown = toggleMeritShareDropdown;
  window.closeMeritShareDropdown = closeMeritShareDropdown;
  window.toggleStandingsShareDropdown = toggleStandingsShareDropdown;
  window.closeStandingsShareDropdown = closeStandingsShareDropdown;

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        !target.closest?.('#btn-merit-share-desktop') &&
        !target.closest?.('#btn-merit-share-mobile') &&
        !target.closest?.('.merit-share-btn') &&
        !target.closest?.('[id^="merit-share-dropdown-"]')
      ) {
        closeMeritShareDropdown();
      }
    });
  }
}
