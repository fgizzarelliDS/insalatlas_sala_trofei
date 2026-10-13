import type { HeadToHeadStats } from '@/types';
import { formatScore } from '@/score';

export interface H2HAxisData {
  key: string;
  label: string;
  valA: number; // 0..100
  valB: number; // 0..100
  rawA: string;
  rawB: string;
}

/**
 * Computes the 6 normalized axes for comparative visualization
 */
export function computeH2HAxes(stats: HeadToHeadStats, maxLeagueScore = 40): H2HAxisData[] {
  const { metricsA, metricsB } = stats;

  const benchmarkScore = Math.max(metricsA.score, metricsB.score, maxLeagueScore, 10);
  const prestigeValA = Math.min(100, Math.max(0, Math.round((metricsA.score / benchmarkScore) * 100)));
  const prestigeValB = Math.min(100, Math.max(0, Math.round((metricsB.score / benchmarkScore) * 100)));

  const stabilityValA = Math.min(100, Math.max(0, Math.round(Math.max(0, 100 - metricsA.stdDevRank * 18))));
  const stabilityValB = Math.min(100, Math.max(0, Math.round(Math.max(0, 100 - metricsB.stdDevRank * 18))));

  const ntiValA = Math.min(100, Math.max(0, Math.round(50 + metricsA.nti * 50)));
  const ntiValB = Math.min(100, Math.max(0, Math.round(50 + metricsB.nti * 50)));

  return [
    {
      key: 'prestige',
      label: 'Prestigio',
      valA: prestigeValA,
      valB: prestigeValB,
      rawA: `${formatScore(metricsA.score)} PT`,
      rawB: `${formatScore(metricsB.score)} PT`
    },
    {
      key: 'gci',
      label: 'Freddezza (GCI)',
      valA: Math.min(100, Math.max(0, Math.round(metricsA.gci))),
      valB: Math.min(100, Math.max(0, Math.round(metricsB.gci))),
      rawA: `${metricsA.clutchLabel} (${Math.round(metricsA.gci)})`,
      rawB: `${metricsB.clutchLabel} (${Math.round(metricsB.gci)})`
    },
    {
      key: 'ki',
      label: 'Killer Instinct',
      valA: Math.min(100, Math.max(0, Math.round(metricsA.kiPct))),
      valB: Math.min(100, Math.max(0, Math.round(metricsB.kiPct))),
      rawA: `${metricsA.kiPct}%`,
      rawB: `${metricsB.kiPct}%`
    },
    {
      key: 'cr',
      label: 'Conversione Coppe',
      valA: Math.min(100, Math.max(0, Math.round(metricsA.crPct))),
      valB: Math.min(100, Math.max(0, Math.round(metricsB.crPct))),
      rawA: `${metricsA.crPct}%`,
      rawB: `${metricsB.crPct}%`
    },
    {
      key: 'stability',
      label: 'Stabilità Classifica',
      valA: stabilityValA,
      valB: stabilityValB,
      rawA: `${metricsA.stabilityCategory}`,
      rawB: `${metricsB.stabilityCategory}`
    },
    {
      key: 'nti',
      label: 'Sicurezza (Anti-Baratro)',
      valA: ntiValA,
      valB: ntiValB,
      rawA: `${metricsA.polarityLabel}`,
      rawB: `${metricsB.polarityLabel}`
    }
  ];
}

/**
 * Generates an SVG 6-axis Radar Plot for the head-to-head duel
 */
export function renderH2HRadarSVG(
  axes: H2HAxisData[],
  nameA: string,
  nameB: string
): string {
  const width = 340;
  const height = 290;
  const cx = width / 2;
  const cy = height / 2 + 5;
  const rMax = 88;
  const count = axes.length;

  // Compute angle for each axis (0 is top)
  const getAngle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / count;

  // Background concentric grid rings (33%, 66%, 100%)
  const levels = [0.33, 0.66, 1.0];
  const gridPolygons = levels
    .map(lvl => {
      const pts = axes
        .map((_, i) => {
          const angle = getAngle(i);
          const r = rMax * lvl;
          return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
        })
        .join(' ');
      return `<polygon points="${pts}" fill="none" stroke="currentColor" stroke-opacity="${lvl === 1.0 ? '0.25' : '0.12'}" stroke-dasharray="${lvl === 1.0 ? 'none' : '3,3'}" />`;
    })
    .join('');

  // Spokes from center
  const spokes = axes
    .map((_, i) => {
      const angle = getAngle(i);
      const x = (cx + rMax * Math.cos(angle)).toFixed(1);
      const y = (cy + rMax * Math.sin(angle)).toFixed(1);
      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="currentColor" stroke-opacity="0.18" />`;
    })
    .join('');

  // Axis Labels
  const labels = axes
    .map((axis, i) => {
      const angle = getAngle(i);
      const rLabel = rMax + 24;
      const x = cx + rLabel * Math.cos(angle);
      const y = cy + rLabel * Math.sin(angle);

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      let textAnchor = 'middle';
      if (cos > 0.35) textAnchor = 'start';
      else if (cos < -0.35) textAnchor = 'end';

      let dominantBaseline = 'middle';
      if (sin < -0.4) dominantBaseline = 'auto';
      else if (sin > 0.4) dominantBaseline = 'hanging';

      return `
        <text x="${x.toFixed(1)}" y="${y.toFixed(1)}"
              text-anchor="${textAnchor}" dominant-baseline="${dominantBaseline}"
              fill="currentColor" font-size="9" font-weight="700" opacity="0.85">
          ${axis.label}
        </text>
      `;
    })
    .join('');

  // Coordinates for Manager A
  const coordsA = axes.map((axis, i) => {
    const angle = getAngle(i);
    const r = Math.max(8, (axis.valA / 100) * rMax);
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      val: axis.valA
    };
  });
  const pointsA = coordsA.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Coordinates for Manager B
  const coordsB = axes.map((axis, i) => {
    const angle = getAngle(i);
    const r = Math.max(8, (axis.valB / 100) * rMax);
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      val: axis.valB
    };
  });
  const pointsB = coordsB.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Circles on vertices
  const dotsA = coordsA
    .map(
      p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="var(--h2h-contender-a)" stroke="#ffffff" stroke-width="1.2" />`
    )
    .join('');

  const dotsB = coordsB
    .map(
      p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="var(--h2h-contender-b)" stroke="#ffffff" stroke-width="1.2" />`
    )
    .join('');

  return `
    <div class="flex flex-col items-center">
      <svg viewBox="0 0 ${width} ${height}" class="w-full max-w-[340px] h-auto overflow-visible text-[var(--text-main)] select-none">
        <!-- Background Grid -->
        ${gridPolygons}
        ${spokes}

        <!-- Manager B Polygon -->
        <polygon points="${pointsB}" fill="var(--h2h-contender-b)" fill-opacity="0.28" stroke="var(--h2h-contender-b)" stroke-width="2" />
        ${dotsB}

        <!-- Manager A Polygon -->
        <polygon points="${pointsA}" fill="var(--h2h-contender-a)" fill-opacity="0.28" stroke="var(--h2h-contender-a)" stroke-width="2" />
        ${dotsA}

        <!-- Axis Labels -->
        ${labels}
      </svg>

      <!-- Radar Legend -->
      <div class="flex items-center justify-center gap-5 mt-1 text-[11px] font-bold">
        <span class="flex items-center gap-1.5" style="color: var(--h2h-contender-a);">
          <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: var(--h2h-contender-a);"></span>
          ${nameA}
        </span>
        <span class="flex items-center gap-1.5" style="color: var(--h2h-contender-b);">
          <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: var(--h2h-contender-b);"></span>
          ${nameB}
        </span>
      </div>
    </div>
  `;
}

/**
 * Generates Comparative Mirrored Duel Bars for the head-to-head duel
 */
export function renderH2HDuelBars(
  axes: H2HAxisData[],
  nameA: string,
  nameB: string
): string {
  const rows = axes
    .map(axis => {
      const winner = axis.valA > axis.valB ? 'A' : axis.valB > axis.valA ? 'B' : 'tie';

      const colorA = winner === 'A' ? 'var(--h2h-contender-a)' : 'var(--text-main)';
      const colorB = winner === 'B' ? 'var(--h2h-contender-b)' : 'var(--text-main)';

      return `
        <div class="py-2.5 px-3 border-b last:border-b-0" style="border-color: var(--table-border);">
          <div class="flex items-center justify-between text-[11px] mb-1.5">
            <!-- Left Value -->
            <span class="w-32 text-left font-bold flex items-center gap-1 truncate" style="color: ${colorA};">
              ${winner === 'A' ? '<i class="fa-solid fa-crown text-[9px] shrink-0" style="color: var(--h2h-contender-a);"></i>' : ''}
              <span class="${winner === 'A' ? 'font-black' : 'opacity-85'}">${axis.rawA}</span>
            </span>

            <!-- Center Axis Label -->
            <span class="flex-1 text-center font-bold uppercase tracking-wider text-[10px] opacity-75 truncate px-1" style="color: var(--text-main);">
              ${axis.label}
            </span>

            <!-- Right Value -->
            <span class="w-32 text-right font-bold flex items-center justify-end gap-1 truncate" style="color: ${colorB};">
              <span class="${winner === 'B' ? 'font-black' : 'opacity-85'}">${axis.rawB}</span>
              ${winner === 'B' ? '<i class="fa-solid fa-crown text-[9px] shrink-0" style="color: var(--h2h-contender-b);"></i>' : ''}
            </span>
          </div>

          <!-- Mirrored Progress Bars -->
          <div class="grid grid-cols-2 gap-2 items-center">
            <!-- Left Bar: Grows Right to Left -->
            <div class="h-2 w-full rounded-full overflow-hidden flex justify-end"
                 style="background-color: var(--modal-bg); border: 1px solid var(--table-border);">
              <div class="h-full rounded-full transition-all duration-500"
                   style="width: ${axis.valA}%; background-color: var(--h2h-contender-a);"></div>
            </div>

            <!-- Right Bar: Grows Left to Right -->
            <div class="h-2 w-full rounded-full overflow-hidden flex justify-start"
                 style="background-color: var(--modal-bg); border: 1px solid var(--table-border);">
              <div class="h-full rounded-full transition-all duration-500"
                   style="width: ${axis.valB}%; background-color: var(--h2h-contender-b);"></div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div>
      <div class="flex items-center justify-between px-3 pb-2 text-[11px] font-extrabold border-b" style="border-color: var(--table-border);">
        <span class="flex items-center gap-1.5" style="color: var(--h2h-contender-a);">
          <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: var(--h2h-contender-a);"></span>
          ${nameA}
        </span>
        <span class="uppercase text-[9px] opacity-50 tracking-wider">Confronto Statistiche</span>
        <span class="flex items-center gap-1.5" style="color: var(--h2h-contender-b);">
          ${nameB}
          <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: var(--h2h-contender-b);"></span>
        </span>
      </div>

      <div class="rounded-xl overflow-hidden mt-1">
        ${rows}
      </div>
    </div>
  `;
}
