/**
 * src/components/modals/analytics/EloScatterChart.ts
 * Visual SVG Bubble/Scatter Chart Component for Elo Studio (Opta/StatsBomb Pro Style):
 * - Tab 2: ⚽ Elo vs Golo Score (Tactical Efficiency & Over/Underperformance)
 * - Tab 3: 📊 Elo vs FantaPunti (Raw Scoring Power vs Elo Conversion)
 * - Tab 4: 🍀 Sfiga & SOS (Schedule Luck & H2H vs All-Play Disparity)
 */

import type { EloTrackMode } from '@/types/analytics';
import type { EloProfileEntry } from './EloKpis';
import {
  buildScatterPoints,
  computeLinearRegression,
  applyClusterRepulsion,
  isSeasonInProgress,
  type ScatterMetricView,
  type LuckScatterSubMode,
  type ScatterPoint,
  type ScatterDataset,
  type LayoutPoint,
  type PlotBounds
} from './EloScatterData';

// Transparent re-exports for complete backward compatibility
export {
  buildScatterPoints,
  computeLinearRegression,
  applyClusterRepulsion,
  isSeasonInProgress,
  type ScatterMetricView,
  type LuckScatterSubMode,
  type ScatterPoint,
  type ScatterDataset,
  type LayoutPoint,
  type PlotBounds
};

/**
 * Renders the native responsive SVG Scatter / Bubble Chart card in Opta/StatsBomb Pro style
 */
export function renderEloScatterChart(
  profiles: EloProfileEntry[],
  view: ScatterMetricView,
  activeMode: EloTrackMode,
  selectedSeason: string,
  luckSubMode: LuckScatterSubMode = 'allPlay'
): string {
  const dataset = buildScatterPoints(profiles, view, activeMode, selectedSeason, luckSubMode);
  const { points, labelX, labelY, unitX, unitY, isParitySupported, parityY, crosshairX, crosshairY, isBisectorSupported, quadrantLabels } = dataset;

  if (points.length === 0) {
    return `
      <div class="p-8 text-center text-xs opacity-70">
        Nessun dato diagnostico per il grafico scatter selezionato.
      </div>
    `;
  }

  // Adaptive Mobile Geometry
  const isMobile = typeof window !== 'undefined' && typeof window.innerWidth === 'number' && window.innerWidth > 0 && window.innerWidth < 640;
  const width = isMobile ? 540 : 740;
  const height = isMobile ? 460 : 440;
  const padLeft = isMobile ? 56 : 68;
  const padRight = isMobile ? 22 : 32;
  const padTop = isMobile ? 32 : 36;
  const padBottom = isMobile ? 52 : 56;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Extents calculation with strict non-negative origin for points
  let minX = Math.min(...points.map(p => p.x));
  let maxX = Math.max(...points.map(p => p.x));
  let minY = Math.min(...points.map(p => p.y));
  let maxY = Math.max(...points.map(p => p.y));

  if (view === 'luck' && luckSubMode === 'allPlay') {
    // Points in football/fantasy can never be negative. Origin strictly at (0, 0)
    minX = 0;
    minY = 0;
    const maxVal = Math.max(maxX, maxY, 3);
    const topBound = Math.ceil(maxVal + Math.max(1, maxVal * 0.14));
    maxX = topBound;
    maxY = topBound;
  } else if (isBisectorSupported) {
    // luckSubMode === 'h2hVsAtlas' (Elo ratings around 1400-1700)
    const commonMin = Math.min(minX, minY);
    const commonMax = Math.max(maxX, maxY);
    const range = commonMax - commonMin || 10;
    minX = Math.floor((commonMin - range * 0.08) / 10) * 10;
    maxX = Math.ceil((commonMax + range * 0.08) / 10) * 10;
    minY = minX;
    maxY = maxX;
  } else if (view === 'golo') {
    const rangeX = maxX - minX || 10;
    const rangeY = maxY - minY || 0.5;
    minX = Math.floor((minX - rangeX * 0.08) / 10) * 10;
    maxX = Math.ceil((maxX + rangeX * 0.08) / 10) * 10;
    // Allow negative Golo without Math.max(0, ...) so underperforming teams fit comfortably
    minY = Math.floor((minY - rangeY * 0.12) * 10) / 10;
    maxY = Math.ceil((maxY + rangeY * 0.12) * 10) / 10;
    if (isParitySupported && parityY !== undefined) {
      minY = Math.min(minY, parityY - 0.25);
      maxY = Math.max(maxY, parityY + 0.25);
    }
  } else {
    // view === 'fp'
    const rangeX = maxX - minX || 5;
    const rangeY = maxY - minY || 10;
    minX = Math.max(40, Math.floor(minX - rangeX * 0.08));
    maxX = Math.ceil(maxX + rangeX * 0.08);
    minY = Math.floor((minY - rangeY * 0.08) / 10) * 10;
    maxY = Math.ceil((maxY + rangeY * 0.08) / 10) * 10;
  }

  // Internal margin padding so boundary nodes with max radius (22px) never clip outside plot borders
  const innerPad = 22;
  const innerW = plotW - 2 * innerPad;
  const innerH = plotH - 2 * innerPad;
  const scaleX = (val: number) => padLeft + innerPad + ((val - minX) / (maxX - minX)) * innerW;
  const scaleY = (val: number) => padTop + innerPad + innerH - ((val - minY) / (maxY - minY)) * innerH;

  // Split coordinates for crosshairs
  const hasCrosshairs = !isBisectorSupported && crosshairX !== undefined && crosshairY !== undefined;
  const splitX = hasCrosshairs ? Math.max(padLeft + 15, Math.min(padLeft + plotW - 15, scaleX(crosshairX!))) : padLeft + plotW / 2;
  const splitY = hasCrosshairs ? Math.max(padTop + 15, Math.min(padTop + plotH - 15, scaleY(crosshairY!))) : padTop + plotH / 2;

  // Ultra-subtle corner ambient shading (center 100% clean and transparent)
  const quadrantFillsSvg = `
    <!-- Top-Left Ambient Tint -->
    <rect x="${padLeft}" y="${padTop}" width="${plotW / 2}" height="${plotH / 2}"
          fill="url(#grad-quad-tl)" pointer-events="none" />
    <!-- Top-Right Ambient Tint -->
    <rect x="${padLeft + plotW / 2}" y="${padTop}" width="${plotW / 2}" height="${plotH / 2}"
          fill="url(#grad-quad-tr)" pointer-events="none" />
    <!-- Bottom-Left Ambient Tint -->
    <rect x="${padLeft}" y="${padTop + plotH / 2}" width="${plotW / 2}" height="${plotH / 2}"
          fill="url(#grad-quad-bl)" pointer-events="none" />
    <!-- Bottom-Right Ambient Tint -->
    <rect x="${padLeft + plotW / 2}" y="${padTop + plotH / 2}" width="${plotW / 2}" height="${plotH / 2}"
          fill="url(#grad-quad-br)" pointer-events="none" />
  `;

  // Crosshairs SVG
  let crosshairsSvg = '';
  if (hasCrosshairs) {
    crosshairsSvg = `
      <!-- Vertical Crosshair -->
      <line x1="${splitX}" y1="${padTop}" x2="${splitX}" y2="${padTop + plotH}"
            stroke="var(--table-border)" stroke-width="1.3" stroke-dasharray="4,4" opacity="0.6" />
      <text x="${splitX + 6}" y="${padTop + plotH - 6}"
            style="fill: var(--text-muted);"
            class="font-mono text-[9px] font-bold select-none opacity-90">
        ${crosshairX! >= 100 ? Math.round(crosshairX!) : crosshairX!.toFixed(1)}${unitX}
      </text>

      <!-- Horizontal Crosshair -->
      <line x1="${padLeft}" y1="${splitY}" x2="${padLeft + plotW}" y2="${splitY}"
            stroke="var(--table-border)" stroke-width="1.3" stroke-dasharray="4,4" opacity="0.6" />
      <text x="${padLeft + 6}" y="${splitY - 6}"
            style="fill: var(--text-muted);"
            class="font-mono text-[9px] font-bold select-none opacity-90">
        ${unitY ? `${labelY.split(' ')[0]}: ` : ''}${crosshairY! >= 100 ? Math.round(crosshairY!) : crosshairY!.toFixed(view === 'golo' ? 2 : 1)}${unitY}
      </text>
    `;
  }

  // Parity line Y = 1.00 SVG (for Golo)
  let parityLineSvg = '';
  if (isParitySupported && parityY !== undefined) {
    const py = scaleY(parityY);
    parityLineSvg = `
      <line x1="${padLeft}" y1="${py}" x2="${padLeft + plotW}" y2="${py}"
            stroke="#f59e0b" stroke-width="1.6" stroke-dasharray="6,4" opacity="0.8" />
      <text x="${padLeft + plotW - 8}" y="${py - 6}" text-anchor="end"
            class="fill-amber-500 font-mono text-[10px] font-bold select-none">Parità Golo = 1.00</text>
    `;
  }

  // Bisector line Y = X SVG (for Luck)
  let bisectorLineSvg = '';
  if (isBisectorSupported) {
    const bx1 = scaleX(minX);
    const by1 = scaleY(minX);
    const bx2 = scaleX(maxX);
    const by2 = scaleY(maxX);

    // Position bisector badge along bisector line at 55% without colliding with watermarks
    const bxMid = bx1 + (bx2 - bx1) * 0.55;
    const byMid = by1 + (by2 - by1) * 0.55;
    const bisectorBadgeW = 135;
    const bisectorBadgeH = 20;
    const bisectorBadgeX = Math.max(padLeft + 160, Math.min(padLeft + plotW - 160 - bisectorBadgeW, bxMid - bisectorBadgeW / 2));
    const bisectorBadgeY = Math.max(padTop + 36, Math.min(padTop + plotH - 36 - bisectorBadgeH, byMid - bisectorBadgeH - 6));

    bisectorLineSvg = `
      <line x1="${bx1}" y1="${by1}" x2="${bx2}" y2="${by2}"
            stroke="#06b6d4" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="6,4"
            filter="url(#scatter-neon-glow)" opacity="0.9" />
      <g transform="translate(${bisectorBadgeX}, ${bisectorBadgeY})">
        <rect x="0" y="0" width="${bisectorBadgeW}" height="${bisectorBadgeH}" rx="5" fill="#06b6d4" fill-opacity="0.15" stroke="#06b6d4" stroke-width="1" />
        <text x="${bisectorBadgeW / 2}" y="13.5" text-anchor="middle" class="fill-cyan-500 font-mono text-[9.5px] font-bold select-none">
          ⚖️ Bisettrice Y = X
        </text>
      </g>
    `;
  }

  // OLS Trendline SVG (for Golo and FP)
  const reg = computeLinearRegression(points.map(p => ({ x: p.x, y: p.y })));
  let olsLineSvg = '';
  if (!isBisectorSupported) {
    const regLineX1 = minX;
    const regLineY1 = reg.slope * regLineX1 + reg.intercept;
    const regLineX2 = maxX;
    const regLineY2 = reg.slope * regLineX2 + reg.intercept;
    const ox1 = scaleX(regLineX1);
    const oy1 = scaleY(regLineY1);
    const ox2 = scaleX(regLineX2);
    const oy2 = scaleY(regLineY2);

    // Position OLS badge safely along the regression line near 55% span
    // Clamped inside the safe central zone to completely avoid corner quadrant watermarks
    const badgeW = 150;
    const badgeH = 20;
    const lineX = ox1 + (ox2 - ox1) * 0.55;
    const lineY = oy1 + (oy2 - oy1) * 0.55;
    const badgeX = Math.max(padLeft + 165, Math.min(padLeft + plotW - 165 - badgeW, lineX - badgeW / 2));
    const badgeY = Math.max(padTop + 38, Math.min(padTop + plotH - 38 - badgeH, lineY - badgeH - 6));

    olsLineSvg = `
      <line x1="${ox1}" y1="${oy1}" x2="${ox2}" y2="${oy2}"
            stroke="#a855f7" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="5,4"
            filter="url(#scatter-neon-glow)" opacity="0.9" />
      <g transform="translate(${badgeX}, ${badgeY})">
        <rect x="0" y="0" width="${badgeW}" height="${badgeH}" rx="5" fill="#a855f7" fill-opacity="0.15" stroke="#a855f7" stroke-width="1" />
        <text x="${badgeW / 2}" y="13.5" text-anchor="middle" class="fill-purple-500 font-mono text-[9.5px] font-bold select-none">
          Trend OLS (R² = ${reg.r2.toFixed(2)})
        </text>
      </g>
    `;
  }

  // Gridlines & Ticks (clean, subtle)
  const xTicks = 5;
  const yTicks = 5;
  let gridSvg = '';

  for (let i = 0; i <= xTicks; i++) {
    const val = minX + (i / xTicks) * (maxX - minX);
    const x = scaleX(val);
    const formattedVal = val >= 100 ? Math.round(val) : (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1));
    gridSvg += `
      <line x1="${x}" y1="${padTop}" x2="${x}" y2="${padTop + plotH}" stroke="var(--table-border)" stroke-opacity="0.22" stroke-dasharray="3,3" />
      <text x="${x}" y="${padTop + plotH + 16}" text-anchor="middle" style="fill: var(--text-muted); font-weight: 600;" class="text-[10px] font-mono select-none">${formattedVal}</text>
    `;
  }

  for (let j = 0; j <= yTicks; j++) {
    const val = minY + (j / yTicks) * (maxY - minY);
    const y = scaleY(val);
    const formattedVal = val >= 100 ? Math.round(val) : (val % 1 === 0 ? val.toFixed(0) : val.toFixed(view === 'golo' ? 2 : 1));
    gridSvg += `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="var(--table-border)" stroke-opacity="0.22" stroke-dasharray="3,3" />
      <text x="${padLeft - 8}" y="${y + 3.5}" text-anchor="end" style="fill: var(--text-muted); font-weight: 600;" class="text-[10px] font-mono select-none">${formattedVal}</text>
    `;
  }

  // Tactical Corner Badges (Non-colliding, elegant)
  let watermarksSvg = '';
  if (isBisectorSupported) {
    // Only 2 badges for Bisector view (Top-Left and Bottom-Right)
    watermarksSvg = `
      <!-- Top-Left (Overperformer) -->
      <g transform="translate(${padLeft + 10}, ${padTop + 12})">
        <rect x="0" y="0" width="168" height="20" rx="5" fill="#10b981" fill-opacity="0.12" stroke="#10b981" stroke-opacity="0.3" stroke-width="1" />
        <text x="84" y="13.5" text-anchor="middle" class="fill-emerald-500 font-bold text-[9.5px] tracking-wide select-none">${quadrantLabels.tl}</text>
      </g>
      <!-- Bottom-Right (Underperformer) -->
      <g transform="translate(${padLeft + plotW - 10}, ${padTop + plotH - 26})">
        <rect x="-168" y="0" width="168" height="20" rx="5" fill="#f43f5e" fill-opacity="0.12" stroke="#f43f5e" stroke-opacity="0.3" stroke-width="1" />
        <text x="-84" y="13.5" text-anchor="middle" class="fill-rose-500 font-bold text-[9.5px] tracking-wide select-none">${quadrantLabels.br}</text>
      </g>
    `;
  } else {
    // 4 Badges for standard 4-quadrant views
    watermarksSvg = `
      <!-- Top-Right -->
      <g transform="translate(${padLeft + plotW - 10}, ${padTop + 12})">
        <rect x="-155" y="0" width="155" height="20" rx="5" fill="#10b981" fill-opacity="0.12" stroke="#10b981" stroke-opacity="0.3" stroke-width="1" />
        <text x="-77.5" y="13.5" text-anchor="middle" class="fill-emerald-500 font-bold text-[9.5px] tracking-wide select-none">${quadrantLabels.tr}</text>
      </g>
      <!-- Top-Left -->
      <g transform="translate(${padLeft + 10}, ${padTop + 12})">
        <rect x="0" y="0" width="155" height="20" rx="5" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4" stroke-opacity="0.3" stroke-width="1" />
        <text x="77.5" y="13.5" text-anchor="middle" class="fill-cyan-500 font-bold text-[9.5px] tracking-wide select-none">${quadrantLabels.tl}</text>
      </g>
      <!-- Bottom-Right -->
      <g transform="translate(${padLeft + plotW - 10}, ${padTop + plotH - 26})">
        <rect x="-155" y="0" width="155" height="20" rx="5" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b" stroke-opacity="0.3" stroke-width="1" />
        <text x="-77.5" y="13.5" text-anchor="middle" class="fill-amber-500 font-bold text-[9.5px] tracking-wide select-none">${quadrantLabels.br}</text>
      </g>
      <!-- Bottom-Left -->
      <g transform="translate(${padLeft + 10}, ${padTop + plotH - 26})">
        <rect x="0" y="0" width="155" height="20" rx="5" fill="#f43f5e" fill-opacity="0.12" stroke="#f43f5e" stroke-opacity="0.3" stroke-width="1" />
        <text x="77.5" y="13.5" text-anchor="middle" class="fill-rose-500 font-bold text-[9.5px] tracking-wide select-none">${quadrantLabels.bl}</text>
      </g>
    `;
  }

  // Micro-repulsion offset for overlapping clusters using pure helper from EloScatterData
  const initialPoints: LayoutPoint[] = points.map(pt => ({
    ...pt,
    rawX: scaleX(pt.x),
    rawY: scaleY(pt.y),
    cx: scaleX(pt.x),
    cy: scaleY(pt.y),
    cleanId: pt.managerId.replace(/[^a-zA-Z0-9_-]/g, '_')
  }));

  const bounds: PlotBounds = {
    minX: padLeft + innerPad,
    maxX: padLeft + plotW - innerPad,
    minY: padTop + innerPad,
    maxY: padTop + plotH - innerPad
  };

  const layoutPoints = applyClusterRepulsion(initialPoints, 26, bounds);

  // Defs: Gradients, Filters & ClipPaths for Circular Crests
  const defsClips = layoutPoints.map(pt => `
    <clipPath id="scatter-clip-${pt.cleanId}">
      <circle cx="${pt.cx}" cy="${pt.cy}" r="${pt.radius - 1.5}" />
    </clipPath>
  `).join('');

  // Render Bubbles with Team Crests & Clean Separator Rings
  const bubblesSvg = layoutPoints.map(pt => {
    const escTeam = pt.teamName.replace(/'/g, "\\'");
    const escCoach = pt.coach.replace(/'/g, "\\'");
    const escQuad = pt.quadrant.replace(/'/g, "\\'");
    const escMeta = pt.extraMeta.replace(/'/g, "\\'");
    const escLogo = pt.logo.replace(/'/g, "\\'");

    return `
      <g class="scatter-bubble"
         id="scatter-node-${pt.cleanId}"
         data-manager-id="${pt.managerId}"
         style="transform-origin: ${pt.cx}px ${pt.cy}px;"
         onclick="window.selectEloScatterBubble && window.selectEloScatterBubble('${pt.managerId}', '${escTeam}', '${escCoach}', '${pt.metricLabelX}', '${pt.metricLabelY}', '${escMeta}', '${escQuad}', '${pt.color}', '${escLogo}')"
         onmouseenter="window.showEloScatterHover && window.showEloScatterHover('${pt.managerId}', '${escTeam}', '${escCoach}', '${pt.metricLabelX}', '${pt.metricLabelY}', '${escMeta}', '${escQuad}', '${pt.color}', '${escLogo}')">
        <!-- Interactive Aura Halo (Visible only on hover/focus) -->
        <circle cx="${pt.cx}" cy="${pt.cy}" r="${pt.radius + 6}" fill="${pt.color}" class="scatter-aura pointer-events-none" />
        <!-- Crisp Backdrop Circle -->
        <circle cx="${pt.cx}" cy="${pt.cy}" r="${pt.radius}" fill="#0f172a" stroke="#ffffff" stroke-width="1.2" class="drop-shadow-sm" />
        <!-- Team Crest Avatar -->
        <image href="${pt.logo}" x="${pt.cx - (pt.radius - 1.5)}" y="${pt.cy - (pt.radius - 1.5)}"
               width="${(pt.radius - 1.5) * 2}" height="${(pt.radius - 1.5) * 2}"
               clip-path="url(#scatter-clip-${pt.cleanId})" preserveAspectRatio="xMidYMid slice" />
        <!-- Outer Theme Rim -->
        <circle cx="${pt.cx}" cy="${pt.cy}" r="${pt.radius}" fill="none" stroke="${pt.color}" stroke-width="2.2" class="pointer-events-none" />
        <!-- Expanded Hit Target -->
        <circle cx="${pt.cx}" cy="${pt.cy}" r="${pt.radius + 6}" fill="transparent" class="cursor-pointer" />
      </g>
    `;
  }).join('');

  // Interactive Bottom Team Chips Grid
  const chipsHtml = layoutPoints.map(pt => {
    const escTeam = pt.teamName.replace(/'/g, "\\'");
    const escCoach = pt.coach.replace(/'/g, "\\'");
    const escQuad = pt.quadrant.replace(/'/g, "\\'");
    const escMeta = pt.extraMeta.replace(/'/g, "\\'");
    const escLogo = pt.logo.replace(/'/g, "\\'");
    const metricSummary = view === 'golo'
      ? pt.y.toFixed(2) + 'x'
      : view === 'fp'
        ? pt.x.toFixed(1) + ' FP'
        : (pt.y - pt.x > 0 ? '+' : '') + (pt.y - pt.x).toFixed(1) + ' Δ';

    return `
      <button type="button"
              id="scatter-chip-${pt.cleanId}"
              class="scatter-chip flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer"
              style="background-color: var(--input-bg); border-color: var(--table-border);"
              onmouseenter="window.focusEloScatterManager && window.focusEloScatterManager('${pt.managerId}')"
              onmouseleave="window.unfocusEloScatterManager && window.unfocusEloScatterManager()"
              onclick="window.selectEloScatterBubble && window.selectEloScatterBubble('${pt.managerId}', '${escTeam}', '${escCoach}', '${pt.metricLabelX}', '${pt.metricLabelY}', '${escMeta}', '${escQuad}', '${pt.color}', '${escLogo}')">
        <img src="${pt.logo}" alt="${pt.teamName}" class="w-4 h-4 rounded-full object-cover shrink-0" onerror="this.onerror=null; this.src='favicon-64x64.png'" />
        <span class="truncate max-w-[85px] sm:max-w-[110px]" style="color: var(--text-main);">${pt.teamName}</span>
        <span class="font-mono text-[10px] font-bold" style="color: ${pt.color};">${metricSummary}</span>
      </button>
    `;
  }).join('');

  return `
    <div id="elo-scatter-chart-wrapper"
         class="rounded-2xl border p-3.5 sm:p-5 flex flex-col gap-3"
         style="background-color: var(--table-surface); border-color: var(--table-border);">
      
      <style>
        .scatter-bubble {
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
          cursor: pointer;
        }
        .scatter-bubble:hover, .scatter-bubble.is-focused {
          transform: scale(1.22);
          opacity: 1 !important;
        }
        .scatter-bubble.is-dimmed {
          opacity: 0.22 !important;
          filter: grayscale(40%);
        }
        .scatter-bubble .scatter-aura {
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .scatter-bubble:hover .scatter-aura, .scatter-bubble.is-focused .scatter-aura {
          opacity: 0.35;
        }
        .scatter-chip {
          transition: all 0.18s ease;
        }
        .scatter-chip:hover, .scatter-chip.is-active {
          border-color: #f59e0b !important;
          background: rgba(245, 158, 11, 0.15) !important;
          transform: translateY(-1.5px);
        }
      </style>

      <!-- Chart Top Bar: Metric Title & Sub-toggles -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b"
           style="border-color: var(--table-border);">
        <div>
          <h4 class="font-bold text-xs sm:text-sm flex items-center gap-2" style="color: var(--text-main);">
            <i class="fa-solid fa-chart-line text-amber-500"></i>
            <span>${view === 'golo' ? 'Studio Efficienza: Elo vs Golo Score' : view === 'fp' ? 'Potenza Roster: Media FantaPunti vs Elo' : 'Studio Sfiga & Calendario (SOS)'}</span>
          </h4>
          <p class="text-[11px] opacity-70 mt-0.5" style="color: var(--text-muted);">
            ${view === 'golo'
      ? 'Analisi della sovraperformance tattica (Golo > 1.00 indica trasformazione cinica dei punti in gol reali).'
      : view === 'fp'
        ? 'Relazione tra produzione grezza di punteggio (FP) e conversione in rating Elo.'
        : 'Disparità di calendario (xPts All-Play) e confronto diretto con il Rating Atlas Power.'}
          </p>
        </div>

        ${view === 'luck' ? `
          <!-- Submode Toggle for Luck view -->
          <div class="flex items-center p-0.5 rounded-xl border shrink-0 text-xs"
               style="background-color: var(--input-bg); border-color: var(--table-border);">
            <button type="button"
                    onclick="window.switchEloLuckSubMode && window.switchEloLuckSubMode('allPlay')"
                    class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${luckSubMode === 'allPlay' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'opacity-70 hover:opacity-100 text-slate-300'}">
              <span>Punti vs xPts</span>
            </button>
            <button type="button"
                    onclick="window.switchEloLuckSubMode && window.switchEloLuckSubMode('h2hVsAtlas')"
                    class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${luckSubMode === 'h2hVsAtlas' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'opacity-70 hover:opacity-100 text-slate-300'}">
              <span>H2H vs Atlas</span>
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Rich Tactical Header Card (Dynamic on Hover/Click) -->
      <div id="elo-scatter-hover-box"
           class="min-h-[58px] p-2.5 sm:p-3 rounded-xl border flex items-center justify-between text-xs transition-all shadow-xs"
           style="background-color: var(--input-bg); border-color: var(--table-border);">
        <div class="flex items-center justify-between w-full text-xs">
          <div class="flex items-center gap-2.5 opacity-85">
            <div class="w-8 h-8 rounded-full flex items-center justify-center border border-amber-500/30 bg-amber-500/10 text-amber-500 shrink-0">
              <i class="fa-solid fa-hand-pointer text-xs"></i>
            </div>
            <div>
              <div class="font-bold text-xs" style="color: var(--text-main);">Esplora i Manager sul Grafico</div>
              <div class="text-[11px] opacity-75" style="color: var(--text-muted);">Passa o tocca una bolla o seleziona una squadra in basso per isolare le metriche</div>
            </div>
          </div>
          <div class="hidden sm:flex items-center gap-2 text-[10px] font-mono opacity-70" style="color: var(--text-muted);">
            <span class="px-2 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--table-surface);">Bolla = Squadra</span>
            <span class="px-2 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--table-surface);">Raggio = ${view === 'fp' && !isSeasonInProgress(selectedSeason) ? 'Punti Classifica' : 'Media FP'}</span>
          </div>
        </div>
      </div>

      <!-- Responsive SVG Plot Box (Seamless Surface, No Gray Mud) -->
      <div class="relative w-full overflow-hidden rounded-2xl border"
           style="background-color: var(--table-surface); border-color: var(--table-border);">
        <svg viewBox="0 0 ${width} ${height}" class="w-full h-auto block select-none">
          <defs>
            <filter id="scatter-neon-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <!-- Corner-confined ambient gradients (clean center) -->
            <radialGradient id="grad-quad-tr" cx="100%" cy="0%" r="70%">
              <stop offset="0%" stop-color="#10b981" stop-opacity="0.06" />
              <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="grad-quad-tl" cx="0%" cy="0%" r="70%">
              <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.06" />
              <stop offset="100%" stop-color="#06b6d4" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="grad-quad-br" cx="100%" cy="100%" r="70%">
              <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.06" />
              <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="grad-quad-bl" cx="0%" cy="100%" r="70%">
              <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.06" />
              <stop offset="100%" stop-color="#f43f5e" stop-opacity="0" />
            </radialGradient>
            ${defsClips}
          </defs>

          <!-- Quadrant Ambient Shading Rectangles (Subtle corner glow) -->
          ${quadrantFillsSvg}

          <!-- Plot Bounds border -->
          <rect x="${padLeft}" y="${padTop}" width="${plotW}" height="${plotH}"
                fill="none" stroke="var(--table-border)" stroke-opacity="0.35" stroke-width="1.2" rx="4" />
          
          <!-- Grid & Ticks -->
          ${gridSvg}

          <!-- Crosshairs -->
          ${crosshairsSvg}

          <!-- Reference Lines (Parity, Bisector, OLS Trend) -->
          ${parityLineSvg}
          ${bisectorLineSvg}
          ${olsLineSvg}

          <!-- Quadrant Watermarks -->
          ${watermarksSvg}

          <!-- Bubbles with Crest Avatars -->
          ${bubblesSvg}

          <!-- Axis Labels (Theme-compatible high contrast) -->
          <text x="${padLeft + plotW / 2}" y="${height - 14}" text-anchor="middle"
                style="fill: var(--text-main); font-weight: 800;"
                class="text-xs uppercase tracking-wider select-none">${labelX}</text>
          
          <text x="${padLeft - 38}" y="${padTop + plotH / 2}" text-anchor="middle"
                transform="rotate(-90, ${padLeft - 38}, ${padTop + plotH / 2})"
                style="fill: var(--text-main); font-weight: 800;"
                class="text-xs uppercase tracking-wider select-none">${labelY}</text>
        </svg>
      </div>

      <!-- Interactive Team Selection Chips Grid -->
      <div class="flex flex-col gap-1.5 pt-2.5 border-t" style="border-color: var(--table-border);">
        <div class="flex items-center justify-between text-[11px] font-bold" style="color: var(--text-muted);">
          <span class="flex items-center gap-1.5">
            <i class="fa-solid fa-users text-amber-500"></i>
            <span>Squadre nel Grafico (Tocca per isolare):</span>
          </span>
          <button type="button"
                  onclick="window.unfocusEloScatterManager && window.unfocusEloScatterManager(true)"
                  class="text-[10px] px-2 py-0.5 rounded border hover:border-amber-500/50 hover:text-amber-500 transition cursor-pointer"
                  style="border-color: var(--table-border); background: var(--input-bg); color: var(--text-muted);">
            Reimposta Tutto
          </button>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          ${chipsHtml}
        </div>
      </div>

      <!-- Chart Legend / Footer Notes -->
      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 text-[10px] opacity-80 font-mono border-t"
           style="border-color: var(--table-border); color: var(--text-muted);">
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Dimensione: ${view === 'fp' && !isSeasonInProgress(selectedSeason) ? 'Punti in Classifica' : 'Media FantaPunti (FP)'}
          </span>
          ${!isBisectorSupported ? `
            <span class="flex items-center gap-1.5 text-purple-500">
              <span class="w-3 h-0.5 bg-purple-500 border border-purple-500"></span>
              Regressione OLS Lineare
            </span>
          ` : `
            <span class="flex items-center gap-1.5 text-cyan-500">
              <span class="w-3 h-0.5 bg-cyan-500 border border-cyan-500"></span>
              Bisettrice Y = X (Equilibrio)
            </span>
          `}
        </div>
        <div>
          <span>Stagione: <strong>${selectedSeason === 'all' ? 'Totale Era Elo' : selectedSeason}</strong></span>
        </div>
      </div>

    </div>
  `;
}

/**
 * Global hover & focus handlers
 */
if (typeof window !== 'undefined') {
  let lockedScatterManagerId: string | null = null;

  window.focusEloScatterManager = (mId: string) => {
    const container = document.getElementById('elo-scatter-chart-wrapper');
    if (!container) return;
    const bubbles = container.querySelectorAll('.scatter-bubble');
    const chips = container.querySelectorAll('.scatter-chip');

    bubbles.forEach((b: Element) => {
      if (b.getAttribute('data-manager-id') === mId) {
        b.classList.add('is-focused');
        b.classList.remove('is-dimmed');
        b.parentNode?.appendChild(b);
      } else {
        b.classList.remove('is-focused');
        b.classList.add('is-dimmed');
      }
    });

    chips.forEach((c: Element) => {
      const cleanTarget = `scatter-chip-${mId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      if (c.id === cleanTarget) {
        c.classList.add('is-active');
      } else {
        c.classList.remove('is-active');
      }
    });
  };

  window.unfocusEloScatterManager = (forceReset: boolean = false) => {
    if (forceReset) {
      lockedScatterManagerId = null;
    }
    if (lockedScatterManagerId && !forceReset) {
      window.focusEloScatterManager?.(lockedScatterManagerId);
      return;
    }
    const container = document.getElementById('elo-scatter-chart-wrapper');
    if (!container) return;
    container.querySelectorAll('.scatter-bubble').forEach((b: Element) => {
      b.classList.remove('is-focused', 'is-dimmed');
    });
    container.querySelectorAll('.scatter-chip').forEach((c: Element) => {
      c.classList.remove('is-active');
    });
  };

  window.showEloScatterHover = (
    mId: string,
    team: string,
    coach: string,
    valX: string,
    valY: string,
    extra: string,
    quadrant: string,
    color: string,
    logo: string
  ) => {
    window.focusEloScatterManager?.(mId);

    const box = document.getElementById('elo-scatter-hover-box');
    if (!box) return;

    box.innerHTML = `
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 w-full text-xs">
        <div class="flex items-center gap-2.5 min-w-0">
          <img src="${logo}" alt="${team}" class="w-8 h-8 rounded-full border-2 object-cover shrink-0 shadow-xs" style="border-color: ${color};" onerror="this.onerror=null; this.src='favicon-64x64.png'" />
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-black text-sm truncate" style="color: var(--text-main);">${team}</span>
              <span class="text-[10px] opacity-60 truncate" style="color: var(--text-muted);">(${coach})</span>
            </div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 truncate">
                ${quadrant}
              </span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 sm:gap-3 font-mono text-xs shrink-0 flex-wrap">
          <span class="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold">${valX}</span>
          <span class="px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 font-bold">${valY}</span>
          <span class="text-[11px] opacity-80 font-sans" style="color: var(--text-main);">${extra}</span>
        </div>
      </div>
    `;
  };

  window.clearEloScatterHover = () => {
    if (lockedScatterManagerId) return;
    window.unfocusEloScatterManager?.();

    const box = document.getElementById('elo-scatter-hover-box');
    if (!box) return;
    box.innerHTML = `
      <div class="flex items-center justify-between w-full text-xs">
        <div class="flex items-center gap-2.5 opacity-85">
          <div class="w-8 h-8 rounded-full flex items-center justify-center border border-amber-500/30 bg-amber-500/10 text-amber-500 shrink-0">
            <i class="fa-solid fa-hand-pointer text-xs"></i>
          </div>
          <div>
            <div class="font-bold text-xs" style="color: var(--text-main);">Esplora i Manager sul Grafico</div>
            <div class="text-[11px] opacity-75" style="color: var(--text-muted);">Passa o tocca una bolla o seleziona una squadra in basso per isolare le metriche</div>
          </div>
        </div>
        <div class="hidden sm:flex items-center gap-2 text-[10px] font-mono opacity-70" style="color: var(--text-muted);">
          <span class="px-2 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--table-surface);">Bolla = Squadra</span>
        </div>
      </div>
    `;
  };

  window.selectEloScatterBubble = (
    mId: string,
    team: string,
    coach: string,
    valX: string,
    valY: string,
    extra: string,
    quadrant: string,
    color: string,
    logo: string
  ) => {
    lockedScatterManagerId = (lockedScatterManagerId === mId) ? null : mId;
    if (lockedScatterManagerId) {
      window.showEloScatterHover?.(mId, team, coach, valX, valY, extra, quadrant, color, logo);
    } else {
      window.clearEloScatterHover?.();
    }
  };
}
