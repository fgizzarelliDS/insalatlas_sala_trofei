import { getLiveSeasonDetails } from './liveAnalytics';
import { state } from '@/state';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';

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

let isEscBound = false;

function handleEscKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    const modal = document.getElementById('team-matches-modal');
    if (modal && !modal.classList.contains('hidden')) {
      closeTeamMatchesModal();
    }
  }
}

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

  if (!isEscBound && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', handleEscKey);
    isEscBound = true;
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

/**
 * Closes the team matches modal
 */
export function closeTeamMatchesModal(): void {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('team-matches-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  teamMatchesHistory = [];
  currentlyDisplayedTeam = null;
}

/**
 * Navigates to a manager profile while preserving the team matches return context
 */
export function openManagerProfileFromMatches(managerId: string, teamName: string): void {
  setTeamMatchesReturnContext({ managerId, teamName });
  closeTeamMatchesModal();
  if (typeof window !== 'undefined' && (window as unknown as { openProfileModal?: (id: string) => void }).openProfileModal) {
    (window as unknown as { openProfileModal: (id: string) => void }).openProfileModal(managerId);
  }
}

/**
 * Opens the interactive Team Matchday Breakdown Modal for a specific team
 */
export function openTeamMatchesModal(managerId?: string, teamName?: string, isBackNav = false): void {
  if (typeof document === 'undefined') return;
  ensureTeamMatchesModalMounted();

  const liveData = getLiveSeasonDetails();
  if (!liveData || !liveData.rounds) return;

  // Locate team stats in standings
  const teamMetric = liveData.standings.find(
    s => (managerId && s.managerId === managerId) || (teamName && s.teamName === teamName)
  );

  const resolvedTeamName = teamMetric?.teamName || teamName || 'Squadra';
  const resolvedManagerId = teamMetric?.managerId || managerId;

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

  // Extract matches for this team across all rounds
  const matchesPlayed: Array<{
    roundNumber: number;
    isHome: boolean;
    oppTeamName: string;
    oppManagerId?: string;
    oppCoach?: string;
    oppLogo?: string;
    outcome: 'W' | 'D' | 'L' | null;
    isPlayed: boolean;
  }> = [];

  for (const r of liveData.rounds) {
    for (const m of r.matches || []) {
      const isHome = Boolean(m.homeTeam === resolvedTeamName || (resolvedManagerId && m.homeManagerId === resolvedManagerId));
      const isAway = Boolean(m.awayTeam === resolvedTeamName || (resolvedManagerId && m.awayManagerId === resolvedManagerId));

      if (!isHome && !isAway) continue;

      const teamScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;
      const oppTeam = isHome ? m.awayTeam : m.homeTeam;
      const oppMgrId = isHome ? m.awayManagerId : m.homeManagerId;
      const oppLogo = isHome ? m.awayLogo : m.homeLogo;

      const isPlayed = Boolean(
        (m.homeFantaPoints !== undefined && m.homeFantaPoints > 0) ||
        (m.awayFantaPoints !== undefined && m.awayFantaPoints > 0) ||
        (liveData.lastCompletedRound && r.roundNumber <= liveData.lastCompletedRound) ||
        (m as any).isPlayed ||
        (m as any).played
      );

      let outcome: 'W' | 'D' | 'L' | null = null;
      if (isPlayed) {
        if (teamScore > oppScore) outcome = 'W';
        else if (teamScore < oppScore) outcome = 'L';
        else outcome = 'D';
      }

      matchesPlayed.push({
        roundNumber: r.roundNumber,
        isHome,
        oppTeamName: oppTeam,
        oppManagerId: oppMgrId,
        oppLogo,
        outcome,
        isPlayed
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

    return `
      <div onclick="window.openTeamMatchesModal && window.openTeamMatchesModal('${match.oppManagerId || ''}', '${escapedOppTeamName}');"
           class="p-2.5 sm:p-3 rounded-2xl border flex items-center justify-between gap-2.5 sm:gap-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer select-none"
           style="border-color: var(--table-border); background-color: var(--table-surface);"
           title="Vedi calendario di ${match.oppTeamName}">
        <!-- Round number & Opponent (Logo + Name side by side) -->
        <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div class="min-w-[2.25rem] sm:min-w-[2.5rem] h-7 sm:h-8 px-1.5 rounded-xl flex items-center justify-center shrink-0 border shadow-xs bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30">
            <span class="font-sport font-black text-xs sm:text-sm tracking-tight">G${match.roundNumber}</span>
          </div>

          <div class="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <img src="${oppLogo}" alt="${match.oppTeamName}"
                 class="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-contain shrink-0 bg-white/10 border border-slate-300 dark:border-slate-700 shadow-xs"
                 onerror="this.onerror=null; this.src='${getTeamFallbackCrest(match.oppTeamName)}'">
            <span class="font-bold text-xs sm:text-sm truncate" style="color: var(--text-main);">${match.oppTeamName}</span>
          </div>
        </div>

        <!-- Outcome Badge ONLY (no numeric score) or simple '-' if not yet played -->
        <div class="shrink-0 flex items-center justify-end min-w-[2rem]">
          ${match.isPlayed && match.outcome ? `
            <span class="px-2.5 py-1 rounded-xl text-xs font-black tracking-wider uppercase border flex items-center gap-1.5 shadow-xs ${outcomeBadgeClass}">
              <i class="fa-solid ${outcomeIcon} text-[10px]"></i>
              <span>${outcomeText}</span>
            </span>
          ` : `
            <span class="text-sm font-bold text-slate-400 dark:text-slate-500 px-3 py-1 select-none">-</span>
          `}
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
        <img src="${teamLogo}" alt="${resolvedTeamName}"
             class="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-contain shrink-0 bg-white/20 border border-slate-300 dark:border-slate-700 shadow-md"
             onerror="this.onerror=null; this.src='${getTeamFallbackCrest(resolvedTeamName)}'">
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="font-sport font-black text-base sm:text-xl truncate" style="color: var(--text-main);">${resolvedTeamName}</h3>
            <span class="px-2 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 shadow-xs bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30">
              <span>${statusBadge}</span>
              <span class="text-[10px] uppercase font-bold">${statusLabel}</span>
            </span>
          </div>
          <div class="text-xs font-semibold flex items-center gap-1.5 mt-0.5" style="color: var(--text-muted);">
            <i class="fa-solid fa-user-tie text-[10px] opacity-70 shrink-0" style="color: var(--accent-color);"></i>
            <span class="font-bold" style="color: var(--accent-color);">${managerDisplayName}</span>
            ${teamMetric ? `<span class="opacity-60 text-[11px]">• #${teamMetric.rank} in classifica</span>` : ''}
          </div>
        </div>
      </div>

      <button type="button" onclick="window.closeTeamMatchesModal && window.closeTeamMatchesModal()"
              class="w-8 h-8 rounded-full flex items-center justify-center font-bold opacity-75 hover:opacity-100 transition border shadow-xs"
              style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);"
              title="Chiudi">
        ✕
      </button>
    </div>

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
  }
}

// Global window augmentation for inline HTML event handlers
if (typeof window !== 'undefined') {
  const win = window as unknown as Record<string, unknown>;
  win.openTeamMatchesModal = openTeamMatchesModal;
  win.closeTeamMatchesModal = closeTeamMatchesModal;
  win.openManagerProfileFromMatches = openManagerProfileFromMatches;
  win.navigateBackTeamMatchesModal = navigateBackTeamMatchesModal;
}
