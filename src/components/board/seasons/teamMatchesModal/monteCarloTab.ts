/**
 * src/components/board/seasons/teamMatchesModal/monteCarloTab.ts
 * Dedicated Monte Carlo Analytics Tab:
 * - Summary metric banner: projected median points, P10-P90 range, volatility sigma
 * - Interactive SVG density bell curve with clean 1-sigma and 2-sigma confidence envelopes
 * - 4 objective cards: Scudetto, Podio, Metà Classifica, Playout/Flop
 * - Theme-adaptive high-contrast statistical box-plot drilldown (WCAG AAA across Gazzetta, Studio, Gala, Serie A)
 */

import type { LiveTeamMetrics, TeamSoSMetrics } from '@/types';

export function renderMonteCarloTabHTML(
  luck: LiveTeamMetrics['scheduleLuck'] | undefined,
  totalLeagueRounds: number,
  lastCompletedRound: number,
  _teamSoS?: TeamSoSMetrics,
  mcMinRounds: number = 5
): string {
  const mc = luck?.monteCarlo;
  if (!mc || typeof mc.medianPoints !== 'number' || mc.pPodiumPct === null) {
    return `
      <div class="p-8 text-center rounded-2xl border space-y-2"
           style="border-color: var(--table-border); background-color: var(--table-surface);">
        <i class="fa-solid fa-hourglass-half text-2xl text-amber-500 mb-2"></i>
        <h4 class="font-bold text-sm" style="color: var(--text-main);">Proiezioni non ancora disponibili</h4>
        <p class="text-xs max-w-sm mx-auto" style="color: var(--text-muted);">
          Le simulazioni Monte Carlo richiedono almeno ${mcMinRounds} giornate disputate per calibrare i parametri stocastici del calendario.
        </p>
      </div>
    `;
  }

  const isTitleGated = lastCompletedRound >= Math.ceil(totalLeagueRounds / 2);
  const totalTeams = _teamSoS?.totalTeams && _teamSoS.totalTeams > 0 ? _teamSoS.totalTeams : 12;
  const midCutoff = Math.max(4, Math.floor((totalTeams + 1) / 2));
  const midLabel = midCutoff > 4 ? `4&deg;&ndash;${midCutoff}&deg; Posto` : '4&deg; Posto';
  const median = mc.medianPoints;
  const mean = typeof mc.meanPoints === 'number' ? mc.meanPoints : median;
  const std = mc.stdDev > 0 ? mc.stdDev : 3.5;
  // If mean and median differ by at least 0.2 pt, display both; otherwise display mean (center of Gaussian)
  const isDiff = Math.abs(mean - median) >= 0.2;

  const p10 = typeof mc.p10 === 'number' ? mc.p10 : Math.round((median - 1.28 * std) * 10) / 10;
  const p25 = typeof mc.p25 === 'number' ? mc.p25 : Math.round((median - 0.674 * std) * 10) / 10;
  const p75 = typeof mc.p75 === 'number' ? mc.p75 : Math.round((median + 0.674 * std) * 10) / 10;
  const p90 = typeof mc.p90 === 'number' ? mc.p90 : Math.round((median + 1.28 * std) * 10) / 10;

  // 1-sigma and 2-sigma confidence intervals centered around Gaussian mean
  const centerPt = mean;
  const sigma1Left = Math.max(0, Math.round((centerPt - std) * 10) / 10);
  const sigma1Right = Math.round((centerPt + std) * 10) / 10;
  const sigma2Left = Math.max(0, Math.round((centerPt - 2 * std) * 10) / 10);
  const sigma2Right = Math.round((centerPt + 2 * std) * 10) / 10;

  const minX = Math.max(0, Math.floor(centerPt - 3.5 * std));
  const maxX = Math.max(minX + 24, Math.ceil(centerPt + 3.5 * std));

  // Optimized horizontal spread for responsive viewBox 0 0 460 185
  const scaleX = (pt: number) => {
    const clamped = Math.max(minX, Math.min(maxX, pt));
    return 20 + ((clamped - minX) / (maxX - minX)) * 360;
  };

  const pct = (pt: number) => {
    const clamped = Math.max(minX, Math.min(maxX, pt));
    return Math.max(2, Math.min(98, Math.round(((clamped - minX) / (maxX - minX)) * 100)));
  };

  // Generate SVG histogram bars across [minX, maxX] with enlarged vertical presence
  const numBars = 23;
  const barWidth = 12;
  const barsSvg: string[] = [];
  for (let k = 0; k < numBars; k++) {
    const pt = minX + (k / (numBars - 1)) * (maxX - minX);
    const z = Math.abs((pt - centerPt) / std);
    const dens = Math.exp(-0.5 * z * z);
    const barH = Math.max(5, Math.round(dens * 172));
    const barY = 205 - barH;
    const barX = Math.round(scaleX(pt) - barWidth / 2);
    // Dynamic opacity: inside 1-sigma = 0.85, 1-to-2 sigma = 0.45, tails = 0.20
    const fillOpacity = z <= 1.0 ? '0.85' : z <= 2.0 ? '0.45' : '0.20';
    barsSvg.push(`<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barH}" rx="2.5" fill="#3b82f6" fill-opacity="${fillOpacity}" />`);
  }

  // 1-Sigma Band bounds
  const band1X1 = Math.round(scaleX(sigma1Left));
  const band1X2 = Math.round(scaleX(sigma1Right));
  const band1W = Math.max(10, band1X2 - band1X1);

  // 2-Sigma Band bounds
  const band2X1 = Math.round(scaleX(sigma2Left));
  const band2X2 = Math.round(scaleX(sigma2Right));
  const band2W = Math.max(12, band2X2 - band2X1);

  const meanX = Math.round(scaleX(mean));
  const medianX = Math.round(scaleX(median));

  // Threshold markers (scaled proportionally for any calendar length from 26-round baseline)
  const roundsRef = totalLeagueRounds > 0 ? totalLeagueRounds : 26;
  const podiumPt = Math.round((44 / 26) * roundsRef);
  const titlePt = Math.round((51 / 26) * roundsRef);
  const hasPodium = podiumPt >= minX && podiumPt <= maxX;
  const hasTitle = isTitleGated && titlePt >= minX && titlePt <= maxX;
  const podiumX = Math.round(scaleX(podiumPt));
  const titleX = Math.round(scaleX(titlePt));

  // Scaglioni percentages
  const titlePctVal = (isTitleGated && typeof mc.pTitlePct === 'number') ? mc.pTitlePct : null;
  const podiumPctVal = typeof mc.pPodiumPct === 'number'
    ? (titlePctVal !== null ? Math.max(0, mc.pPodiumPct - titlePctVal) : mc.pPodiumPct)
    : null;
  const midPctVal = typeof mc.pMidPct === 'number' ? mc.pMidPct : null;
  const flopPctVal = typeof mc.pFlopPct === 'number' ? mc.pFlopPct : null;

  return `
    <div class="space-y-3.5 sm:space-y-4">
      <!-- Section Header with clear mathematical notation -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-1.5">
        <div>
          <span class="text-xs uppercase font-extrabold tracking-wider flex items-center gap-1.5 text-blue-500">
            <i class="fa-solid fa-chart-line"></i>
            <span>Proiezioni MC a Fine Campionato</span>
          </span>
          <p class="text-[11px] mt-0.5" style="color: var(--text-muted);">
            Simulazione stocastica su 10.000 iterazioni del calendario rimanente.
          </p>
        </div>
        <span class="font-mono text-blue-600 dark:text-blue-400 font-bold text-xs self-start sm:self-auto">
          ${isDiff ? `Attesi: &mu; = ${mean.toFixed(1)} pt &bull; <span class="text-violet-600 dark:text-violet-400">Med = ${median.toFixed(1)} pt</span> (&sigma; = &plusmn;${std.toFixed(1)} pt)` : `Attesi: ${mean.toFixed(1)} pt (&sigma; = &plusmn;${std.toFixed(1)} pt)`}
        </span>
      </div>

      <!-- 1. Top KPI Summary Banner (Zero truncation, clean vertical layout) -->
      <div class="grid grid-cols-3 gap-1.5 sm:gap-2.5">
        <div class="p-2 sm:p-3 rounded-xl sm:rounded-2xl border flex flex-col justify-center text-center transition-colors shadow-2xs"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <div class="text-[9px] sm:text-[11px] uppercase font-bold tracking-tight sm:tracking-wider leading-tight" style="color: var(--text-muted);">
            ${isDiff ? '<span class="text-blue-600 dark:text-blue-400">Media</span> &amp; <span class="text-violet-600 dark:text-violet-400">Mediana</span>' : 'Media Attesa (&mu;)'}
          </div>
          <div class="text-sm sm:text-lg font-black font-mono mt-1 sm:mt-1.5 whitespace-nowrap text-blue-600 dark:text-blue-400">
            ${isDiff ? `${mean.toFixed(1)} <span class="text-[10px] sm:text-xs font-bold" style="color: var(--text-muted);">/</span> <span class="text-violet-600 dark:text-violet-400">${median.toFixed(1)}</span>` : `${mean.toFixed(1)} <span class="text-[10px] sm:text-xs font-normal" style="color: var(--text-muted);">pt</span>`}
          </div>
        </div>

        <div class="p-2 sm:p-3 rounded-xl sm:rounded-2xl border flex flex-col justify-center text-center transition-colors shadow-2xs"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <div class="text-[9px] sm:text-[11px] uppercase font-bold tracking-tight sm:tracking-wider leading-tight" style="color: var(--text-muted);">
            P10&ndash;P90
          </div>
          <div class="text-sm sm:text-lg font-black font-mono mt-1 sm:mt-1.5 whitespace-nowrap" style="color: var(--text-main);">
            ${p10.toFixed(0)}&ndash;${p90.toFixed(0)} <span class="text-[10px] sm:text-xs font-normal" style="color: var(--text-muted);">pt</span>
          </div>
        </div>

        <div class="p-2 sm:p-3 rounded-xl sm:rounded-2xl border flex flex-col justify-center text-center transition-colors shadow-2xs"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <div class="text-[9px] sm:text-[11px] uppercase font-bold tracking-tight sm:tracking-wider leading-tight" style="color: var(--text-muted);">
            Volatilit&agrave; (&sigma;)
          </div>
          <div class="text-sm sm:text-lg font-black font-mono mt-1 sm:mt-1.5 whitespace-nowrap text-purple-600 dark:text-purple-400">
            &plusmn;${std.toFixed(1)} <span class="text-[10px] sm:text-xs font-normal" style="color: var(--text-muted);">pt</span>
          </div>
        </div>
      </div>

      <!-- 2. Density Bell Curve SVG (Enlarged with tall bars & bold responsive presence) -->
      <div class="p-3 sm:p-4 rounded-2xl border space-y-2 sm:space-y-2.5 transition-colors shadow-2xs"
           style="background-color: var(--modal-bg); border-color: var(--table-border);">
        <div class="flex flex-col items-center text-center gap-1 text-xs">
          <span class="font-bold flex items-center justify-center gap-1.5" style="color: var(--text-main);">
            <i class="fa-solid fa-chart-area text-blue-500"></i>
            <span>Distribuzione di Densit&agrave; dei Punti Finali</span>
          </span>
          <span class="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-x-2 gap-y-0.5 flex-wrap">
            <span><strong>1&sigma; (68%):</strong> ${sigma1Left.toFixed(1)} &ndash; ${sigma1Right.toFixed(1)} pt</span>
            <span class="hidden sm:inline opacity-30">•</span>
            <span><strong>2&sigma; (95%):</strong> ${sigma2Left.toFixed(1)} &ndash; ${sigma2Right.toFixed(1)} pt</span>
          </span>
        </div>

        <!-- SVG Plot: auto height (no letterboxing), tall bars filling the card width -->
        <svg viewBox="0 0 400 245" preserveAspectRatio="xMidYMid meet" class="w-full h-auto overflow-visible">
          <!-- Background Grid Lines -->
          <line x1="20" y1="33" x2="380" y2="33" stroke="currentColor" stroke-opacity="0.06" stroke-dasharray="2 2" />
          <line x1="20" y1="119" x2="380" y2="119" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="2 2" />
          <line x1="20" y1="205" x2="380" y2="205" stroke="currentColor" stroke-opacity="0.18" />

          <!-- Outer 2-Sigma Confidence Envelope (95.4%) -->
          <rect x="${band2X1}" y="18" width="${band2W}" height="188" fill="#3b82f6" fill-opacity="0.07" rx="6" />

          <!-- Inner 1-Sigma Confidence Envelope (68.3%) -->
          <rect x="${band1X1}" y="28" width="${band1W}" height="178" fill="#3b82f6" fill-opacity="0.17" rx="5" />

          <!-- Histogram Bars with adaptive density opacities -->
          <g>
            ${barsSvg.join('\n            ')}
          </g>

          ${hasPodium ? `
            <line x1="${podiumX}" y1="18" x2="${podiumX}" y2="205" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="3 3" />
            <text x="${podiumX}" y="221" font-size="11" fill="#f59e0b" text-anchor="middle" font-weight="bold">${podiumPt} pt (Podio)</text>
          ` : ''}

          ${hasTitle ? `
            <line x1="${titleX}" y1="18" x2="${titleX}" y2="205" stroke="#eab308" stroke-width="1.8" stroke-dasharray="3 3" />
            <text x="${titleX}" y="221" font-size="11" fill="#eab308" text-anchor="middle" font-weight="bold">${titlePt} pt (Scudetto)</text>
          ` : ''}

          <!-- Mean Line & Marker (Gaussian center) -->
          <line x1="${meanX}" y1="22" x2="${meanX}" y2="205" stroke="#2563eb" stroke-width="2.5" />
          <circle cx="${meanX}" cy="22" r="4.5" fill="#2563eb" stroke="#ffffff" stroke-width="2" />
          <text x="${meanX}" y="239" font-size="13" fill="#2563eb" text-anchor="middle" font-weight="800">Media: ${mean.toFixed(1)} pt</text>

          ${isDiff ? `
            <!-- Median Line & Marker when differing from Mean -->
            <line x1="${medianX}" y1="30" x2="${medianX}" y2="205" stroke="#8b5cf6" stroke-width="1.8" stroke-dasharray="3 3" />
            <circle cx="${medianX}" cy="30" r="3.5" fill="#8b5cf6" stroke="#ffffff" stroke-width="1.5" />
          ` : ''}

          <!-- Axis Boundaries -->
          <text x="20" y="221" font-size="11" fill="currentColor" opacity="0.6" text-anchor="middle">${minX} pt</text>
          <text x="380" y="221" font-size="11" fill="currentColor" opacity="0.6" text-anchor="middle">${maxX} pt</text>
        </svg>
      </div>

      <!-- 3. Objective Progress Cards (Scudetto, Podio, Metà, Flop) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <!-- Scudetto (Gated until midpoint G13+) -->
        <div class="p-3 rounded-xl border text-xs transition-colors shadow-2xs"
             style="background-color: var(--modal-bg); border-color: rgba(234, 179, 8, 0.35);">
          <div class="flex justify-between items-center text-yellow-600 dark:text-yellow-400 font-bold mb-1.5">
            <span>👑 Scudetto</span>
            <span class="font-mono text-sm font-black">${titlePctVal !== null ? `${titlePctVal.toFixed(1)}%` : `G${Math.ceil(totalLeagueRounds / 2)}+`}</span>
          </div>
          <div class="w-full h-1.5 rounded-full overflow-hidden"
               style="background-color: var(--input-bg); border: 1px solid var(--table-border);">
            <div class="h-full bg-yellow-500 rounded-full transition-all duration-300" style="width: ${titlePctVal !== null ? Math.min(100, titlePctVal) : 0}%;"></div>
          </div>
          <p class="text-[10px] mt-1" style="color: var(--text-muted);">
            ${titlePctVal !== null ? 'Probabilit&agrave; 1&deg; posto' : `Sblocco da G${Math.ceil(totalLeagueRounds / 2)}`}
          </p>
        </div>

        <!-- Podio -->
        <div class="p-3 rounded-xl border text-xs transition-colors shadow-2xs"
             style="background-color: var(--modal-bg); border-color: rgba(245, 158, 11, 0.35);">
          <div class="flex justify-between items-center text-amber-600 dark:text-amber-400 font-bold mb-1.5">
            <span>🏆 Podio (Top 3)</span>
            <span class="font-mono text-sm font-black">${podiumPctVal !== null ? `${podiumPctVal.toFixed(1)}%` : '-'}</span>
          </div>
          <div class="w-full h-1.5 rounded-full overflow-hidden"
               style="background-color: var(--input-bg); border: 1px solid var(--table-border);">
            <div class="h-full bg-amber-500 rounded-full transition-all duration-300" style="width: ${podiumPctVal !== null ? Math.min(100, podiumPctVal) : 0}%;"></div>
          </div>
          <p class="text-[10px] mt-1" style="color: var(--text-muted);">Prime 3 posizioni</p>
        </div>

        <!-- Metà classifica -->
        <div class="p-3 rounded-xl border text-xs transition-colors shadow-2xs"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <div class="flex justify-between items-center font-bold mb-1.5" style="color: var(--text-main);">
            <span>⚖️ ${midLabel}</span>
            <span class="font-mono text-sm font-black">${midPctVal !== null ? `${midPctVal.toFixed(1)}%` : '-'}</span>
          </div>
          <div class="w-full h-1.5 rounded-full overflow-hidden"
               style="background-color: var(--input-bg); border: 1px solid var(--table-border);">
            <div class="h-full bg-slate-400 dark:bg-slate-500 rounded-full transition-all duration-300" style="width: ${midPctVal !== null ? Math.min(100, midPctVal) : 0}%;"></div>
          </div>
          <p class="text-[10px] mt-1" style="color: var(--text-muted);">Playoff / centro classifica</p>
        </div>

        <!-- Flop -->
        <div class="p-3 rounded-xl border text-xs transition-colors shadow-2xs"
             style="background-color: var(--modal-bg); border-color: rgba(244, 63, 94, 0.3);">
          <div class="flex justify-between items-center text-rose-600 dark:text-rose-400 font-bold mb-1.5">
            <span>⛈️ Flop / Playout</span>
            <span class="font-mono text-sm font-black">${flopPctVal !== null ? `${flopPctVal.toFixed(1)}%` : '-'}</span>
          </div>
          <div class="w-full h-1.5 rounded-full overflow-hidden"
               style="background-color: var(--input-bg); border: 1px solid var(--table-border);">
            <div class="h-full bg-rose-500 rounded-full transition-all duration-300" style="width: ${flopPctVal !== null ? Math.min(100, flopPctVal) : 0}%;"></div>
          </div>
          <p class="text-[10px] mt-1" style="color: var(--text-muted);">Fascia bassa</p>
        </div>
      </div>

      <!-- 4. Collapsible Statistical Drilldown (High-Contrast Theme-Adaptive Box-Plot & Scenario Cards) -->
      <div class="pt-1">
        <button type="button"
                onclick="window.toggleTeamMatchesDetails && window.toggleTeamMatchesDetails()"
                class="w-full py-2.5 px-3.5 rounded-xl border transition flex items-center justify-between text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer select-none shadow-xs"
                style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--text-main);">
          <span class="flex items-center gap-2">
            <i class="fa-solid fa-sliders text-amber-500"></i>
            <span>Approfondimento Statistico &amp; Box-Plot dei Percentili</span>
          </span>
          <span id="chevron-details-btn" class="flex items-center gap-1 text-[11px] text-amber-500 font-bold">
            <span>Mostra Dettaglio</span>
            <i class="fa-solid fa-chevron-down transition-transform duration-200"></i>
          </span>
        </button>

        <!-- Box-Plot Details Panel (Hidden by default) -->
        <div id="box-plot-details" class="hidden mt-3 p-4 rounded-2xl border space-y-4 transition-colors"
             style="background-color: var(--table-surface); border-color: var(--table-border);">
          
          <!-- Box-Plot Graphical Bar -->
          <div class="space-y-2">
            <div class="flex flex-col gap-0.5">
              <span class="text-xs font-bold" style="color: var(--text-main);">Intervallo Interquartile (P25 &ndash; P75)</span>
              <span class="text-[11px]" style="color: var(--text-muted);">
                Il 50% delle stagioni simulate chiude tra
                <strong class="font-mono text-blue-600 dark:text-blue-400">${p25.toFixed(0)}</strong> e
                <strong class="font-mono text-blue-600 dark:text-blue-400">${p75.toFixed(0)} pt</strong>
              </span>
            </div>

            <div class="relative pt-7 pb-1">
              <div class="w-full h-2.5 rounded-full relative"
                   style="background-color: var(--input-bg); border: 1px solid var(--table-border);">
                <!-- Whisker (P10 to P90) with end caps -->
                <div class="absolute top-1/2 -translate-y-1/2 h-0.5 rounded"
                     style="left: ${pct(p10)}%; width: ${Math.max(2, pct(p90) - pct(p10))}%; background-color: var(--text-muted); opacity: 0.55;"></div>
                <div class="absolute -top-1 -bottom-1 w-0.5 rounded" style="left: ${pct(p10)}%; background-color: var(--text-muted); opacity: 0.55;"></div>
                <div class="absolute -top-1 -bottom-1 w-0.5 rounded" style="left: ${pct(p90)}%; background-color: var(--text-muted); opacity: 0.55;"></div>
                <!-- Interquartile Box (P25 to P75) -->
                <div class="absolute -top-1.5 -bottom-1.5 rounded-md"
                     style="left: ${pct(p25)}%; width: ${Math.max(2, pct(p75) - pct(p25))}%; background-color: rgba(59, 130, 246, 0.18); border: 2px solid #2563eb;"></div>
                ${isDiff ? `
                  <!-- Median tick (violet) -->
                  <div class="absolute -top-1.5 -bottom-1.5 w-0.5 bg-violet-500 z-10" style="left: ${pct(median)}%;"></div>
                ` : ''}
                <!-- Mean marker (blue dot) -->
                <div class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-md z-20"
                     style="left: ${pct(mean)}%;"></div>
                ${hasPodium ? `
                  <div class="absolute -top-2 -bottom-2 border-l-2 border-dashed border-amber-500 z-10" style="left: ${pct(podiumPt)}%;">
                    <span class="absolute bottom-full mb-0.5 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-amber-500">🏆 ${podiumPt}</span>
                  </div>
                ` : ''}
                ${hasTitle ? `
                  <div class="absolute -top-2 -bottom-2 border-l-2 border-dashed border-yellow-500 z-10" style="left: ${pct(titlePt)}%;">
                    <span class="absolute bottom-full mb-0.5 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-yellow-500">👑 ${titlePt}</span>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Percentile legend: compact, never wraps -->
            <div class="grid grid-cols-3 gap-1.5 text-center pt-1">
              <div class="rounded-lg py-1.5" style="background-color: var(--input-bg);">
                <div class="text-[9px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">P10</div>
                <div class="text-xs font-black font-mono whitespace-nowrap" style="color: var(--text-main);">${p10.toFixed(0)} pt</div>
              </div>
              <div class="rounded-lg py-1.5" style="background-color: rgba(59, 130, 246, 0.08);">
                <div class="text-[9px] uppercase font-bold tracking-wider whitespace-nowrap">
                  <span class="text-blue-600 dark:text-blue-400">Media</span>${isDiff ? ' <span style="color: var(--text-muted);">/</span> <span class="text-violet-600 dark:text-violet-400">Med</span>' : ''}
                </div>
                <div class="text-xs font-black font-mono whitespace-nowrap">
                  <span class="text-blue-600 dark:text-blue-400">${mean.toFixed(1)}</span>${isDiff ? ` <span style="color: var(--text-muted);">/</span> <span class="text-violet-600 dark:text-violet-400">${median.toFixed(1)}</span>` : ' <span class="font-normal" style="color: var(--text-muted);">pt</span>'}
                </div>
              </div>
              <div class="rounded-lg py-1.5" style="background-color: var(--input-bg);">
                <div class="text-[9px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">P90</div>
                <div class="text-xs font-black font-mono whitespace-nowrap" style="color: var(--text-main);">${p90.toFixed(0)} pt</div>
              </div>
            </div>
            <div class="flex justify-between text-[10px] font-mono opacity-70" style="color: var(--text-muted);">
              <span>Min ${minX} pt</span>
              <span>Max ${maxX} pt</span>
            </div>
          </div>

          <!-- 3 High-Contrast Theme-Adaptive Scenario Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <!-- Scenario Minimo (P10) -->
            <div class="p-3.5 rounded-xl border transition-colors shadow-2xs"
                 style="background-color: var(--input-bg); border-color: var(--table-border);">
              <div class="flex items-center justify-between">
                <span class="font-bold" style="color: var(--text-main);">Scenario Minimo (P10)</span>
                <span class="font-black font-mono text-sm" style="color: var(--text-main);">${p10.toFixed(1)} pt</span>
              </div>
              <p class="text-xs mt-2 leading-relaxed" style="color: var(--text-muted);">
                <strong class="font-bold" style="color: var(--text-main);">Pessimo realistico:</strong> solo nel 10% dei casi la squadra ottiene meno di <strong class="font-bold" style="color: var(--text-main);">${p10.toFixed(1)} pt</strong>.
              </p>
            </div>

            <!-- Atteso Centrale -->
            <div class="p-3.5 rounded-xl border transition-colors shadow-2xs"
                 style="background-color: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.35);">
              <div class="flex items-center justify-between">
                <span class="font-bold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <i class="fa-solid fa-bullseye text-[11px]"></i>
                  <span>Atteso Centrale (${isDiff ? 'Media &mu;' : 'Media &mu; / P50'})</span>
                </span>
                <span class="font-black font-mono text-blue-600 dark:text-blue-400 text-sm">${mean.toFixed(1)} pt</span>
              </div>
              <p class="text-xs mt-2 leading-relaxed" style="color: var(--text-main);">
                <strong class="font-bold text-blue-600 dark:text-blue-400">Baricentro gaussiano:</strong> ${isDiff ? `media di <strong>${mean.toFixed(1)} pt</strong> (mediana a <strong>${median.toFixed(1)} pt</strong>)` : `media e mediana allineate a <strong>${mean.toFixed(1)} pt</strong>`} su 10.000 simulazioni.
              </p>
            </div>

            <!-- Scenario Ottimale (P90) -->
            <div class="p-3.5 rounded-xl border transition-colors shadow-2xs"
                 style="background-color: var(--input-bg); border-color: var(--table-border);">
              <div class="flex items-center justify-between">
                <span class="font-bold" style="color: var(--text-main);">Scenario Ottimale (P90)</span>
                <span class="font-black font-mono text-sm" style="color: var(--text-main);">${p90.toFixed(1)} pt</span>
              </div>
              <p class="text-xs mt-2 leading-relaxed" style="color: var(--text-muted);">
                <strong class="font-bold" style="color: var(--text-main);">Ottimo realistico:</strong> solo nel 10% delle simulazioni la squadra supera <strong class="font-bold" style="color: var(--text-main);">${p90.toFixed(1)} pt</strong>.
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  `;
}

export const renderMonteCarloSectionHTML = renderMonteCarloTabHTML;
