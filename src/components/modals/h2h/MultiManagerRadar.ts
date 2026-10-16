import type { MultiManagerAnalysis } from '@/analytics/multiManager';

const AXIS_LABEL_LINES: Record<string, [string, string?]> = {
  prestige: ['Prestigio'],
  gci: ['Freddezza', '(GCI)'],
  ki: ['Killer', 'Instinct'],
  cr: ['Conversione', 'Coppe'],
  stability: ['Stabilità', 'Classifica'],
  nti: ['Sicurezza', '(Anti-Baratro)']
};

/**
 * Generates an SVG 6-axis Radar Plot for 3 or more managers ("Tavolo dei Rivali")
 * with dynamic toggleable polygons and colored vertex dots.
 */
export function renderMultiManagerRadarSVG(
  analysis: MultiManagerAnalysis,
  hiddenManagerIds: Set<string> = new Set(),
  width = 390,
  height = 310
): string {
  if (!analysis.managers || analysis.managers.length === 0) {
    return `<div class="p-8 text-center text-xs opacity-60">Nessun dato disponibile</div>`;
  }

  const isLarge = width >= 500;
  const cx = width / 2;
  const cy = height / 2 + (isLarge ? 8 : 5);
  const rMax = Math.round(Math.min(width, height) * 0.31);
  const axes = analysis.managers[0].axes;
  const count = axes.length;

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

  // Scale Percentage Markers
  const scaleMarkers = levels
    .map(lvl => {
      const markerY = cy - rMax * lvl;
      return `
        <text x="${(cx + 4).toFixed(1)}" y="${(markerY + 3).toFixed(1)}"
              text-anchor="start" fill="currentColor" opacity="0.45"
              font-size="7.5" font-weight="700">
          ${Math.round(lvl * 100)}%
        </text>
      `;
    })
    .join('');

  // Axis Labels with multi-line support
  const labels = axes
    .map((axis, i) => {
      const angle = getAngle(i);
      const rLabel = rMax + (isLarge ? 36 : 22);
      const x = cx + rLabel * Math.cos(angle);
      const y = cy + rLabel * Math.sin(angle);

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      let textAnchor = 'middle';
      if (cos > 0.35) textAnchor = 'start';
      else if (cos < -0.35) textAnchor = 'end';

      const lines = AXIS_LABEL_LINES[axis.key] || [axis.label];

      if (lines.length === 1) {
        let dominantBaseline = 'middle';
        if (sin < -0.4) dominantBaseline = 'auto';
        else if (sin > 0.4) dominantBaseline = 'hanging';

        return `
          <text x="${x.toFixed(1)}" y="${y.toFixed(1)}"
                text-anchor="${textAnchor}" dominant-baseline="${dominantBaseline}"
                fill="currentColor" font-size="${isLarge ? '12.5' : '9'}" font-weight="700" opacity="0.9">
            ${lines[0]}
          </text>
        `;
      }

      let yStart = y - (isLarge ? 7 : 5);
      if (sin < -0.4) yStart = y - (isLarge ? 10 : 7);
      else if (sin > 0.4) yStart = y;

      return `
        <text x="${x.toFixed(1)}" y="${yStart.toFixed(1)}"
              text-anchor="${textAnchor}"
              fill="currentColor" font-size="${isLarge ? '12.5' : '9'}" font-weight="700" opacity="0.9">
          <tspan x="${x.toFixed(1)}" dy="0">${lines[0]}</tspan>
          <tspan x="${x.toFixed(1)}" dy="1.15em">${lines[1]}</tspan>
        </text>
      `;
    })
    .join('');

  // Manager Polygons & Dots
  const managerPolygons = analysis.managers
    .map(profile => {
      if (hiddenManagerIds.has(profile.manager.id)) return '';

      const coords = profile.axes.map((axis, i) => {
        const angle = getAngle(i);
        const r = Math.max(8, (axis.val / 100) * rMax);
        return {
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle)
        };
      });

      const points = coords.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const dots = coords
        .map(
          p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${isLarge ? '4.8' : '3.2'}" fill="${profile.color}" stroke="#0f172a" stroke-width="1.2" />`
        )
        .join('');

      return `
        <g id="radar-poly-${profile.manager.id}" class="transition-opacity duration-300">
          <polygon points="${points}" fill="${profile.color}" fill-opacity="0.22" stroke="${profile.color}" stroke-width="${isLarge ? '2.8' : '2.2'}" stroke-linejoin="round" />
          ${dots}
        </g>
      `;
    })
    .join('');

  return `
    <div class="flex flex-col items-center">
      <svg viewBox="0 0 ${width} ${height}" class="w-full ${isLarge ? 'max-w-[620px]' : 'max-w-[390px]'} h-auto overflow-visible select-none" style="color: var(--text-main);">
        <!-- Concentric grid -->
        ${gridPolygons}
        ${spokes}
        ${scaleMarkers}

        <!-- Overlapping manager polygons -->
        ${managerPolygons}

        <!-- Outer Labels -->
        ${labels}
      </svg>
    </div>
  `;
}
