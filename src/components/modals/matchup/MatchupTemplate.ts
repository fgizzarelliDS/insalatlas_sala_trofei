/**
 * src/components/modals/matchup/MatchupTemplate.ts
 * Dedicated Pre-Match Tactical Matchup View for Next Round & Fixture Clash
 */

import type { Manager, LiveSeasonDetails } from '@/types';
import { computeTacticalMatchup } from '@/analytics/tacticalMatchup';
import { renderDualRadar5AxesSVG } from '@/components/modals/h2h/HeadToHeadRadar';
import { renderPrecedentiCampionato, renderChiaveTattica } from '@/components/modals/h2h/HeadToHeadMatchupView';
import { escapeHtml } from '@/utils/dom';

/**
 * Computes consolidated round-by-round direct match statistics between two managers
 */
export function computeRoundByRoundMetrics(
  managerAId: string,
  managerBId: string,
  liveData?: LiveSeasonDetails | null
): { winsA: number; ties: number; winsB: number; totalPlayed: number } {
  let winsA = 0;
  let ties = 0;
  let winsB = 0;

  if (liveData && Array.isArray(liveData.rounds)) {
    for (const r of liveData.rounds) {
      if (!Array.isArray(r.matches)) continue;
      for (const m of r.matches) {
        if (!m.isPlayed) continue;
        const isAHome = m.homeManagerId === managerAId && m.awayManagerId === managerBId;
        const isBHome = m.homeManagerId === managerBId && m.awayManagerId === managerAId;

        if (isAHome) {
          if (m.homeOutcome === 'W') winsA++;
          else if (m.homeOutcome === 'L') winsB++;
          else ties++;
        } else if (isBHome) {
          if (m.homeOutcome === 'W') winsB++;
          else if (m.homeOutcome === 'L') winsA++;
          else ties++;
        }
      }
    }
  }

  return {
    winsA,
    ties,
    winsB,
    totalPlayed: winsA + ties + winsB
  };
}

/**
 * Extracts initials for avatar
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
  liveData?: LiveSeasonDetails | null
): string {
  const matchup = computeTacticalMatchup(managerA, managerB, allManagers, liveData);
  const { profileA, profileB, tacticalKey, h2hStats } = matchup;
  const roundMetrics = computeRoundByRoundMetrics(managerA.id, managerB.id, liveData);

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

  return `
    <!-- Modal Header -->
    <div class="flex items-center justify-between border-b px-4 sm:px-6 py-3 shrink-0 gap-2.5" style="border-color: var(--table-border);">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black border border-indigo-500/30">
          <i class="fa-solid fa-bolt text-sm"></i>
        </div>
        <div>
          <h2 class="font-sport font-black text-base sm:text-lg uppercase tracking-wide leading-none" style="color: var(--text-main);">
            Matchup Tattico <span style="color: var(--accent-color);">&amp; Pre-Partita</span>
          </h2>
          <p class="text-[10px] sm:text-[11px] opacity-70 mt-0.5" style="color: var(--text-muted);">
            Scontro di stili, radar a 5 assi &amp; precedenti diretti
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
            <div class="flex flex-col items-center justify-center gap-0.5 mt-1 w-full min-w-0">
              <span class="inline-block text-[10px] font-black px-2 py-0.5 rounded-full border truncate max-w-full"
                    style="background: ${profileA.archetype.color}18; color: ${profileA.archetype.color}; border-color: ${profileA.archetype.color}40;">
                <i class="fa-solid ${profileA.archetype.icon} text-[9px] mr-1"></i>${escapeHtml(profileA.archetype.title)}
              </span>
              <span class="text-[9px] font-bold opacity-75 truncate max-w-full block" style="color: var(--text-muted);">
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
            <div class="flex flex-col items-center justify-center gap-0.5 mt-1 w-full min-w-0">
              <span class="inline-block text-[10px] font-black px-2 py-0.5 rounded-full border truncate max-w-full"
                    style="background: ${profileB.archetype.color}18; color: ${profileB.archetype.color}; border-color: ${profileB.archetype.color}40;">
                <i class="fa-solid ${profileB.archetype.icon} text-[9px] mr-1"></i>${escapeHtml(profileB.archetype.title)}
              </span>
              <span class="text-[9px] font-bold opacity-75 truncate max-w-full block" style="color: var(--text-muted);">
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
            <span>Radar Tattico a 5 Assi</span>
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
            2025/26 &bull; 2026/27
          </span>
        </div>

        <!-- Consolidated Metric Bar: W A | X | W B -->
        <div class="p-2 sm:p-2.5 rounded-xl border flex items-center justify-around text-center text-xs font-bold"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <div>
            <span class="text-[10px] uppercase font-extrabold opacity-70 block" style="color: var(--h2h-contender-a, #f59e0b);">Vittorie ${escapeHtml(managerA.name)}</span>
            <span class="text-lg font-black font-sport" style="color: var(--h2h-contender-a, #f59e0b);">${roundMetrics.winsA}</span>
          </div>
          <div class="h-6 w-px opacity-30" style="background-color: var(--table-border);"></div>
          <div>
            <span class="text-[10px] uppercase font-extrabold opacity-70 block" style="color: var(--text-muted);">Pareggi</span>
            <span class="text-lg font-black font-sport opacity-80" style="color: var(--text-main);">${roundMetrics.ties}</span>
          </div>
          <div class="h-6 w-px opacity-30" style="background-color: var(--table-border);"></div>
          <div>
            <span class="text-[10px] uppercase font-extrabold opacity-70 block" style="color: var(--h2h-contender-b, #06b6d4);">Vittorie ${escapeHtml(managerB.name)}</span>
            <span class="text-lg font-black font-sport" style="color: var(--h2h-contender-b, #06b6d4);">${roundMetrics.winsB}</span>
          </div>
        </div>

        <!-- Structured Placeholder Box -->
        <div class="mt-2.5 p-3 rounded-xl border border-dashed text-center" style="border-color: var(--table-border); background-color: var(--modal-bg);">
          <div class="flex items-center justify-center gap-1.5 text-[11px] font-semibold opacity-75" style="color: var(--text-muted);">
            <i class="fa-solid fa-clock-rotate-left text-amber-500 text-xs"></i>
            <span>Tabellino dettagliato delle singole sfide in arrivo con il parsing delle giornate.</span>
          </div>
        </div>
      </div>

      <!-- 4. Precedenti in Campionato (Scoreboard all-time) -->
      ${renderPrecedentiCampionato(h2hStats, managerA.name, managerB.name)}

      <!-- 5. Chiave Tattica del Duello -->
      ${renderChiaveTattica(tacticalKey)}

      <!-- 6. Actions Row: Story + Banter + Open H2H -->
      <div class="pt-2 flex flex-col sm:flex-row items-center gap-2 sm:gap-2.5">
        <button type="button"
          onclick="window.exportCurrentH2HDuelStoryHD && window.exportCurrentH2HDuelStoryHD();"
          class="w-full sm:flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-95">
          <i class="fa-solid fa-mobile-screen"></i>
          <span>Esporta Story 9:16</span>
        </button>

        <button type="button"
          onclick="window.copyCurrentH2HDuelBanter && window.copyCurrentH2HDuelBanter();"
          class="w-full sm:flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
          style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
          <i class="fa-brands fa-whatsapp text-emerald-500"></i>
          <span>Copia Banter WhatsApp</span>
        </button>

        <button type="button"
          onclick="window.closeMatchupModal && window.closeMatchupModal(); window.openHeadToHeadModal && window.openHeadToHeadModal('${managerA.id}', '${managerB.id}');"
          class="w-full sm:flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20"
          title="Apri lo storico Head-to-Head completo con il tabellino annate e bacheca trofei">
          <i class="fa-solid fa-book-open text-indigo-400"></i>
          <span>Storico Completo H2H</span>
        </button>
      </div>

    </div>
  `;
}
