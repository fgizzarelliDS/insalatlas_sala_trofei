/**
 * src/components/modals/matchup/MatchupDirectMatches.ts
 * Round-by-round direct encounters (Campionato) and head-to-head match cards
 */

import type { Manager, LiveSeasonDetails } from '@/types';
import { getCachedAnalyticsManagers } from '@/analytics/analyticsCore';
import { getTeamFallbackCrest, isCustomLogo } from '@/crests';
import { resolveManagerRecordCrest } from '@/analytics/records/helpers';
import { escapeHtml } from '@/utils/dom';

export interface DirectMatchEntry {
  season: string;
  roundNumber: number;
  roundLabel: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  isPlayed: boolean;
  outcome: 'A' | 'B' | 'tie' | 'scheduled';
}

export interface DirectMatchesSummary {
  matches: DirectMatchEntry[];
  seasonsList: string[];
  winsA: number;
  ties: number;
  winsB: number;
  totalPlayed: number;
  totalScheduled: number;
}

/**
 * Dynamically collects round-by-round direct encounters between two managers
 * across all available seasons (from trajectory analytics and live rounds) with zero hardcoded season strings.
 */
export function collectDirectRoundMatches(
  managerAId: string,
  managerBId: string,
  managerAName: string,
  managerBName: string,
  liveData?: LiveSeasonDetails | null
): DirectMatchesSummary {
  const matchesMap = new Map<string, DirectMatchEntry>();
  const analyticsManagers = getCachedAnalyticsManagers();

  // 1. Collect past rounds from manager A's trajectory in analytics data
  if (analyticsManagers && analyticsManagers[managerAId]) {
    const mgrData = analyticsManagers[managerAId];
    const traj = mgrData.flat?.trajectory || mgrData.atlas?.trajectory || [];

    for (const pt of traj) {
      if (pt.opponentId === managerBId && (pt.competitionCategory === 'Campionato' || !pt.competitionCategory)) {
        const season = pt.season || 'Stagione';
        const roundNum = pt.round || 1;
        const roundLabel = pt.roundLabel || `G${roundNum}`;
        const key = `${season}_${roundNum}`;

        const isHome = Boolean(pt.isHome);
        const homeManagerId = isHome ? managerAId : managerBId;
        const awayManagerId = isHome ? managerBId : managerAId;
        const homeTeam = isHome ? (mgrData.teamName || managerAName) : (pt.opponentTeamName || managerBName);
        const awayTeam = isHome ? (pt.opponentTeamName || managerBName) : (mgrData.teamName || managerAName);
        const homeLogo = resolveManagerRecordCrest(homeManagerId, season, homeTeam).logo;
        const awayLogo = resolveManagerRecordCrest(awayManagerId, season, awayTeam).logo;

        const outcome: 'A' | 'B' | 'tie' = pt.result === 'W' ? 'A' : pt.result === 'L' ? 'B' : 'tie';

        matchesMap.set(key, {
          season,
          roundNumber: roundNum,
          roundLabel,
          homeTeam,
          awayTeam,
          homeLogo,
          awayLogo,
          isPlayed: true,
          outcome
        });
      }
    }
  }

  // 2. Collect current / upcoming rounds from liveData (matches in live season)
  if (liveData && Array.isArray(liveData.rounds)) {
    const liveSeason = liveData.season || 'In Corso';

    for (const r of liveData.rounds) {
      if (!Array.isArray(r.matches)) continue;
      for (const m of r.matches) {
        const isAHome = m.homeManagerId === managerAId && m.awayManagerId === managerBId;
        const isBHome = m.homeManagerId === managerBId && m.awayManagerId === managerAId;

        if (isAHome || isBHome) {
          const roundNum = r.roundNumber;
          const roundLabel = `G${roundNum}`;
          const key = `${liveSeason}_${roundNum}`;

          const isPlayed = Boolean(m.isPlayed);
          let outcome: 'A' | 'B' | 'tie' | 'scheduled' = 'scheduled';

          if (isPlayed) {
            if (isAHome) {
              outcome = m.homeOutcome === 'W' ? 'A' : m.homeOutcome === 'L' ? 'B' : 'tie';
            } else {
              outcome = m.homeOutcome === 'W' ? 'B' : m.homeOutcome === 'L' ? 'A' : 'tie';
            }
          }

          const homeTeam = m.homeTeam;
          const awayTeam = m.awayTeam;
          const homeLogo = isCustomLogo(m.homeLogo)
            ? m.homeLogo!
            : resolveManagerRecordCrest(m.homeManagerId || '', liveSeason, homeTeam).logo;
          const awayLogo = isCustomLogo(m.awayLogo)
            ? m.awayLogo!
            : resolveManagerRecordCrest(m.awayManagerId || '', liveSeason, awayTeam).logo;

          matchesMap.set(key, {
            season: liveSeason,
            roundNumber: roundNum,
            roundLabel,
            homeTeam,
            awayTeam,
            homeLogo,
            awayLogo,
            isPlayed,
            outcome
          });
        }
      }
    }
  }

  // Convert to sorted list (chronological: past to future)
  const matches = Array.from(matchesMap.values()).sort((a, b) => {
    if (a.season !== b.season) {
      return a.season.localeCompare(b.season);
    }
    return a.roundNumber - b.roundNumber;
  });

  const seasonsList = Array.from(new Set(matches.map(m => m.season))).sort();

  let winsA = 0;
  let ties = 0;
  let winsB = 0;
  let totalScheduled = 0;

  for (const m of matches) {
    if (m.isPlayed) {
      if (m.outcome === 'A') winsA++;
      else if (m.outcome === 'B') winsB++;
      else if (m.outcome === 'tie') ties++;
    } else {
      totalScheduled++;
    }
  }

  return {
    matches,
    seasonsList,
    winsA,
    ties,
    winsB,
    totalPlayed: winsA + ties + winsB,
    totalScheduled
  };
}

/**
 * Renders the Scontri Diretti in Campionato card HTML
 */
export function renderDirectMatchesCardHTML(
  managerA: Manager,
  managerB: Manager,
  directSummary: DirectMatchesSummary,
  seasonsBadgeText: string,
  isDirectDetailsExpanded: boolean
): string {
  return `
    <div class="p-3 sm:p-3.5 rounded-2xl border shadow-sm transition-colors"
         style="background-color: var(--table-surface); border-color: var(--table-border);">
      
      <!-- Header: Title on left, Season Badge positioned cleanly without cramping -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2.5 px-1 gap-1.5">
        <div class="flex items-center gap-1.5 min-w-0">
          <i class="fa-solid fa-futbol text-indigo-400 text-xs shrink-0"></i>
          <span class="text-[11px] sm:text-xs font-black uppercase tracking-wider truncate" style="color: var(--text-main);">
            Scontri Diretti in Campionato (Round-by-Round)
          </span>
        </div>
        <div class="self-start sm:self-auto shrink-0">
          <span class="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 whitespace-nowrap">
            ${escapeHtml(seasonsBadgeText)}
          </span>
        </div>
      </div>

      <!-- Sports Scoreboard Bar: Vittorie | Pareggi | Vittorie -->
      <div class="p-2.5 sm:p-3 rounded-2xl border grid grid-cols-3 items-center text-center shadow-xs"
           style="background-color: var(--modal-bg); border-color: var(--table-border);">
        
        <!-- Contender A Wins -->
        <div class="flex flex-col items-center justify-center px-1" title="${escapeHtml(managerA.name)}: ${directSummary.winsA} ${directSummary.winsA === 1 ? 'vittoria' : 'vittorie'}">
          <span class="text-[10px] sm:text-[11px] uppercase font-extrabold tracking-wider block" style="color: var(--h2h-contender-a, #f59e0b);">
            Vittorie
          </span>
          <span class="text-xl sm:text-2xl font-black font-sport leading-none mt-1" style="color: var(--h2h-contender-a, #f59e0b);">
            ${directSummary.winsA}
          </span>
        </div>

        <!-- Center: Pareggi -->
        <div class="flex flex-col items-center justify-center px-1 border-x" style="border-color: var(--table-border);" title="Pareggi: ${directSummary.ties}">
          <span class="text-[10px] sm:text-[11px] uppercase font-extrabold opacity-75 tracking-wider block" style="color: var(--text-muted);">
            Pareggi
          </span>
          <span class="text-xl sm:text-2xl font-black font-sport opacity-90 leading-none mt-1" style="color: var(--text-main);">
            ${directSummary.ties}
          </span>
        </div>

        <!-- Contender B Wins -->
        <div class="flex flex-col items-center justify-center px-1" title="${escapeHtml(managerB.name)}: ${directSummary.winsB} ${directSummary.winsB === 1 ? 'vittoria' : 'vittorie'}">
          <span class="text-[10px] sm:text-[11px] uppercase font-extrabold tracking-wider block" style="color: var(--h2h-contender-b, #06b6d4);">
            Vittorie
          </span>
          <span class="text-xl sm:text-2xl font-black font-sport leading-none mt-1" style="color: var(--h2h-contender-b, #06b6d4);">
            ${directSummary.winsB}
          </span>
        </div>

      </div>

      <!-- Accordion Button: Mostra / Nascondi Dettaglio Gare -->
      <div class="mt-2.5 flex justify-center">
        <button type="button"
          onclick="window.toggleMatchupDirectDetails && window.toggleMatchupDirectDetails();"
          class="px-4 py-1.5 rounded-full text-[11px] font-extrabold border transition shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
          style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--text-main);">
          <i class="fa-solid fa-clock-rotate-left text-[10px] text-indigo-400"></i>
          <span>${isDirectDetailsExpanded ? 'Nascondi Dettaglio Gare' : `Mostra Dettaglio Gare (${directSummary.matches.length})`}</span>
          <i class="fa-solid ${isDirectDetailsExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[9px] text-amber-500"></i>
        </button>
      </div>

      <!-- Collapsible Matches List -->
      ${isDirectDetailsExpanded ? `
        <div class="mt-3 space-y-2 border-t pt-2.5 animate-fadeIn" style="border-color: var(--table-border);">
          ${directSummary.matches.length === 0 ? `
            <div class="p-3 text-center text-xs font-semibold opacity-60">
              Nessuna gara registrata a calendario tra i due manager.
            </div>
          ` : directSummary.matches.map(m => {
            const outcomeBadge = m.isPlayed
              ? (m.outcome === 'A'
                ? `<span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 shadow-xs"
                     style="color: var(--h2h-contender-a, #f59e0b); border-color: var(--h2h-contender-a, #f59e0b); background-color: rgba(125, 125, 125, 0.08);">
                     <i class="fa-solid fa-trophy text-[8px]"></i>
                     <span>W ${escapeHtml(managerA.name)}</span>
                   </span>`
                : m.outcome === 'B'
                  ? `<span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 shadow-xs"
                       style="color: var(--h2h-contender-b, #06b6d4); border-color: var(--h2h-contender-b, #06b6d4); background-color: rgba(125, 125, 125, 0.08);">
                       <i class="fa-solid fa-trophy text-[8px]"></i>
                       <span>W ${escapeHtml(managerB.name)}</span>
                     </span>`
                  : `<span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 shadow-xs"
                       style="color: var(--text-main); border-color: var(--table-border); background-color: var(--shelf-line, rgba(148, 163, 184, 0.15));">
                       <i class="fa-solid fa-handshake text-[8px] opacity-75"></i>
                       <span>PAREGGIO</span>
                     </span>`)
              : `<span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-dashed shrink-0 flex items-center gap-1 opacity-80"
                   style="color: var(--text-muted); border-color: var(--table-border); background-color: transparent;">
                   <i class="fa-regular fa-clock text-[8px]"></i>
                   <span>In programma</span>
                 </span>`;

            return `
              <div class="p-2.5 rounded-xl border flex flex-col gap-2 text-xs shadow-xs transition"
                   style="background-color: var(--modal-bg); border-color: var(--table-border);">
                
                <!-- Row 1: Season & Round (Left) + Outcome Badge (Right) -->
                <div class="flex items-center justify-between w-full">
                  <span class="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border flex items-center gap-1 shrink-0"
                        style="background-color: var(--shelf-line, rgba(148, 163, 184, 0.15)); border-color: var(--table-border); color: var(--text-main);">
                    <i class="fa-solid fa-calendar-day text-[9px] opacity-70"></i>
                    <span>${escapeHtml(m.season)} &bull; ${escapeHtml(m.roundLabel)}</span>
                  </span>

                  ${outcomeBadge}
                </div>

                <!-- Row 2: Teams face-off with full width and centered '-' placeholder -->
                <div class="flex items-center justify-between gap-2 w-full pt-1.5 border-t"
                     style="border-color: var(--table-border);">
                  
                  <!-- Home Team (Logo A on the left, Team A name next, left-aligned) -->
                  <div class="flex items-center justify-start gap-1.5 flex-1 min-w-0">
                    <img src="${m.homeLogo}" alt="${escapeHtml(m.homeTeam)}"
                         class="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-contain shrink-0 bg-white/10 border shadow-xs"
                         style="border-color: var(--table-border);"
                         onerror="this.onerror=null; this.src='${getTeamFallbackCrest(m.homeTeam)}'">
                    <span class="font-bold text-[11px] sm:text-xs truncate text-left" style="color: var(--text-main);" title="${escapeHtml(m.homeTeam)}">
                      ${escapeHtml(m.homeTeam)}
                    </span>
                  </div>

                  <!-- Explicit '-' placeholder (no score revealed) -->
                  <div class="w-6 h-5 sm:w-7 sm:h-6 rounded-md flex items-center justify-center font-mono font-black text-xs shrink-0 border border-dashed select-none"
                       style="background-color: var(--shelf-line, rgba(0, 0, 0, 0.05)); border-color: var(--table-border); color: var(--text-muted);"
                       title="Risultato numerico non mostrato">
                    -
                  </div>

                  <!-- Away Team (Text and logo aligned on the right) -->
                  <div class="flex items-center justify-end gap-1.5 flex-1 min-w-0">
                    <span class="font-bold text-[11px] sm:text-xs truncate text-right" style="color: var(--text-main);" title="${escapeHtml(m.awayTeam)}">
                      ${escapeHtml(m.awayTeam)}
                    </span>
                    <img src="${m.awayLogo}" alt="${escapeHtml(m.awayTeam)}"
                         class="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-contain shrink-0 bg-white/10 border shadow-xs"
                         style="border-color: var(--table-border);"
                         onerror="this.onerror=null; this.src='${getTeamFallbackCrest(m.awayTeam)}'">
                  </div>

                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    </div>
  `;
}
