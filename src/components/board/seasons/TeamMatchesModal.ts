import {
  getLiveSeasonDetails,
  loadLiveSeasonDetails,
  renderLuckBadgeHTML,
  renderDeltaPointsPillHTML
} from './liveAnalytics';
import { state } from '@/state';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import { escapeHtml } from '@/utils/dom';
import {
  getEloMode,
  getManagerEloTrack,
  getEloBadgeClasses,
  formatElo,
  formatEloDelta
} from '@/analytics/analyticsCore';
import { pushOpenModal, popCloseModal } from '@/components/modals/baseModal';
import {
  buildLeagueDistributionContext,
  buildHistoricalRoundContext,
  computeMatchOdds1X2,
  extractFallbackElo,
  type MatchOdds1X2,
  type LeagueDistributionContext
} from './nextRoundMetrics';
import type { LiveTeamMetrics } from '@/types';

/**
 * Return context preserved when navigating from Team Matches breakdown to a manager profile
 */
export interface TeamMatchesReturnContext {
  managerId?: string;
  teamName?: string;
}

let teamMatchesReturnContext: TeamMatchesReturnContext | null = null;

export function getTeamMatchesReturnContext(): TeamMatchesReturnContext | null {
  return teamMatchesReturnContext;
}

export function setTeamMatchesReturnContext(context: TeamMatchesReturnContext | null): void {
  teamMatchesReturnContext = context;
}

export function clearTeamMatchesReturnContext(): void {
  teamMatchesReturnContext = null;
}

let isShareDismissBound = false;

/**
 * Injects modal container into DOM if not already present
 */
function ensureTeamMatchesModalMounted(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('team-matches-modal')) return;

  const modalHtml = `
    <div id="team-matches-modal"
      class="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-sm hidden items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div id="team-matches-dialog"
        class="w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative transition-all duration-300"
        style="background-color: var(--modal-bg); border-color: var(--modal-border); color: var(--modal-text);">
        <div id="team-matches-modal-content" class="flex flex-col h-full overflow-hidden"></div>
      </div>
    </div>
  `;

  if (document.body && typeof document.body.insertAdjacentHTML === 'function') {
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  const modal = document.getElementById('team-matches-modal');
  modal?.addEventListener?.('click', (e) => {
    if (e.target === modal) {
      closeTeamMatchesModal();
    }
  });

  if (!isShareDismissBound && typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest?.('#btn-team-matches-share') && !target.closest?.('#team-matches-share-dropdown')) {
        closeTeamMatchesShareDropdown();
      }
    });
    isShareDismissBound = true;
  }
}

interface TeamMatchesHistoryEntry {
  managerId?: string;
  teamName: string;
}

let teamMatchesHistory: TeamMatchesHistoryEntry[] = [];
let currentlyDisplayedTeam: TeamMatchesHistoryEntry | null = null;

export function navigateBackTeamMatchesModal(): void {
  const prev = teamMatchesHistory.pop();
  if (prev) {
    openTeamMatchesModal(prev.managerId, prev.teamName, true);
  }
}

export function toggleTeamMatchesShareDropdown(event?: Event): void {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const dd = document.getElementById('team-matches-share-dropdown');
  if (dd) dd.classList.toggle('hidden');
}

export function closeTeamMatchesShareDropdown(): void {
  const dd = document.getElementById('team-matches-share-dropdown');
  if (dd) dd.classList.add('hidden');
}

/**
 * Closes the team matches modal
 */
export function closeTeamMatchesModal(updateUrl = true): void {
  popCloseModal('team-matches-modal');
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('team-matches-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  closeTeamMatchesShareDropdown();
  teamMatchesHistory = [];
  currentlyDisplayedTeam = null;

  if (updateUrl && typeof window !== 'undefined' && window.history && window.location) {
    const url = new URL(window.location.href);
    if (url.searchParams.has('team')) {
      url.searchParams.delete('team');
      window.history.replaceState({ tab: 'seasons' }, '', url.toString());
    }
  }
}

/**
 * Navigates to a manager profile while preserving the team matches return context
 */
export function openManagerProfileFromMatches(managerId: string, teamName: string): void {
  setTeamMatchesReturnContext({ managerId, teamName });
  closeTeamMatchesModal(false);
  if (typeof window !== 'undefined' && window.openProfileModal) {
    window.openProfileModal(managerId);
  }
}

/**
 * Opens the interactive Team Matchday Breakdown Modal for a specific team
 */
export async function openTeamMatchesModal(managerId?: string, teamName?: string, isBackNav = false, updateUrl = true): Promise<void> {
  if (typeof document === 'undefined') return;
  ensureTeamMatchesModalMounted();

  let liveData = getLiveSeasonDetails();
  if (!liveData || !liveData.rounds) {
    liveData = await loadLiveSeasonDetails();
  }
  if (!liveData || !liveData.rounds) return;

  // Locate team stats in standings (resilient case-insensitive matching)
  const searchName = teamName?.trim().toLowerCase();
  const teamMetric = liveData.standings.find(
    s => (managerId && s.managerId === managerId) ||
         (searchName && (
           s.teamName.trim().toLowerCase() === searchName ||
           (s.managerId && s.managerId.toLowerCase() === searchName) ||
           (s.coach && s.coach.trim().toLowerCase() === searchName)
         ))
  );

  const resolvedTeamName = teamMetric?.teamName || teamName || 'Squadra';
  const resolvedManagerId = teamMetric?.managerId || managerId;

  if (updateUrl && typeof window !== 'undefined' && window.history && window.location) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'seasons');
    url.searchParams.set('team', resolvedTeamName);
    if (!isBackNav) {
      window.history.pushState({ team: resolvedTeamName, tab: 'seasons' }, '', url.toString());
    } else {
      window.history.replaceState({ team: resolvedTeamName, tab: 'seasons' }, '', url.toString());
    }
  }

  if (!isBackNav) {
    const modal = document.getElementById('team-matches-modal');
    const isModalCurrentlyOpen = modal && !modal.classList.contains('hidden');
    if (isModalCurrentlyOpen && currentlyDisplayedTeam && currentlyDisplayedTeam.teamName !== resolvedTeamName) {
      teamMatchesHistory.push(currentlyDisplayedTeam);
    } else if (!isModalCurrentlyOpen) {
      teamMatchesHistory = [];
    }
  }
  currentlyDisplayedTeam = { managerId: resolvedManagerId, teamName: resolvedTeamName };

  // Manager details
  const mgr = state.managers?.find(m => m.id === resolvedManagerId);
  const managerDisplayName = mgr ? mgr.name : (teamMetric?.coach || 'Allenatore');
  const teamLogo = resolveTeamLogo(resolvedTeamName, teamMetric?.logo);
  const escapedTeamName = resolvedTeamName.replace(/'/g, "\\'");

  const luck = teamMetric?.scheduleLuck;
  const xPts = luck?.xPoints;
  const deltaPts = luck?.deltaPoints;
  const ap = luck?.allPlayRecord;
  const luckBadge = luck?.luckBadge;
  const luckLabel = luck?.luckLabel;
  const luckZ = luck?.luckZScore;

  // Index authentic team logos from standings
  const teamLogos = new Map<string, string>();
  for (const s of liveData.standings) {
    if (s.logo) {
      teamLogos.set(s.teamName, s.logo);
      if (s.managerId) teamLogos.set(s.managerId, s.logo);
    }
  }

  // Extract matches for this team across all rounds
  const activeMode = getEloMode();
  const eloTrack = getManagerEloTrack(teamMetric?.elo, activeMode);
  const eloBadge = eloTrack ? getEloBadgeClasses(eloTrack.current) : { bg: '', text: '', border: '' };

  const liveCtx = buildLeagueDistributionContext(liveData.standings || [], activeMode, liveData.season);
  const historicalCtxCache = new Map<number, LeagueDistributionContext>();

  const matchesPlayed: Array<{
    roundNumber: number;
    isHome: boolean;
    oppTeamName: string;
    oppManagerId?: string;
    oppCoach?: string;
    oppLogo?: string;
    outcome: 'W' | 'D' | 'L' | null;
    isPlayed: boolean;
    winProb: number;
    eloDelta: number | null;
    odds: MatchOdds1X2;
  }> = [];

  for (const r of liveData.rounds) {
    for (const m of r.matches || []) {
      const isHome = Boolean(m.homeTeam === resolvedTeamName || (resolvedManagerId && m.homeManagerId === resolvedManagerId));
      const isAway = Boolean(m.awayTeam === resolvedTeamName || (resolvedManagerId && m.awayManagerId === resolvedManagerId));

      if (!isHome && !isAway) continue;

      const oppTeam = isHome ? m.awayTeam : m.homeTeam;
      const oppMgrId = isHome ? m.awayManagerId : m.homeManagerId;
      const oppLogo = (oppMgrId && teamLogos.get(oppMgrId))
        || teamLogos.get(oppTeam)
        || (isHome ? m.awayLogo : m.homeLogo);

      let outcome: 'W' | 'D' | 'L' | null = null;
      let isPlayed = false;

      if (m.homeOutcome !== undefined || m.awayOutcome !== undefined) {
        isPlayed = Boolean(m.isPlayed);
        outcome = isPlayed ? ((isHome ? m.homeOutcome : m.awayOutcome) ?? null) : null;
      } else if (m.homeScore !== undefined && m.awayScore !== undefined) {
        const teamScore = isHome ? m.homeScore : m.awayScore;
        const oppScore = isHome ? m.awayScore : m.homeScore;
        isPlayed = Boolean(
          (m.homeFantaPoints !== undefined && m.homeFantaPoints > 0) ||
          (m.awayFantaPoints !== undefined && m.awayFantaPoints > 0) ||
          (liveData.lastCompletedRound && r.roundNumber <= liveData.lastCompletedRound) ||
          m.isPlayed ||
          m.played
        );
        if (isPlayed) {
          if (teamScore > oppScore) outcome = 'W';
          else if (teamScore < oppScore) outcome = 'L';
          else outcome = 'D';
        }
      }

      const rawDelta = activeMode === 'historical'
        ? m.eloDeltaHomeHistorical
        : activeMode === 'atlas'
        ? m.eloDeltaHomeAtlas
        : m.eloDeltaHomeFlat;

      let eloDelta: number | null = null;
      if (rawDelta !== undefined && rawDelta !== null) {
        eloDelta = isHome ? rawDelta : -rawDelta;
      }

      // Context resolution: pre-match historical context for completed rounds, live forecast for upcoming rounds
      const isHistorical = isPlayed && r.roundNumber <= (liveData.lastCompletedRound || 0);
      let matchCtx = liveCtx;
      if (isHistorical) {
        if (!historicalCtxCache.has(r.roundNumber)) {
          historicalCtxCache.set(r.roundNumber, buildHistoricalRoundContext(liveData, r.roundNumber, activeMode));
        }
        matchCtx = historicalCtxCache.get(r.roundNumber)!;
      }

      const oppStanding = liveData.standings.find(
        s => (oppMgrId && s.managerId === oppMgrId) ||
             (s.teamName.trim().toLowerCase() === oppTeam.trim().toLowerCase())
      );

      // Pre-match Elo ratings
      const getPreMatchElo = (st?: LiveTeamMetrics) => {
        if (!st) return 1500.0;
        const tr = getManagerEloTrack(st.elo, activeMode);
        if (!isHistorical) {
          return extractFallbackElo(st.elo, tr);
        }
        const targetSeason = liveData.season || '2026/27';
        const pt = tr?.trajectory?.find(p =>
          p.round === r.roundNumber &&
          (p.season === targetSeason || (!p.season && targetSeason === '2026/27')) &&
          (p.competitionCategory === 'Campionato' || !p.competitionCategory)
        );
        if (pt) {
          return pt.elo - (pt.delta ?? 0);
        }
        return extractFallbackElo(st.elo, tr);
      };

      const selectedElo = getPreMatchElo(teamMetric);
      const oppElo = getPreMatchElo(oppStanding);

      const powerTeam = (resolvedManagerId ? matchCtx.managerPowers.get(resolvedManagerId) : undefined)
        ?? matchCtx.managerPowers.get(resolvedTeamName.toLowerCase());
      const powerOpp = (oppMgrId ? matchCtx.managerPowers.get(oppMgrId) : undefined)
        ?? matchCtx.managerPowers.get(oppTeam.toLowerCase());

      const odds = computeMatchOdds1X2(selectedElo, oppElo, matchCtx, powerTeam, powerOpp);

      matchesPlayed.push({
        roundNumber: r.roundNumber,
        isHome,
        oppTeamName: oppTeam,
        oppManagerId: oppMgrId,
        oppLogo,
        outcome,
        isPlayed,
        winProb: odds.h2hHome,
        eloDelta,
        odds
      });
    }
  }

  // Matches list HTML - clean minimalist view: [G #] [Logo] [Name] -> [Outcome] or [-]
  const matchesListHTML = matchesPlayed.map(match => {
    let outcomeBadgeClass = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    let outcomeIcon = 'fa-minus';
    let outcomeText = 'PAREGGIO';

    if (match.outcome === 'W') {
      outcomeBadgeClass = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      outcomeIcon = 'fa-check';
      outcomeText = 'VITTORIA';
    } else if (match.outcome === 'L') {
      outcomeBadgeClass = 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
      outcomeIcon = 'fa-xmark';
      outcomeText = 'SCONFITTA';
    }

    const oppLogo = resolveTeamLogo(match.oppTeamName, match.oppLogo);
    const escapedOppTeamName = match.oppTeamName.replace(/'/g, "\\'");
    const eloDeltaColor = match.eloDelta && match.eloDelta > 0 ? 'text-emerald-400' : match.eloDelta && match.eloDelta < 0 ? 'text-rose-400' : 'text-slate-400';

    return `
      <div onclick="window.openTeamMatchesModal && window.openTeamMatchesModal('${match.oppManagerId || ''}', '${escapedOppTeamName}');"
           class="p-2.5 sm:p-3 rounded-2xl border flex flex-col gap-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer select-none"
           style="border-color: var(--table-border); background-color: var(--table-surface);"
           title="Vedi calendario di ${match.oppTeamName}">
        <div class="flex items-center justify-between gap-2.5 sm:gap-3">
          <!-- Round number & Opponent (Logo + Name side by side) -->
          <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div class="w-8 sm:w-10 h-7 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-xs bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30">
              <span class="font-sport font-black text-xs sm:text-sm tracking-tight">G${match.roundNumber}</span>
            </div>

            <div class="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
              <img src="${oppLogo}" alt="${match.oppTeamName}"
                   class="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-contain shrink-0 bg-white/10 border border-slate-300 dark:border-slate-700 shadow-xs"
                   onerror="this.onerror=null; this.src='${getTeamFallbackCrest(match.oppTeamName)}'">
              <span class="font-bold text-xs sm:text-sm leading-snug break-words" style="color: var(--text-main);">${match.oppTeamName}</span>
            </div>
          </div>

          <!-- Outcome Badge & Elo Rating Impact -->
          <div class="shrink-0 flex items-center justify-end gap-1.5 sm:gap-2">
            ${match.isPlayed ? `
              ${match.eloDelta !== null && match.eloDelta !== undefined ? `
                <div class="flex flex-col items-end text-right shrink-0">
                  <span class="text-[10px] sm:text-[11px] font-mono font-bold ${eloDeltaColor}">${formatEloDelta(match.eloDelta)} pt</span>
                </div>
              ` : ''}
              <span class="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[10px] sm:text-xs font-black tracking-wider uppercase border flex items-center gap-1 shadow-xs shrink-0 ${outcomeBadgeClass}">
                <i class="fa-solid ${outcomeIcon} text-[9px] sm:text-[10px]"></i>
                <span>${outcomeText}</span>
              </span>
            ` : `
              <span class="text-xs font-bold text-slate-400 dark:text-slate-500 px-2 py-1 shrink-0 select-none">-</span>
            `}
          </div>
        </div>

        <!-- H2H Duel Probability Gauge & 1X2 Odds Pills -->
        <div class="pt-1.5 border-t border-[var(--table-border)]/50 flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-[10px] font-mono font-bold">
            <span class="text-emerald-500 dark:text-emerald-400 font-black">${Math.round(match.odds.h2hHome)}%</span>
            <span class="text-[9px] uppercase tracking-wider opacity-60 font-sans font-semibold" style="color: var(--text-muted);">
              Probabilità H2H
            </span>
            <span class="text-rose-500 dark:text-rose-400 font-black">${100 - Math.round(match.odds.h2hHome)}%</span>
          </div>
          <div class="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-700/40">
            <div style="width: ${match.odds.h2hHome}%;" class="h-full bg-emerald-500 transition-all duration-300"></div>
            <div style="width: ${match.odds.h2hAway}%;" class="h-full bg-rose-500 transition-all duration-300"></div>
          </div>

          <!-- 1X2 Match Odds Board (Agnostic Standardized Davidson Model) -->
          <div class="grid grid-cols-3 gap-1 pt-1 text-center select-none font-mono">
            <div class="py-0.5 px-1 rounded-lg border flex items-center justify-center gap-1.5 bg-black/5 dark:bg-white/5 shadow-2xs"
                 style="border-color: var(--input-border);"
                 title="Quota 1 (Vittoria ${escapeHtml(teamName)}): ${match.odds.p1}% su 3 esiti • ${match.odds.h2hHome.toFixed(0)}% H2H">
              <span class="text-[8px] font-bold opacity-50" style="color: var(--text-muted);">1</span>
              <span class="text-[11px] font-black text-emerald-600 dark:text-emerald-400">${match.odds.q1.toFixed(2)}</span>
            </div>
            <div class="py-0.5 px-1 rounded-lg border flex items-center justify-center gap-1.5 bg-black/5 dark:bg-white/5 shadow-2xs"
                 style="border-color: var(--input-border);"
                 title="Quota X (Pareggio): ${match.odds.pX}% su 3 esiti">
              <span class="text-[8px] font-bold opacity-50" style="color: var(--text-muted);">X</span>
              <span class="text-[11px] font-black text-amber-600 dark:text-amber-400">${match.odds.qX.toFixed(2)}</span>
            </div>
            <div class="py-0.5 px-1 rounded-lg border flex items-center justify-center gap-1.5 bg-black/5 dark:bg-white/5 shadow-2xs"
                 style="border-color: var(--input-border);"
                 title="Quota 2 (Vittoria ${escapeHtml(match.oppTeamName)}): ${match.odds.p2}% su 3 esiti • ${match.odds.h2hAway.toFixed(0)}% H2H">
              <span class="text-[8px] font-bold opacity-50" style="color: var(--text-muted);">2</span>
              <span class="text-[11px] font-black text-rose-600 dark:text-rose-400">${match.odds.q2.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Status badge styling
  const statusBadge = teamMetric?.statusBadge || '⚖️';
  const statusLabel = teamMetric?.statusLabel || 'Stabile';

  const modalContainer = document.getElementById('team-matches-modal-content');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <!-- Modal Header matching TrophyModal & SeasonModal unified style -->
    <div class="p-4 sm:p-5 border-b flex items-center justify-between gap-3 shrink-0"
         style="border-color: var(--table-border);">
      <div class="flex items-center gap-3 min-w-0">
        ${teamMatchesHistory.length > 0 ? `
          <button type="button" onclick="window.navigateBackTeamMatchesModal && window.navigateBackTeamMatchesModal()"
                  class="w-8 h-8 rounded-full flex items-center justify-center font-bold transition border shadow-xs hover:bg-amber-500/10 active:scale-95 text-amber-500 shrink-0 cursor-pointer"
                  style="background-color: var(--btn-bg); border-color: var(--btn-border);"
                  title="Torna alla squadra precedente">
            <i class="fa-solid fa-arrow-left text-xs"></i>
          </button>
        ` : ''}
        <img src="${teamLogo}" alt="${escapeHtml(resolvedTeamName)}"
             class="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-contain shrink-0 bg-white/20 border border-slate-300 dark:border-slate-700 shadow-md"
             onerror="this.onerror=null; this.src='${getTeamFallbackCrest(resolvedTeamName)}'">
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="font-sport font-black text-base sm:text-xl truncate" style="color: var(--text-main);">${escapeHtml(resolvedTeamName)}</h3>
            <span class="px-2 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 shadow-xs bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30">
              <span>${statusBadge}</span>
              <span class="text-[10px] uppercase font-bold">${statusLabel}</span>
            </span>
            ${eloTrack ? `
              <span class="px-2 py-0.5 rounded-full text-xs font-bold font-mono border flex items-center gap-1 shadow-xs ${eloBadge.bg} ${eloBadge.text} ${eloBadge.border}">
                <i class="fa-solid fa-bolt text-[10px]"></i>
                <span>${formatElo(eloTrack.current)} Elo</span>
              </span>
            ` : ''}
          </div>
          <div class="text-xs font-semibold flex items-center gap-1.5 mt-0.5 flex-wrap" style="color: var(--text-muted);">
            <i class="fa-solid fa-user-tie text-[10px] opacity-70 shrink-0" style="color: var(--accent-color);"></i>
            <span class="font-bold" style="color: var(--accent-color);">${escapeHtml(managerDisplayName)}</span>
            ${teamMetric ? `<span class="opacity-60 text-[11px] whitespace-nowrap">• #${teamMetric.rank} in classifica (${teamMetric.points !== undefined && teamMetric.points !== null ? `${teamMetric.points} pt` : '- pt'})</span>` : ''}
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <!-- Share Dropdown Button -->
        <div class="relative">
          <button type="button"
                  id="btn-team-matches-share"
                  onclick="window.toggleTeamMatchesShareDropdown && window.toggleTeamMatchesShareDropdown(event)"
                  class="px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 hover:scale-105 active:scale-95 cursor-pointer text-amber-500 shadow-xs"
                  style="background-color: var(--btn-bg); border-color: var(--btn-border);"
                  title="Condividi calendario e statistiche">
            <i class="fa-solid fa-share-nodes"></i>
            <span class="hidden sm:inline">Condividi</span>
            <i class="fa-solid fa-chevron-down text-[10px] ml-0.5 opacity-70"></i>
          </button>

          <!-- Dropdown Popover -->
          <div id="team-matches-share-dropdown"
               class="hidden absolute right-0 top-full mt-1.5 w-60 rounded-2xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md"
               style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--modal-text);">
            <button type="button"
                    onclick="window.exportTeamMatchesPNG && window.exportTeamMatchesPNG('${escapedTeamName}'); window.closeTeamMatchesShareDropdown && window.closeTeamMatchesShareDropdown();"
                    class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
              <i class="fa-solid fa-download text-amber-500"></i>
              <span>Scarica Scheda PNG (HD)</span>
            </button>
            <button type="button"
                    onclick="window.copyTeamMatchesToClipboard && window.copyTeamMatchesToClipboard('${escapedTeamName}'); window.closeTeamMatchesShareDropdown && window.closeTeamMatchesShareDropdown();"
                    class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
              <i class="fa-solid fa-copy text-emerald-500"></i>
              <span>Copia per WhatsApp</span>
            </button>
            <button type="button"
                    onclick="window.shareTeamMatchesWhatsApp && window.shareTeamMatchesWhatsApp('${escapedTeamName}'); window.closeTeamMatchesShareDropdown && window.closeTeamMatchesShareDropdown();"
                    class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
              <i class="fa-brands fa-whatsapp text-emerald-500"></i>
              <span>Invia Link WhatsApp</span>
            </button>
          </div>
        </div>

        <button type="button" onclick="window.closeTeamMatchesModal && window.closeTeamMatchesModal()"
                class="w-8 h-8 rounded-full flex items-center justify-center font-bold opacity-75 hover:opacity-100 transition border shadow-xs"
                style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);"
                title="Chiudi">
          ✕
        </button>
      </div>
    </div>

    <!-- Analytical Summary Strip (Merit & Schedule Luck) -->
    ${luck && xPts !== undefined && deltaPts !== undefined && ap ? `
      <div class="px-4 py-2 sm:px-5 sm:py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs"
           style="border-color: var(--table-border); background-color: var(--table-surface);">
        <!-- xPTS & Delta & Luck Badge -->
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-mono font-bold text-xs" style="color: var(--text-main);">${xPts.toFixed(2)} xPTS</span>
          <span class="text-[11px] opacity-75 font-semibold" style="color: var(--text-muted);">vs ${teamMetric?.points !== undefined && teamMetric?.points !== null ? `${teamMetric.points} pt` : '- pt'}</span>
          ${renderDeltaPointsPillHTML(deltaPts, teamMetric?.points !== undefined && teamMetric?.points !== null)}
          ${luckBadge && luckLabel && luckZ !== undefined ? renderLuckBadgeHTML(luckBadge, luckLabel, luckZ, true) : ''}
        </div>
        <!-- All-Play Record -->
        <div class="text-[11px] font-mono opacity-80" style="color: var(--text-muted);">
          Tutti vs Tutti: <strong style="color: var(--text-main);">${ap.wins}V ${ap.draws}N ${ap.losses}P</strong> (${ap.winPct}%)
        </div>
      </div>
    ` : ''}

    <!-- Matches Scrollable Body -->
    <div class="p-4 sm:p-5 flex-1 overflow-y-auto space-y-2.5">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-xs uppercase font-extrabold tracking-wider flex items-center gap-1.5" style="color: var(--accent-color);">
          <i class="fa-solid fa-calendar-days text-amber-500"></i>
          <span>Calendario &amp; Risultati (${matchesPlayed.length} Gare)</span>
        </span>
      </div>
      ${matchesListHTML || '<div class="p-8 text-center text-sm font-semibold opacity-60">Nessuna partita registrata.</div>'}
    </div>

    <!-- Modal Footer Actions matching TrophyModal palette -->
    <div class="p-3.5 sm:p-4 border-t flex items-center justify-between gap-3 shrink-0"
         style="border-color: var(--table-border); background-color: var(--table-surface);">
      ${resolvedManagerId ? `
        <button type="button"
                onclick="window.openManagerProfileFromMatches && window.openManagerProfileFromMatches('${resolvedManagerId}', '${escapedTeamName}');"
                class="px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer text-amber-500"
                style="background-color: var(--btn-bg); border-color: var(--btn-border);">
          <i class="fa-solid fa-id-card"></i>
          <span>Vedi Profilo Storico Allenatore</span>
        </button>
      ` : '<div></div>'}

      <button type="button" onclick="window.closeTeamMatchesModal && window.closeTeamMatchesModal()"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-sm">
        Chiudi
      </button>
    </div>
  `;

  const modal = document.getElementById('team-matches-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    pushOpenModal('team-matches-modal', () => closeTeamMatchesModal(true));
  }
}

// Global window augmentation for inline HTML event handlers
if (typeof window !== 'undefined') {
  window.openTeamMatchesModal = openTeamMatchesModal;
  window.closeTeamMatchesModal = closeTeamMatchesModal;
  window.openManagerProfileFromMatches = openManagerProfileFromMatches;
  window.navigateBackTeamMatchesModal = navigateBackTeamMatchesModal;
  window.toggleTeamMatchesShareDropdown = toggleTeamMatchesShareDropdown;
  window.closeTeamMatchesShareDropdown = closeTeamMatchesShareDropdown;
}
