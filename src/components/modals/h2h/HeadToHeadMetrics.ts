import type { HeadToHeadStats, Manager } from '@/types';
import { computeH2HAxes, renderH2HRadarSVG, renderH2HDuelBars } from './HeadToHeadRadar';

/**
 * Renders an icon/emoji badge safely without leaking raw FontAwesome class strings
 */
function renderIconBadge(icon: string, label: string): string {
  if (!icon) return label;
  const iconHTML = icon.startsWith('fa-')
    ? `<i class="fa-solid ${icon} mr-1 text-[11px]"></i>`
    : `<span class="mr-1">${icon}</span>`;
  return `${iconHTML}${label}`;
}

/**
 * Metrics comparison row helper with 2-line center category + acronym and non-truncated wrapping values
 */
function renderMetricRow(
  category: string,
  acronym: string,
  strA: string,
  strB: string,
  winner: 'A' | 'B' | 'none' = 'none'
): string {
  const classA = winner === 'A'
    ? 'font-black rounded-lg py-1 px-1.5'
    : 'font-semibold opacity-85 py-1 px-1.5';
  const styleA = winner === 'A'
    ? 'color: var(--h2h-contender-a); background-color: rgba(125, 125, 125, 0.08);'
    : 'color: var(--text-main);';

  const classB = winner === 'B'
    ? 'font-black rounded-lg py-1 px-1.5'
    : 'font-semibold opacity-85 py-1 px-1.5';
  const styleB = winner === 'B'
    ? 'color: var(--h2h-contender-b); background-color: rgba(125, 125, 125, 0.08);'
    : 'color: var(--text-main);';

  return `
    <div class="flex items-center justify-between py-2 px-2.5 sm:px-3 border-b last:border-b-0 text-xs gap-1.5" style="border-color: var(--table-border);">
      <!-- Left Value (Centered) -->
      <span class="flex-1 min-w-0 max-w-[36%] text-center leading-tight break-words text-[11px] sm:text-xs ${classA}" style="${styleA}">
        ${strA}
      </span>

      <!-- Center Title (2 lines: Category + Acronym) -->
      <div class="w-[28%] sm:w-[26%] text-center px-1 shrink-0 flex flex-col items-center justify-center">
        <span class="font-black uppercase tracking-tight text-[9px] sm:text-[10px] opacity-80 leading-tight" style="color: var(--text-main);">
          ${category}
        </span>
        <span class="font-extrabold text-[8px] sm:text-[9px] opacity-60 leading-none mt-0.5" style="color: var(--accent-color, #eab308);">
          (${acronym})
        </span>
      </div>

      <!-- Right Value (Centered) -->
      <span class="flex-1 min-w-0 max-w-[36%] text-center leading-tight break-words text-[11px] sm:text-xs ${classB}" style="${styleB}">
        ${strB}
      </span>
    </div>
  `;
}

/**
 * Renders the econometric metrics section:
 * - Radar vs Bars visual comparison
 * - Advanced metric rows (GCI, Killer Instinct, Conversion, NTI, Stability)
 * - Historical narrative verdict card
 */
export function renderHeadToHeadMetrics(
  stats: HeadToHeadStats,
  managerA: Manager,
  managerB: Manager,
  visualMode: 'radar' | 'bars' = 'radar'
): string {
  const { metricsA, metricsB } = stats;

  const axesData = computeH2HAxes(stats);
  const radarHTML = renderH2HRadarSVG(axesData, managerA.name, managerB.name);
  const barsHTML = renderH2HDuelBars(axesData, managerA.name, managerB.name);

  return `
    <!-- SECTION 3: Indicatori di Performance & Grafico Comparativo Dual-Mode -->
    <div class="p-3.5 rounded-2xl border" style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-chart-line text-emerald-500 text-xs"></i>
          <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--text-main);">
            Indicatori &amp; Confronto Grafico
          </span>
        </div>

        <!-- Segmented Control for Dual Mode: Radar vs Bars -->
        <div class="flex items-center p-0.5 rounded-xl border text-[11px] font-bold shadow-sm"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <button type="button" onclick="setH2HVisualMode('radar')"
            class="px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${visualMode === 'radar' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'opacity-70 hover:opacity-100'}"
            style="${visualMode === 'radar' ? 'color: #020617;' : 'color: var(--text-main);'}">
            <i class="fa-solid fa-network-wired text-[10px]"></i>
            <span>Radar</span>
          </button>
          <button type="button" onclick="setH2HVisualMode('bars')"
            class="px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${visualMode === 'bars' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'opacity-70 hover:opacity-100'}"
            style="${visualMode === 'bars' ? 'color: #020617;' : 'color: var(--text-main);'}">
            <i class="fa-solid fa-chart-simple text-[10px]"></i>
            <span>Barre</span>
          </button>
        </div>
      </div>

      <!-- Visual Display: Radar or Duel Bars -->
      <div class="mb-3.5 p-2.5 rounded-xl border" style="background-color: var(--modal-bg); border-color: var(--table-border);">
        ${visualMode === 'radar' ? radarHTML : barsHTML}
      </div>

      <!-- Detailed Metrics Table -->
      <div class="rounded-xl border overflow-hidden" style="background-color: var(--modal-bg); border-color: var(--table-border);">
        ${renderMetricRow(
    'Freddezza',
    'GCI',
    renderIconBadge(metricsA.clutchIcon, metricsA.clutchLabel),
    renderIconBadge(metricsB.clutchIcon, metricsB.clutchLabel),
    metricsA.gci > metricsB.gci ? 'A' : metricsB.gci > metricsA.gci ? 'B' : 'none'
  )}
        ${renderMetricRow(
    'Killer Instinct',
    'KI',
    `${metricsA.kiPct}%`,
    `${metricsB.kiPct}%`,
    metricsA.kiPct > metricsB.kiPct ? 'A' : metricsB.kiPct > metricsA.kiPct ? 'B' : 'none'
  )}
        ${renderMetricRow(
    'Conv. Finali',
    'COPPE',
    `${metricsA.crPct}%`,
    `${metricsB.crPct}%`,
    metricsA.crPct > metricsB.crPct ? 'A' : metricsB.crPct > metricsA.crPct ? 'B' : 'none'
  )}
        ${renderMetricRow(
    'Rischio Coda',
    'NTI',
    renderIconBadge(metricsA.polarityIcon, metricsA.polarityLabel),
    renderIconBadge(metricsB.polarityIcon, metricsB.polarityLabel),
    metricsA.nti > metricsB.nti ? 'A' : metricsB.nti > metricsA.nti ? 'B' : 'none'
  )}
        ${renderMetricRow(
    'Stabilità',
    'RANK',
    renderIconBadge(metricsA.stabilityIcon, metricsA.stabilityCategory),
    renderIconBadge(metricsB.stabilityIcon, metricsB.stabilityCategory),
    metricsA.stdDevRank < metricsB.stdDevRank ? 'A' : metricsB.stdDevRank < metricsA.stdDevRank ? 'B' : 'none'
  )}
      </div>
    </div>

    <!-- SECTION 4: Verdetto Narrativo Automatico -->
    <div class="p-3.5 rounded-2xl border border-l-4 shadow-sm"
         style="background-color: var(--table-surface); border-color: var(--table-border); border-left-color: var(--accent-color); color: var(--text-main);">
      <div class="flex items-center gap-2 mb-1.5 font-bold text-xs" style="color: var(--accent-color);">
        <i class="fa-solid fa-scroll"></i>
        <span>Verdetto Storico della Sfida</span>
      </div>
      <p class="text-xs leading-relaxed opacity-90 font-medium" style="color: var(--text-main);">
        ${stats.narrativeVerdict}
      </p>
    </div>
  `;
}
