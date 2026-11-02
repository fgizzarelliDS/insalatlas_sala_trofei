/**
 * src/components/board/seasons/TeamMatchesModal.ts
 * Main Controller for the Team Matchday Breakdown Modal:
 * - Wide layout (max-w-3xl md:max-w-4xl) preventing text truncation
 * - Two dedicated tabs: [ 📅 Calendario Partite ] & [ 📊 Scheda Monte Carlo & SoS ]
 * - Coordinates state, deep-linking (?team=), return navigation, and modular tab rendering
 */

import { getLiveSeasonDetails, loadLiveSeasonDetails } from './liveAnalytics';
import { state } from '@/state';
import { resolveTeamLogo } from '@/crests';
import {
  getEloMode,
  getManagerEloTrack,
  getEloBadgeClasses
} from '@/analytics/analyticsCore';
import { pushOpenModal, popCloseModal } from '@/components/modals/baseModal';
import {
  buildLeagueDistributionContext,
  buildHistoricalRoundContext,
  computeMatchOdds1X2,
  extractFallbackElo,
  resolveActiveSeasonKey,
  type LeagueDistributionContext
} from '@/analytics/oddsEngine';
import { computeLeagueSoS } from '@/analytics/sosEngine';
import type { LiveTeamMetrics, TeamSoSMetrics } from '@/types';
import type { EloTrackMode } from '@/types/analytics';
import type {
  TeamMatchesTab,
  TeamMatchesHistoryEntry,
  TeamMatchesReturnContext,
  TeamMatchEntry,
  ModalHeaderProps
} from './teamMatchesModal/types';
import { renderModalHeaderHTML } from './teamMatchesModal/modalHeader';
import { renderCalendarTabHTML } from './teamMatchesModal/calendarTab';
import { renderMonteCarloTabHTML, renderMonteCarloSectionHTML } from './teamMatchesModal/monteCarloTab';

export * from './teamMatchesModal/types';
export { renderMonteCarloSectionHTML };

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
let teamMatchesHistory: TeamMatchesHistoryEntry[] = [];
let currentlyDisplayedTeam: TeamMatchesHistoryEntry | null = null;
let currentActiveTab: TeamMatchesTab = 'calendar';

interface CachedTeamModalData {
  headerProps: ModalHeaderProps;
  matchesPlayed: TeamMatchEntry[];
  standings: LiveTeamMetrics[];
  activeMode: EloTrackMode;
  resolvedTeamName: string;
  resolvedManagerId?: string;
  luck?: LiveTeamMetrics['scheduleLuck'];
  totalLeagueRounds: number;
  lastCompletedRound: number;
  teamSoS?: TeamSoSMetrics;
}

let cachedModalData: CachedTeamModalData | null = null;

/**
 * Injects modal container into DOM if not already present.
 * Uses max-w-2xl matching TrophyModal and SeasonModal for a clean focused dialog.
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

let isDetailsExpanded = false;
let isCalendarExpanded = true;

export function toggleTeamMatchesCalendar(): void {
  isCalendarExpanded = !isCalendarExpanded;
  const content = document.getElementById('calendar-accordion-content');
  const chevron = document.getElementById('calendar-chevron');
  const btn = document.getElementById('calendar-toggle-btn');
  if (content && chevron && btn) {
    if (isCalendarExpanded) {
      content.classList.remove('hidden');
      chevron.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
      btn.textContent = 'Nascondi';
    } else {
      content.classList.add('hidden');
      chevron.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
      btn.textContent = 'Mostra Gare';
    }
  }
}

export function toggleTeamMatchesDetails(): void {
  isDetailsExpanded = !isDetailsExpanded;
  const el = document.getElementById('box-plot-details');
  const chevron = document.getElementById('chevron-details-btn');
  if (el && chevron) {
    if (isDetailsExpanded) {
      el.classList.remove('hidden');
      chevron.innerHTML = '<span>Nascondi Dettaglio</span><i class="fa-solid fa-chevron-up transition-transform duration-200"></i>';
    } else {
      el.classList.add('hidden');
      chevron.innerHTML = '<span>Mostra Dettaglio</span><i class="fa-solid fa-chevron-down transition-transform duration-200"></i>';
    }
  }
}

/**
 * Renders full modal inner DOM from cached data and current active tab
 */
function renderModalContent(): void {
  if (!cachedModalData) return;
  const container = document.getElementById('team-matches-modal-content');
  if (!container) return;

  const {
    headerProps,
    matchesPlayed,
    standings,
    activeMode,
    resolvedTeamName,
    resolvedManagerId,
    luck,
    totalLeagueRounds,
    lastCompletedRound,
    teamSoS
  } = cachedModalData;

  const escapedTeamName = resolvedTeamName.replace(/'/g, "\\'");

  const tabBodyHTML = currentActiveTab === 'calendar'
    ? renderCalendarTabHTML(matchesPlayed, standings, activeMode, resolvedTeamName)
    : renderMonteCarloTabHTML(luck, totalLeagueRounds, lastCompletedRound, teamSoS, getLiveSeasonDetails()?.mcMinRounds);

  container.innerHTML = `
    <!-- Modal Header and Tabs Switcher -->
    ${renderModalHeaderHTML({ ...headerProps, activeTab: currentActiveTab })}

    <!-- Modal Scrollable Body with Thin Scrollbar matching other modals -->
    <div class="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar"
         style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
      ${tabBodyHTML}
    </div>

    <!-- Modal Footer Actions -->
    <div class="p-3.5 sm:p-4 border-t flex items-center justify-between gap-3 shrink-0"
         style="border-color: var(--table-border); background-color: var(--table-surface);">
      ${teamSoS ? `
        <span class="text-[11px] sm:text-xs opacity-70" style="color: var(--text-muted);">
          SoS basato su <strong style="color: var(--text-main);">50% Elo + 50% Punti</strong> avversari futuri
        </span>
      ` : (resolvedManagerId ? `
        <button type="button"
                onclick="window.openManagerProfileFromMatches && window.openManagerProfileFromMatches('${resolvedManagerId}', '${escapedTeamName}');"
                class="px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer text-amber-500"
                style="background-color: var(--btn-bg); border-color: var(--btn-border);">
          <i class="fa-solid fa-id-card"></i>
          <span>Vedi Profilo Storico Allenatore</span>
        </button>
      ` : '<div></div>')}

      <button type="button" onclick="window.closeTeamMatchesModal && window.closeTeamMatchesModal()"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-sm">
        Chiudi
      </button>
    </div>
  `;
}

/**
 * Switches between 'calendar' and 'montecarlo' tabs
 */
export function switchTeamMatchesTab(tab: TeamMatchesTab): void {
  currentActiveTab = tab;
  renderModalContent();
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
  cachedModalData = null;

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
export async function openTeamMatchesModal(
  managerId?: string,
  teamName?: string,
  isBackNav = false,
  updateUrl = true,
  initialTab: TeamMatchesTab = 'calendar'
): Promise<void> {
  if (typeof document === 'undefined') return;
  ensureTeamMatchesModalMounted();

  let liveData = getLiveSeasonDetails();
  if (!liveData || !liveData.rounds) {
    liveData = await loadLiveSeasonDetails();
  }
  if (!liveData || !liveData.rounds) return;

  currentActiveTab = initialTab;

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

  const matchesPlayed: TeamMatchEntry[] = [];

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

      const getPreMatchElo = (st?: LiveTeamMetrics) => {
        if (!st) return 1500.0;
        const tr = getManagerEloTrack(st.elo, activeMode);
        if (!isHistorical) {
          return extractFallbackElo(st.elo, tr);
        }
        const targetSeason = liveData.season || resolveActiveSeasonKey();
        const pt = tr?.trajectory?.find(p =>
          p.round === r.roundNumber &&
          (p.season === targetSeason || (!p.season && targetSeason === resolveActiveSeasonKey())) &&
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

      const orientedCtx = isHome || matchCtx.profile.hfaZShift === 0
        ? matchCtx
        : { ...matchCtx, profile: { ...matchCtx.profile, hfaZShift: -matchCtx.profile.hfaZShift } };
      const odds = computeMatchOdds1X2(selectedElo, oppElo, orientedCtx, powerTeam, powerOpp);

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
        odds,
        oppStanding
      });
    }
  }

  // Compute League Strength of Schedule
  const leagueSoS = computeLeagueSoS(
    liveData.standings || [],
    liveData.rounds || [],
    liveData.lastCompletedRound || 0,
    activeMode
  );
  const teamSoS: TeamSoSMetrics | undefined = leagueSoS.get(resolvedTeamName)
    || leagueSoS.get(resolvedTeamName.toLowerCase())
    || (resolvedManagerId ? leagueSoS.get(resolvedManagerId) : undefined);

  const statusBadge = teamMetric?.statusBadge || '⚖️';
  const statusLabel = teamMetric?.statusLabel || 'Stabile';
  const mcMedian = luck?.monteCarlo?.medianPoints;

  const headerProps: ModalHeaderProps = {
    resolvedTeamName,
    resolvedManagerId,
    managerDisplayName,
    teamLogo,
    teamMetric,
    eloTrack,
    eloBadge,
    teamSoS,
    statusBadge,
    statusLabel,
    hasHistory: teamMatchesHistory.length > 0,
    activeTab: currentActiveTab,
    matchesCount: matchesPlayed.length,
    mcMedian,
    luck,
    xPts,
    deltaPts,
    ap,
    luckBadge,
    luckLabel,
    luckZ
  };

  cachedModalData = {
    headerProps,
    matchesPlayed,
    standings: liveData.standings || [],
    activeMode,
    resolvedTeamName,
    resolvedManagerId,
    luck,
    totalLeagueRounds: liveData.totalRounds || liveData.rounds?.length || 26,
    lastCompletedRound: liveData.lastCompletedRound || 0,
    teamSoS
  };

  renderModalContent();

  const dialog = document.getElementById('team-matches-dialog');
  if (dialog) {
    dialog.className = "w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative transition-all duration-300";
  }

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
  window.switchTeamMatchesTab = switchTeamMatchesTab;
  window.openManagerProfileFromMatches = openManagerProfileFromMatches;
  window.navigateBackTeamMatchesModal = navigateBackTeamMatchesModal;
  window.toggleTeamMatchesShareDropdown = toggleTeamMatchesShareDropdown;
  window.closeTeamMatchesShareDropdown = closeTeamMatchesShareDropdown;
  window.toggleTeamMatchesCalendar = toggleTeamMatchesCalendar;
  window.toggleTeamMatchesDetails = toggleTeamMatchesDetails;
}
