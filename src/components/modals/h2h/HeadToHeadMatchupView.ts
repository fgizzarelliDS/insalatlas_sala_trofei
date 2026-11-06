/**
 * src/components/modals/h2h/HeadToHeadMatchupView.ts
 * Unified Single-Tab Tactical Matchup View for 1vs1 Head-to-Head Duels 
 */

import type { HeadToHeadStats, Manager, LiveSeasonDetails } from '@/types';
import { renderHeadToHeadHero } from './HeadToHeadHero';
import { renderDualRadar5AxesSVG } from './HeadToHeadRadar';
import { computeTacticalMatchup } from '@/analytics/tacticalMatchup';

/**
 * Renders the compact 3-column "Precedenti in Campionato" scoreboard
 */
export function renderPrecedentiCampionato(
  stats: HeadToHeadStats,
  nameA: string,
  nameB: string
): string {
  const { winsA, winsB, ties, sharedSeasonsCount } = stats;

  return `
    <div class="p-3 sm:p-3.5 rounded-2xl border text-center shadow-sm transition-colors"
         style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div class="flex items-center justify-between mb-2 px-1">
        <span class="text-[10px] sm:text-[11px] font-black uppercase tracking-wider" style="color: var(--text-muted);">
          Precedenti in Campionato
        </span>
        <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400">
          ${sharedSeasonsCount} ${sharedSeasonsCount === 1 ? 'Stagione Condivisa' : 'Stagioni Condivise'}
        </span>
      </div>

      <div class="grid grid-cols-3 gap-2 items-center">
        <!-- Wins A -->
        <div class="p-2 sm:p-2.5 rounded-xl border text-center transition-colors"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <span class="text-2xl sm:text-3xl font-black font-sport block leading-none" style="color: var(--h2h-contender-a, #f59e0b);">
            ${winsA}
          </span>
          <span class="text-[10px] sm:text-[11px] font-bold block mt-1 truncate" style="color: var(--text-main);" title="Vittorie ${nameA}">
            Vittorie ${nameA}
          </span>
        </div>

        <!-- Ties -->
        <div class="p-2 sm:p-2.5 rounded-xl border text-center transition-colors"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <span class="text-2xl sm:text-3xl font-black font-sport block leading-none opacity-80" style="color: var(--text-main);">
            ${ties}
          </span>
          <span class="text-[10px] sm:text-[11px] font-bold block mt-1 opacity-70" style="color: var(--text-muted);">
            Pareggi
          </span>
        </div>

        <!-- Wins B -->
        <div class="p-2 sm:p-2.5 rounded-xl border text-center transition-colors"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <span class="text-2xl sm:text-3xl font-black font-sport block leading-none" style="color: var(--h2h-contender-b, #06b6d4);">
            ${winsB}
          </span>
          <span class="text-[10px] sm:text-[11px] font-bold block mt-1 truncate" style="color: var(--text-main);" title="Vittorie ${nameB}">
            Vittorie ${nameB}
          </span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders the "Chiave Tattica del Duello" narrative card
 */
export function renderChiaveTattica(tacticalKey: {
  headline: string;
  description: string;
  edgeA: string;
  edgeB: string;
}): string {
  return `
    <div class="p-3.5 sm:p-4 rounded-2xl border flex items-start gap-3 shadow-sm transition-colors"
         style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center text-amber-500 shrink-0 mt-0.5"
           style="background-color: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.3);">
        <i class="fa-solid fa-lightbulb text-base sm:text-lg"></i>
      </div>
      <div class="min-w-0 flex-1">
        <h4 class="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-500 dark:text-amber-400">
          ${tacticalKey.headline}
        </h4>
        <p class="text-xs sm:text-[13px] mt-1 leading-relaxed" style="color: var(--text-main);">
          ${tacticalKey.description}
        </p>
      </div>
    </div>
  `;
}

/**
 * Renders the unified single-tab view for a 1vs1 Head-to-Head Duel:
 * 1. Hero Contenders with Selectors & Archetypes
 * 2. 5-Axis Dual Tactical Radar SVG (Overlaid Manager A vs Manager B + 50% league baseline)
 * 3. Precedenti in Campionato (Big Numbers Scoreboard positioned ABOVE Chiave Tattica)
 * 4. Chiave Tattica del Duello (Automated narrative analysis)
 * 5. Action Buttons (Story 9:16 + WhatsApp Banter)
 */
export function renderHeadToHeadMatchupView(
  stats: HeadToHeadStats,
  allManagers: Manager[],
  liveData?: LiveSeasonDetails | null
): string {
  const { managerA, managerB } = stats;
  const matchup = computeTacticalMatchup(managerA, managerB, allManagers, liveData);
  const { profileA, profileB, tacticalKey } = matchup;

  return `
    <div class="space-y-3 sm:space-y-4">
      <!-- 1. Hero Contenders & Selectors -->
      ${renderHeadToHeadHero(stats, allManagers, profileA, profileB)}

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

      <!-- 3. Precedenti in Campionato (Scoreboard sintetico SOPRA la Chiave Tattica) -->
      ${renderPrecedentiCampionato(stats, managerA.name, managerB.name)}

      <!-- 4. Chiave Tattica del Duello -->
      ${renderChiaveTattica(tacticalKey)}

      <!-- 5. Quick Actions Row -->
      <div class="pt-2 flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
        <button type="button"
          onclick="window.exportCurrentH2HDuelStoryHD && window.exportCurrentH2HDuelStoryHD();"
          class="w-full sm:flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-95">
          <i class="fa-solid fa-mobile-screen"></i>
          <span>Esporta Story 9:16 Duello</span>
        </button>
        <button type="button"
          onclick="window.copyCurrentH2HDuelBanter && window.copyCurrentH2HDuelBanter();"
          class="w-full sm:flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
          style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
          <i class="fa-brands fa-whatsapp text-emerald-500"></i>
          <span>Copia Banter WhatsApp</span>
        </button>
      </div>
    </div>
  `;
}
