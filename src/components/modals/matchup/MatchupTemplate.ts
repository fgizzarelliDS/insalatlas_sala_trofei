/**
 * src/components/modals/matchup/MatchupTemplate.ts
 * Dedicated Pre-Match Tactical Matchup View for Next Round & Fixture Clash
 */

import type { Manager, LiveSeasonDetails } from '@/types';
import { computeTacticalMatchup } from '@/analytics/tacticalMatchup';
import { renderDualRadar5AxesSVG } from '@/components/modals/h2h/HeadToHeadRadar';
import { renderPrecedentiCampionato, renderChiaveTattica } from '@/components/modals/h2h/HeadToHeadMatchupView';
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
 * Extracts initials for manager avatar
 */
function getInitials(name: string): string {
  const parts = name.split(/[ &+/,-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Renders the dedicated Pre-Match Tactical Matchup Modal HTML
 */
export function renderMatchupModalHTML(
  managerA: Manager,
  managerB: Manager,
  allManagers: Manager[],
  liveData?: LiveSeasonDetails | null,
  isDirectDetailsExpanded: boolean = false
): string {
  const matchup = computeTacticalMatchup(managerA, managerB, allManagers, liveData);
  const { profileA, profileB, tacticalKey, h2hStats } = matchup;

  const directSummary = collectDirectRoundMatches(
    managerA.id,
    managerB.id,
    managerA.name,
    managerB.name,
    liveData
  );

  const initialsA = getInitials(managerA.name);
  const initialsB = getInitials(managerB.name);

  // Dropdown options
  const optionsA = allManagers
    .map(
      m =>
        `<option value="${m.id}" ${m.id === managerA.id ? 'selected' : ''} ${m.id === managerB.id ? 'disabled' : ''}>${escapeHtml(m.name)}</option>`
    )
    .join('');

  const optionsB = allManagers
    .map(
      m =>
        `<option value="${m.id}" ${m.id === managerB.id ? 'selected' : ''} ${m.id === managerA.id ? 'disabled' : ''}>${escapeHtml(m.name)}</option>`
    )
    .join('');

  // Seasons badge text dynamically
  const seasonsBadgeText = directSummary.seasonsList.length > 0
    ? directSummary.seasonsList.join(' • ')
    : (liveData?.season || 'Campionato');

  return `
    <!-- Modal Header -->
    <div class="flex items-center justify-between border-b px-4 sm:px-6 py-3 shrink-0 gap-2.5" style="border-color: var(--table-border);">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black border border-indigo-500/30">
          <i class="fa-solid fa-bolt text-sm"></i>
        </div>
        <div>
          <h2 class="font-sport font-black text-sm sm:text-lg uppercase tracking-wide leading-tight sm:leading-none flex flex-col sm:flex-row sm:items-center sm:gap-1.5" style="color: var(--text-main);">
            <span>Matchup Tattico</span>
            <span style="color: var(--accent-color);">&amp; Pre-Partita</span>
          </h2>
          <p class="text-[10px] sm:text-[11px] opacity-70 mt-0.5" style="color: var(--text-muted);">
            Scontro di stili, radar &amp; precedenti diretti
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button onclick="closeMatchupModal()"
          class="w-8 h-8 rounded-full flex items-center justify-center font-bold opacity-75 hover:opacity-100 transition border cursor-pointer"
          style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
          ✕
        </button>
      </div>
    </div>

    <!-- Scrollable Modal Body -->
    <div class="p-3 sm:p-5 overflow-y-auto flex-1 space-y-3.5 sm:space-y-4" style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
      
      <!-- 1. Hero Contenders with Selectors & Archetypes -->
      <div class="p-3 rounded-2xl border" style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="grid grid-cols-2 gap-3 items-center">
          <!-- Select A -->
          <div class="min-w-0">
            <label class="block text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5" style="color: var(--h2h-contender-a, #f59e0b);">
              <span class="w-2 h-2 rounded-full inline-block" style="background-color: var(--h2h-contender-a, #f59e0b);"></span>
              Mister A
            </label>
            <select onchange="window.changeMatchupManagerA && window.changeMatchupManagerA(this.value)"
              class="w-full text-xs font-bold rounded-xl px-2.5 py-2 border focus:outline-none cursor-pointer truncate shadow-sm transition"
              style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
              ${optionsA}
            </select>
          </div>

          <!-- Select B -->
          <div class="min-w-0">
            <label class="block text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-end gap-1.5" style="color: var(--h2h-contender-b, #06b6d4);">
              Mister B
              <span class="w-2 h-2 rounded-full inline-block" style="background-color: var(--h2h-contender-b, #06b6d4);"></span>
            </label>
            <select onchange="window.changeMatchupManagerB && window.changeMatchupManagerB(this.value)"
              class="w-full text-xs font-bold rounded-xl px-2.5 py-2 border focus:outline-none cursor-pointer truncate text-right shadow-sm transition"
              style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
              ${optionsB}
            </select>
          </div>
        </div>

        <!-- Contender Face-off Cards -->
        <div class="grid grid-cols-11 gap-1 items-stretch mt-3 pt-3 border-t" style="border-color: var(--table-border);">
          <!-- Contender A Card -->
          <div class="col-span-5 text-center p-3 rounded-xl border flex flex-col items-center justify-between min-w-0"
               style="background-color: var(--modal-bg); border-color: var(--table-border);">
            <div class="flex flex-col items-center w-full">
              <div class="w-11 h-11 mx-auto rounded-full flex items-center justify-center font-black text-sm border-2 mb-1 shadow"
                   style="background: radial-gradient(circle, var(--h2h-contender-a, #f59e0b) 0%, transparent 80%), rgba(255,255,255,0.05); border-color: var(--h2h-contender-a, #f59e0b); color: var(--text-main);">
                ${initialsA}
              </div>
              <h3 class="font-sport font-black text-sm uppercase px-1 my-1 truncate max-w-full" style="color: var(--text-main);">
                ${escapeHtml(managerA.name)}
              </h3>
            </div>
            <div class="flex flex-col items-center justify-center gap-1 mt-1 w-full min-w-0">
              <span class="inline-flex items-center justify-center text-[10px] font-black px-2 py-0.5 rounded-full border text-center leading-tight break-words max-w-full"
                    style="background: ${profileA.archetype.color}18; color: ${profileA.archetype.color}; border-color: ${profileA.archetype.color}40;">
                <i class="fa-solid ${profileA.archetype.icon} text-[9px] mr-1 shrink-0"></i><span>${escapeHtml(profileA.archetype.title)}</span>
              </span>
              <span class="text-[9px] font-bold opacity-75 text-center leading-tight break-words max-w-full block" style="color: var(--text-muted);">
                ${escapeHtml(profileA.archetype.trait)}
              </span>
            </div>
          </div>

          <!-- VS Emblem -->
          <div class="col-span-1 text-center font-sport font-black text-sm italic tracking-widest opacity-60 drop-shadow flex items-center justify-center" style="color: var(--accent-color);">
            VS
          </div>

          <!-- Contender B Card -->
          <div class="col-span-5 text-center p-3 rounded-xl border flex flex-col items-center justify-between min-w-0"
               style="background-color: var(--modal-bg); border-color: var(--table-border);">
            <div class="flex flex-col items-center w-full">
              <div class="w-11 h-11 mx-auto rounded-full flex items-center justify-center font-black text-sm border-2 mb-1 shadow"
                   style="background: radial-gradient(circle, var(--h2h-contender-b, #06b6d4) 0%, transparent 80%), rgba(255,255,255,0.05); border-color: var(--h2h-contender-b, #06b6d4); color: var(--text-main);">
                ${initialsB}
              </div>
              <h3 class="font-sport font-black text-sm uppercase px-1 my-1 truncate max-w-full" style="color: var(--text-main);">
                ${escapeHtml(managerB.name)}
              </h3>
            </div>
            <div class="flex flex-col items-center justify-center gap-1 mt-1 w-full min-w-0">
              <span class="inline-flex items-center justify-center text-[10px] font-black px-2 py-0.5 rounded-full border text-center leading-tight break-words max-w-full"
                    style="background: ${profileB.archetype.color}18; color: ${profileB.archetype.color}; border-color: ${profileB.archetype.color}40;">
                <i class="fa-solid ${profileB.archetype.icon} text-[9px] mr-1 shrink-0"></i><span>${escapeHtml(profileB.archetype.title)}</span>
              </span>
              <span class="text-[9px] font-bold opacity-75 text-center leading-tight break-words max-w-full block" style="color: var(--text-muted);">
                ${escapeHtml(profileB.archetype.trait)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Dual-Polygon 5-Axis Tactical Radar Card -->
      <div class="p-3 sm:p-4 rounded-2xl border flex flex-col items-center justify-center shadow-sm transition-colors"
           style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="flex items-center justify-between w-full mb-1 px-1">
          <span class="text-xs font-bold font-sport uppercase tracking-wider flex items-center gap-1.5" style="color: var(--text-main);">
            <i class="fa-solid fa-compass text-amber-500"></i>
            <span>Radar Tattico</span>
          </span>
          <span class="text-[10px] font-semibold" style="color: var(--text-muted);">
            Scontro di Stile
          </span>
        </div>

        ${renderDualRadar5AxesSVG(profileA, profileB, managerA.name, managerB.name)}
      </div>

      <!-- 3. Scontri Diretti in Partita (Round-by-Round) -->
      <div class="p-3 sm:p-3.5 rounded-2xl border shadow-sm transition-colors"
           style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="flex items-center justify-between mb-2 px-1">
          <span class="text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5" style="color: var(--text-main);">
            <i class="fa-solid fa-futbol text-indigo-400"></i>
            <span>Scontri Diretti in Campionato (Round-by-Round)</span>
          </span>
          <span class="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
            ${escapeHtml(seasonsBadgeText)}
          </span>
        </div>

        <!-- Consolidated Metric Bar: W A | X | W B -->
        <div class="p-2 sm:p-2.5 rounded-xl border flex items-center justify-around text-center text-xs font-bold"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <div>
            <span class="text-[10px] uppercase font-extrabold opacity-70 block" style="color: var(--h2h-contender-a, #f59e0b);">Vittorie ${escapeHtml(managerA.name)}</span>
            <span class="text-lg font-black font-sport" style="color: var(--h2h-contender-a, #f59e0b);">${directSummary.winsA}</span>
          </div>
          <div class="h-6 w-px opacity-30" style="background-color: var(--table-border);"></div>
          <div>
            <span class="text-[10px] uppercase font-extrabold opacity-70 block" style="color: var(--text-muted);">Pareggi</span>
            <span class="text-lg font-black font-sport opacity-80" style="color: var(--text-main);">${directSummary.ties}</span>
          </div>
          <div class="h-6 w-px opacity-30" style="background-color: var(--table-border);"></div>
          <div>
            <span class="text-[10px] uppercase font-extrabold opacity-70 block" style="color: var(--h2h-contender-b, #06b6d4);">Vittorie ${escapeHtml(managerB.name)}</span>
            <span class="text-lg font-black font-sport" style="color: var(--h2h-contender-b, #06b6d4);">${directSummary.winsB}</span>
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

      <!-- 4. Precedenti in Campionato (Scoreboard all-time) -->
      ${renderPrecedentiCampionato(h2hStats, managerA.name, managerB.name)}

      <!-- 5. Chiave Tattica del Duello -->
      ${renderChiaveTattica(tacticalKey)}

    </div>

    <!-- Modal Footer Actions (Pinned at bottom) -->
    <div class="flex items-center justify-between border-t px-4 sm:px-6 py-3 shrink-0 gap-2" style="border-color: var(--table-border);">
      <div class="flex items-center gap-2">
        <!-- H2H Button -->
        <button type="button"
          onclick="window.closeMatchupModal && window.closeMatchupModal(); window.openHeadToHeadModal && window.openHeadToHeadModal('${managerA.id}', '${managerB.id}');"
          class="px-3 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm flex items-center gap-1.5 bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 active:scale-95 cursor-pointer"
          title="Apri lo storico Head-to-Head completo con tabellino annate e bacheca trofei">
          <i class="fa-solid fa-book-open text-indigo-400"></i>
          <span class="hidden sm:inline">Storico H2H</span>
          <span class="sm:hidden">H2H</span>
        </button>

        <!-- Dropdown Popover Menu: Scarica / Condividi (opens upward) -->
        <div class="relative">
          <button id="btn-matchup-share-dropdown" onclick="window.toggleMatchupShareDropdown && window.toggleMatchupShareDropdown(event);"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm flex items-center gap-1.5 opacity-90 hover:opacity-100 cursor-pointer active:scale-95"
            style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
            <i class="fa-solid fa-share-nodes text-xs"></i>
            <span class="hidden sm:inline">Scarica / Condividi</span>
            <span class="sm:hidden">Condividi</span>
            <i class="fa-solid fa-chevron-up text-[10px] ml-0.5"></i>
          </button>

          <div id="matchup-share-dropdown-menu"
            class="hidden absolute bottom-full left-0 mb-2 w-56 rounded-2xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md"
            style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--modal-text);">
            <button onclick="window.exportMatchupCardHD && window.exportMatchupCardHD();"
              class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
              <i class="fa-solid fa-download text-amber-500"></i>
              <span>Scarica PNG Scheda</span>
            </button>
            <button onclick="window.exportMatchupStoryHD && window.exportMatchupStoryHD();"
              class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
              <i class="fa-solid fa-mobile-screen text-indigo-400"></i>
              <span>Story (9:16)</span>
            </button>
            <button onclick="window.copyMatchupBanter && window.copyMatchupBanter();"
              class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
              <i class="fa-brands fa-whatsapp text-emerald-500"></i>
              <span>Copia Banter WhatsApp</span>
            </button>
            <button onclick="window.shareMatchupWhatsApp && window.shareMatchupWhatsApp();"
              class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition border-t mt-1 pt-2 cursor-pointer"
              style="border-color: var(--table-border);">
              <i class="fa-solid fa-link text-indigo-400"></i>
              <span>Invia Link WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Chiudi Button -->
      <button onclick="window.closeMatchupModal && window.closeMatchupModal();"
        class="px-4 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer hover:opacity-100 opacity-90"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        Chiudi
      </button>
    </div>
  `;
}
