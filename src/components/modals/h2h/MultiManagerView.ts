import type { Manager } from '@/types';
import {
  computeMultiManagerAnalysis,
  MULTI_MANAGER_PALETTE,
  type MultiManagerAnalysis
} from '@/analytics/multiManager';
import { renderMultiManagerRadarSVG } from './MultiManagerRadar';
import { renderMiniTournamentTable, renderCareerComparisonTable } from './MultiManagerTable';

/**
 * Renders the complete "Tavolo dei Rivali" Multi-Manager comparison view
 */
export function renderMultiManagerView(
  selectedManagers: Manager[],
  allManagers: Manager[],
  hiddenManagerIds: Set<string> = new Set(),
  tournamentMode: 'ppg' | 'simultaneous' = 'simultaneous'
): string {
  if (!selectedManagers || selectedManagers.length < 2) {
    return `
      <div class="p-8 text-center text-xs opacity-60">
        Seleziona almeno 3 manager per aprire il Tavolo dei Rivali.
      </div>
    `;
  }

  const analysis: MultiManagerAnalysis = computeMultiManagerAnalysis(selectedManagers, allManagers, tournamentMode);

  // Manager selector dropdowns and visibility toggle chips
  const selectorCards = selectedManagers
    .map((manager, idx) => {
      const color = MULTI_MANAGER_PALETTE[idx % MULTI_MANAGER_PALETTE.length];
      const isHidden = hiddenManagerIds.has(manager.id);

      const options = allManagers
        .map(
          m => `
          <option value="${m.id}" ${m.id === manager.id ? 'selected' : ''}>
            ${m.name} (${m.years} anni${m.gold ? ` • ${m.gold} 🥇` : ''})
          </option>
        `
        )
        .join('');

      return `
        <div class="w-full p-2 sm:p-2.5 rounded-xl border flex flex-col gap-1.5 transition ${isHidden ? 'opacity-50' : ''}"
             style="background-color: var(--table-surface); border-color: ${isHidden ? 'var(--table-border)' : `${color}40`}; border-left: 4px solid ${color};">
          <div class="flex items-center justify-between gap-1 text-[11px]">
            <span class="font-extrabold uppercase tracking-wider text-[10px]" style="color: ${color};">
              Rivale #${idx + 1}
            </span>
            <div class="flex items-center gap-1">
              <button type="button" onclick="window.toggleMultiManagerVisibility('${manager.id}')"
                class="px-1.5 py-0.5 rounded text-[10px] font-bold transition hover:bg-white/10"
                style="color: var(--text-main);"
                title="${isHidden ? 'Mostra sul radar' : 'Nascondi dal radar'}">
                <i class="fa-solid ${isHidden ? 'fa-eye-slash opacity-50' : 'fa-eye text-emerald-400'}"></i>
              </button>
              ${selectedManagers.length > 3 ? `
                <button type="button" onclick="window.removeMultiManager('${manager.id}')"
                  class="px-1 py-0.5 rounded text-[10px] text-rose-400 hover:bg-rose-500/20"
                  title="Rimuovi dal tavolo">
                  ✕
                </button>
              ` : ''}
            </div>
          </div>

          <select onchange="window.changeMultiManager(${idx}, this.value)"
            class="w-full text-xs font-bold rounded-lg px-2 py-1 border transition appearance-none cursor-pointer truncate"
            style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--text-main);">
            ${options}
          </select>
        </div>
      `;
    })
    .join('');

  const canAddMore = selectedManagers.length < 5 && allManagers.length > selectedManagers.length;
  const gridColsClass = selectedManagers.length === 4
    ? 'lg:grid-cols-4'
    : selectedManagers.length >= 5
      ? 'lg:grid-cols-5'
      : 'lg:grid-cols-3';

  return `
    <div class="space-y-4">
      <!-- 1. Manager Selectors Header -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-users text-amber-400 text-xs"></i>
            <span class="font-bold text-xs uppercase tracking-wider" style="color: var(--text-main);">
              Rivali al Tavolo (${selectedManagers.length}/5)
            </span>
          </div>
          ${canAddMore ? `
            <button type="button" onclick="window.addNextMultiManager()"
              class="px-2.5 py-1 rounded-lg border border-dashed flex items-center gap-1.5 text-xs font-bold transition hover:border-amber-400 hover:text-amber-400 opacity-80 hover:opacity-100"
              style="border-color: var(--table-border); color: var(--text-main);">
              <i class="fa-solid fa-plus text-[10px]"></i>
              <span>Aggiungi Rivale</span>
            </button>
          ` : ''}
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 ${gridColsClass} gap-2 sm:gap-2.5">
          ${selectorCards}
        </div>
      </div>

      <!-- 2. Dual Panel: Radar vs Mini-Torneo -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <!-- Left Column: Multi-Radar Chart -->
        <div class="lg:col-span-6 rounded-xl border p-3 sm:p-4 flex flex-col items-center justify-center relative overflow-hidden"
             style="background-color: var(--table-surface); border-color: var(--table-border);">
          <div class="w-full flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-chart-pie text-amber-400 text-xs"></i>
              <h3 class="font-bold text-xs uppercase tracking-wider" style="color: var(--text-main);">
                Radar - 6 Assi
              </h3>
            </div>
            <span class="text-[10px] opacity-60">Scala normalizzata [0-100]</span>
          </div>

          <div class="w-full flex justify-center py-1">
            ${renderMultiManagerRadarSVG(analysis, hiddenManagerIds)}
          </div>

          <!-- Radar legend / Manager toggles -->
          <div class="flex flex-wrap items-center justify-center gap-2 mt-2 pt-2 border-t w-full" style="border-color: var(--table-border);">
            ${analysis.managers
      .map(p => {
        const isHidden = hiddenManagerIds.has(p.manager.id);
        return `
                <button type="button" onclick="window.toggleMultiManagerVisibility('${p.manager.id}')"
                  class="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold border transition ${isHidden ? 'opacity-40 line-through' : 'shadow-sm'}"
                  style="background-color: var(--modal-bg); border-color: ${p.color}60;">
                  <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${p.color};"></span>
                  <span style="color: var(--text-main);">${p.manager.name}</span>
                </button>
              `;
      })
      .join('')}
          </div>
        </div>

        <!-- Right Column: Mini-Torneo Incrociato -->
        <div class="lg:col-span-6 space-y-3">
          ${renderMiniTournamentTable(
        analysis.miniTournament,
        analysis.sharedSeasonsAcrossAll.length,
        tournamentMode,
        analysis.totalPairwiseSeasonsCount
      )}

          <!-- Quick Tip Banner -->
          <div class="p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold"
               style="background-color: var(--table-surface); border-color: rgba(245, 158, 11, 0.25);">
            <div class="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <i class="fa-solid fa-lightbulb text-xs"></i>
            </div>
            <p class="text-[11px] opacity-80" style="color: var(--text-muted);">
              Usa il selettore in alto per alternare tra classifica per <strong>Media Punti (PPG)</strong> su tutti gli scontri o <strong>Solo Contemporanee</strong> a pari partite!
            </p>
          </div>
        </div>
      </div>

      <!-- 3. Parallel Career Comparison Table -->
      <div>
        ${renderCareerComparisonTable(analysis.managers)}
      </div>
    </div>
  `;
}
