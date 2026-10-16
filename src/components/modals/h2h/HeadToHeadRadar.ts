import {
  computeH2HAxes,
  type H2HAxisData,
  RADAR_CANONICAL_AXES,
  type RadarAxisMetadata
} from '@/analytics/radarAxes';

export { computeH2HAxes, RADAR_CANONICAL_AXES };
export type { H2HAxisData, RadarAxisMetadata };

/**
 * Mapping of axis keys to multi-line label configurations to prevent text clipping
 */
const AXIS_LABEL_LINES: Record<string, [string, string?]> = {
  prestige: ['Prestigio'],
  gci: ['Freddezza', '(GCI)'],
  ki: ['Killer', 'Instinct'],
  cr: ['Conversione', 'Coppe'],
  stability: ['Stabilità', 'Classifica'],
  nti: ['Sicurezza', '(Anti-Baratro)']
};

/**
 * Generates an SVG 6-axis Radar Plot for the head-to-head duel
 */
export function renderH2HRadarSVG(
  axes: H2HAxisData[],
  nameA: string,
  nameB: string,
  width = 400,
  height = 340
): string {
  const isStory = width >= 700;
  const isLarge = width >= 500;
  const cx = width / 2;
  const cy = height / 2 + (isStory ? 10 : isLarge ? 8 : 4);
  const rMax = Math.round(Math.min(width, height) * (isStory ? 0.38 : 0.37));
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

  // Scale Percentage Markers along the top vertical spoke (Prestigio axis)
  const scaleMarkers = levels
    .map(lvl => {
      const markerY = cy - rMax * lvl;
      return `
        <text x="${(cx + 4).toFixed(1)}" y="${(markerY + 3).toFixed(1)}"
              text-anchor="start" fill="currentColor" opacity="0.55"
              font-size="${isStory ? '13' : isLarge ? '10' : '8.5'}" font-weight="700">
          ${Math.round(lvl * 100)}%
        </text>
      `;
    })
    .join('');

  // Axis Labels formatted with multi-line <tspan> to eliminate side clipping
  const labels = axes
    .map((axis, i) => {
      const angle = getAngle(i);
      const rLabel = rMax + (isStory ? 38 : isLarge ? 32 : 22);
      const x = cx + rLabel * Math.cos(angle);
      const y = cy + rLabel * Math.sin(angle);

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      let textAnchor = 'middle';
      if (cos > 0.35) textAnchor = 'start';
      else if (cos < -0.35) textAnchor = 'end';

      const lines = AXIS_LABEL_LINES[axis.key] || [axis.label];
      const fontSize = isStory ? '18' : isLarge ? '13.5' : '11.5';

      if (lines.length === 1) {
        let dominantBaseline = 'middle';
        if (sin < -0.4) dominantBaseline = 'auto';
        else if (sin > 0.4) dominantBaseline = 'hanging';

        return `
          <text x="${x.toFixed(1)}" y="${y.toFixed(1)}"
                text-anchor="${textAnchor}" dominant-baseline="${dominantBaseline}"
                fill="currentColor" font-size="${fontSize}" font-weight="800" opacity="0.95">
            ${lines[0]}
          </text>
        `;
      }

      // 2-line rendering with baseline adjustment
      let yStart = y - (isStory ? 10 : isLarge ? 7 : 5);
      if (sin < -0.4) yStart = y - (isStory ? 14 : isLarge ? 10 : 7);
      else if (sin > 0.4) yStart = y;

      return `
        <text x="${x.toFixed(1)}" y="${yStart.toFixed(1)}"
              text-anchor="${textAnchor}"
              fill="currentColor" font-size="${fontSize}" font-weight="800" opacity="0.95">
          <tspan x="${x.toFixed(1)}" dy="0">${lines[0]}</tspan>
          <tspan x="${x.toFixed(1)}" dy="1.15em">${lines[1]}</tspan>
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

  const dotRadius = isStory ? '5.5' : isLarge ? '4.5' : '3.8';
  const strokeWidth = isStory ? '3.5' : isLarge ? '2.8' : '2.2';

  // Circles on vertices
  const dotsA = coordsA
    .map(
      p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${dotRadius}" fill="var(--h2h-contender-a, #be123c)" stroke="#ffffff" stroke-width="1.3" style="fill: var(--h2h-contender-a, #be123c);" />`
    )
    .join('');

  const dotsB = coordsB
    .map(
      p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${dotRadius}" fill="var(--h2h-contender-b, #0284c7)" stroke="#ffffff" stroke-width="1.3" style="fill: var(--h2h-contender-b, #0284c7);" />`
    )
    .join('');

  const containerMaxWidth = isStory ? 'max-w-[860px]' : isLarge ? 'max-w-[620px]' : 'max-w-[440px]';

  return `
    <div class="w-full flex flex-col items-center">
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="w-full ${containerMaxWidth} h-auto overflow-visible text-[var(--text-main)] select-none" style="width: 100%; max-width: ${isStory ? `${width}px` : isLarge ? '620px' : '440px'}; height: auto; color: var(--text-main, #f8fafc);">
        <!-- Background Grid -->
        ${gridPolygons}
        ${spokes}
        ${scaleMarkers}

        <!-- Manager B Polygon -->
        ${nameB ? `
        <polygon points="${pointsB}" fill="var(--h2h-contender-b, #0284c7)" fill-opacity="0.28" stroke="var(--h2h-contender-b, #0284c7)" stroke-width="${strokeWidth}" style="fill: var(--h2h-contender-b, #0284c7); stroke: var(--h2h-contender-b, #0284c7);" />
        ${dotsB}
        ` : ''}

        <!-- Manager A Polygon -->
        <polygon points="${pointsA}" fill="var(--h2h-contender-a, #be123c)" fill-opacity="0.28" stroke="var(--h2h-contender-a, #be123c)" stroke-width="${strokeWidth}" style="fill: var(--h2h-contender-a, #be123c); stroke: var(--h2h-contender-a, #be123c);" />
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
        ${nameB ? `
        <span class="flex items-center gap-1.5" style="color: var(--h2h-contender-b);">
          <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: var(--h2h-contender-b);"></span>
          ${nameB}
        </span>
        ` : ''}
      </div>

      <!-- Radar Scale Note -->
      <div class="text-[10px] opacity-60 mt-1 text-center font-medium">
        Scala normalizzata: 0 – 100% (anelli a 33% • 66% • 100%)
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
        <div class="py-2.5 px-2.5 sm:px-3 border-b last:border-b-0" style="border-color: var(--table-border);">
          <div class="flex items-center justify-between text-[11px] mb-2 gap-1.5">
            <!-- Left Value (Centered) -->
            <span class="flex-1 min-w-0 max-w-[36%] text-center font-bold flex items-center justify-center gap-1 leading-tight break-words" style="color: ${colorA};">
              ${winner === 'A' ? '<i class="fa-solid fa-crown text-[9px] shrink-0" style="color: var(--h2h-contender-a);"></i>' : ''}
              <span class="${winner === 'A' ? 'font-black' : 'opacity-85'} text-[10px] sm:text-[11px]">${axis.rawA}</span>
            </span>

            <!-- Center Axis Label (2 Rows: Category + Acronym) -->
            <div class="w-[28%] sm:w-[26%] text-center px-1 shrink-0 flex flex-col items-center justify-center">
              <span class="font-black uppercase tracking-tight text-[9px] sm:text-[10px] opacity-80 leading-tight" style="color: var(--text-main);">
                ${axis.shortTitle}
              </span>
              <span class="font-extrabold text-[8px] sm:text-[9px] opacity-60 leading-none mt-0.5" style="color: var(--accent-color, #eab308);">
                (${axis.acronym})
              </span>
            </div>

            <!-- Right Value (Centered) -->
            <span class="flex-1 min-w-0 max-w-[36%] text-center font-bold flex items-center justify-center gap-1 leading-tight break-words" style="color: ${colorB};">
              <span class="${winner === 'B' ? 'font-black' : 'opacity-85'} text-[10px] sm:text-[11px]">${axis.rawB}</span>
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
