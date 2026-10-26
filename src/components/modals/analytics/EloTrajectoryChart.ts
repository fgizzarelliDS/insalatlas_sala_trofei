/**
 * src/components/modals/analytics/EloTrajectoryChart.ts
 * Multi-team SVG trajectory chart component for Elo ratings with responsive 1:1 mobile viewBox,
 * dynamic axis scaling, legend chips, and interactive hover box.
 */

import type { EloTrackMode } from '@/types/analytics';
import { getManagerEloTrack, formatElo } from '@/analytics/analyticsCore';
import type { EloProfileEntry } from './EloKpis';

export interface LockedEloChartMatch {
  season: string;
  round: number;
  team: string;
  opponent: string;
  result: string;
  elo: number;
  delta: number;
  winProb: number;
}

// Palette of 14 distinct high-contrast colors for manager trajectory paths
export const MANAGER_COLORS = [
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#10b981', // emerald
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#e11d48', // rose
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#d946ef', // fuchsia
  '#eab308', // yellow
  '#64748b'  // slate
];

/**
 * Renders the multi-team Elo trajectory chart card with controls, SVG plot, and interactive legend
 */
export function renderEloTrajectoryChart(
  kpiProfiles: EloProfileEntry[],
  activeMode: EloTrackMode = 'flat',
  selectedEloSeason: string = 'all',
  hiddenManagerIds: Set<string> = new Set(),
  lockedEloChartMatch: LockedEloChartMatch | null = null
): string {
  // Adaptive mobile viewport detection (1:1 SVG coordinate space on mobile to avoid 50% downscaling)
  const isMobile = typeof window !== 'undefined' && typeof window.innerWidth === 'number' && window.innerWidth > 0 && window.innerWidth < 640;

  // SVG Chart Dimensions
  const svgWidth = isMobile ? 360 : 640;
  const svgHeight = isMobile ? 240 : 280;
  const pad = isMobile
    ? { top: 22, right: 20, bottom: 32, left: 38 }
    : { top: 25, right: 35, bottom: 40, left: 45 };
  const innerW = svgWidth - pad.left - pad.right;
  const innerH = svgHeight - pad.top - pad.bottom;

  // Collect all distinct global (season, round) pairs present across managers
  const allGlobalRoundsMap = new Map<string, { season: string; round: number; label?: string; matchIndex?: number; competitionCategory?: string }>();
  kpiProfiles.forEach(p => {
    const tr = getManagerEloTrack(p.profile, activeMode);
    if (!tr) return;
    tr.trajectory.forEach(pt => {
      const label = pt.roundLabel || `G${pt.round}`;
      const key = `${pt.season}-${label}`;
      if (!allGlobalRoundsMap.has(key)) {
        allGlobalRoundsMap.set(key, {
          season: pt.season,
          round: pt.round,
          label,
          matchIndex: pt.matchIndex,
          competitionCategory: pt.competitionCategory
        });
      }
    });
  });

  const allOrderedGlobalRounds = Array.from(allGlobalRoundsMap.values()).sort((a, b) => {
    if (a.season !== b.season) return a.season.localeCompare(b.season);
    if (a.matchIndex !== undefined && b.matchIndex !== undefined) {
      return a.matchIndex - b.matchIndex;
    }
    return a.round - b.round;
  });

  const isLastN = selectedEloSeason.startsWith('last');
  const lastNCount = isLastN
    ? (selectedEloSeason === 'last10' ? 10 : selectedEloSeason === 'last20' ? 20 : 30)
    : null;

  let orderedRounds: Array<{ season: string; round: number; label?: string; matchIndex?: number; competitionCategory?: string }> = [];
  let allowedRoundKeys: Set<string> | null = null;

  if (lastNCount !== null) {
    orderedRounds = allOrderedGlobalRounds.slice(-lastNCount);
    allowedRoundKeys = new Set(orderedRounds.map(r => `${r.season}-${r.label || `G${r.round}`}`));
  } else {
    const roundsSet = new Map<string, { season: string; round: number; label?: string; matchIndex?: number; competitionCategory?: string }>();
    kpiProfiles.forEach(p => {
      const tr = getManagerEloTrack(p.profile, activeMode);
      if (!tr) return;
      const pts = (selectedEloSeason !== 'all' && tr.seasons?.[selectedEloSeason])
        ? tr.seasons[selectedEloSeason]
        : tr.trajectory.filter(pt => selectedEloSeason === 'all' || pt.season === selectedEloSeason);
      pts.forEach(pt => {
        const label = pt.roundLabel || `G${pt.round}`;
        const key = `${pt.season}-${label}`;
        if (!roundsSet.has(key)) {
          roundsSet.set(key, {
            season: pt.season,
            round: pt.round,
            label,
            matchIndex: pt.matchIndex,
            competitionCategory: pt.competitionCategory
          });
        }
      });
    });
    orderedRounds = Array.from(roundsSet.values()).sort((a, b) => {
      if (a.season !== b.season) return a.season.localeCompare(b.season);
      if (a.matchIndex !== undefined && b.matchIndex !== undefined) {
        return a.matchIndex - b.matchIndex;
      }
      return a.round - b.round;
    });
  }

  // Calculate dynamic min/max Elo rating for visible points in window
  let minRating = 9999;
  let maxRating = -9999;

  kpiProfiles.forEach(p => {
    const tr = getManagerEloTrack(p.profile, activeMode);
    if (!tr) return;
    const pts = allowedRoundKeys !== null
      ? tr.trajectory.filter(pt => allowedRoundKeys!.has(`${pt.season}-${pt.roundLabel || `G${pt.round}`}`))
      : (selectedEloSeason !== 'all' && tr.seasons?.[selectedEloSeason])
        ? tr.seasons[selectedEloSeason]
        : tr.trajectory.filter(pt => selectedEloSeason === 'all' || pt.season === selectedEloSeason);
    pts.forEach(pt => {
      if (pt.elo < minRating) minRating = Math.floor(pt.elo - 20);
      if (pt.elo > maxRating) maxRating = Math.ceil(pt.elo + 20);
    });
  });

  if (minRating === 9999 || maxRating === -9999) {
    minRating = 1400;
    maxRating = 1650;
  }

  const totalPointsCount = orderedRounds.length;
  const roundIndexMap = new Map<string, number>();
  orderedRounds.forEach((r, idx) => {
    roundIndexMap.set(`${r.season}-${r.label || `G${r.round}`}`, idx);
  });

  const getX = (idx: number) => {
    if (totalPointsCount <= 1) return pad.left + innerW / 2;
    return pad.left + (idx / (totalPointsCount - 1)) * innerW;
  };

  const getY = (val: number) => {
    return pad.top + ((maxRating - val) / (maxRating - minRating)) * innerH;
  };

  // Generate SVG gridlines
  const ySteps = 5;
  let gridLines = '';
  for (let i = 0; i <= ySteps; i++) {
    const val = minRating + ((maxRating - minRating) / ySteps) * i;
    const y = getY(val);
    gridLines += `
      <line x1="${pad.left}" y1="${y}" x2="${pad.left + innerW}" y2="${y}" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="3,3" />
      <text x="${pad.left - 8}" y="${y + 3.5}" text-anchor="end" font-size="9" font-family="monospace" fill="currentColor" opacity="0.5">${Math.round(val)}</text>
    `;
  }

  // X Axis labels
  let xLabels = '';
  const maxXLabels = isMobile ? 6 : 10;
  const labelInterval = totalPointsCount > maxXLabels ? Math.ceil(totalPointsCount / maxXLabels) : 1;
  orderedRounds.forEach((r, idx) => {
    const isSeasonStart = idx === 0 || r.season !== orderedRounds[idx - 1].season;
    if (idx % labelInterval === 0 || idx === totalPointsCount - 1 || isSeasonStart) {
      const x = getX(idx);
      const isBoundary = isSeasonStart && idx > 0;
      if (isBoundary) {
        xLabels += `
          <line x1="${x}" y1="${pad.top}" x2="${x}" y2="${pad.top + innerH}" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="3,3" />
          <text x="${x + 4}" y="${pad.top + 10}" font-size="9" font-weight="bold" fill="currentColor" opacity="0.7">${r.season}</text>
        `;
      }
      xLabels += `
        <line x1="${x}" y1="${pad.top}" x2="${x}" y2="${pad.top + innerH}" stroke="currentColor" stroke-opacity="0.05" />
        <text x="${x}" y="${pad.top + innerH + 16}" text-anchor="middle" font-size="9" font-weight="bold" fill="currentColor" opacity="0.6">${r.label || `G${r.round}`}</text>
      `;
    }
  });

  // Build Trajectory Paths, Dots and Legend Items
  let pathsHTML = '';
  let dotsHTML = '';
  let legendItems = '';

  kpiProfiles.forEach((p, idx) => {
    const color = MANAGER_COLORS[idx % MANAGER_COLORS.length];
    const tr = getManagerEloTrack(p.profile, activeMode);
    if (!tr) return;

    const isHidden = hiddenManagerIds.has(p.managerId);

    const ptsSource = allowedRoundKeys !== null
      ? tr.trajectory.filter(pt => allowedRoundKeys!.has(`${pt.season}-${pt.roundLabel || `G${pt.round}`}`))
      : (selectedEloSeason !== 'all' && tr.seasons?.[selectedEloSeason])
        ? tr.seasons[selectedEloSeason]
        : tr.trajectory.filter(pt => selectedEloSeason === 'all' || pt.season === selectedEloSeason);

    const trajectoryPts = [...ptsSource].sort((a, b) => {
      if (a.season !== b.season) return a.season.localeCompare(b.season);
      if (a.matchIndex !== undefined && b.matchIndex !== undefined) {
        return a.matchIndex - b.matchIndex;
      }
      return a.round - b.round;
    });

    if (!isHidden && trajectoryPts.length > 0) {
      let pathD = '';
      const hitRadius = isMobile ? 15 : 12;

      trajectoryPts.forEach((pt, pIdx) => {
        const key = `${pt.season}-${pt.roundLabel || `G${pt.round}`}`;
        const ptIdx = roundIndexMap.get(key) ?? pIdx;
        const x = getX(ptIdx);
        const y = getY(pt.elo);
        if (pIdx === 0) {
          pathD += `M ${x} ${y}`;
        } else {
          pathD += ` L ${x} ${y}`;
        }

        const escapedTeam = p.teamName.replace(/'/g, "\\'");
        const escapedOpp = (pt.opponentTeamName || '').replace(/'/g, "\\'");

        const isSelected = lockedEloChartMatch &&
          lockedEloChartMatch.team === p.teamName &&
          lockedEloChartMatch.season === pt.season &&
          lockedEloChartMatch.round === pt.round;
        const ringHTML = isSelected
          ? `<circle class="elo-active-ring" cx="${x}" cy="${y}" r="7" fill="none" stroke="#fbbf24" stroke-width="2" pointer-events="none"></circle>`
          : '';

        const dotR = totalPointsCount > 20 ? 2.5 : 3.2;
        const rLabel = pt.roundLabel || `G${pt.round}`;
        const compLabel = pt.competitionCategory && pt.competitionCategory !== 'Campionato' ? ` [${pt.competitionCategory}]` : '';

        // Visible node dot + transparent hit target circle
        dotsHTML += `
          ${ringHTML}
          <circle cx="${x}" cy="${y}" r="${dotR}" fill="${color}" stroke="#0f172a" stroke-width="1.2" pointer-events="none"></circle>
          <circle cx="${x}" cy="${y}" r="${hitRadius}" fill="transparent" stroke="transparent" class="cursor-pointer"
                  onclick="window.selectEloChartPoint && window.selectEloChartPoint('${pt.season}', ${pt.round}, '${escapedTeam}', '${escapedOpp}', '${pt.result || '-'}', ${pt.elo}, ${pt.delta}, ${pt.winProbPreMatch ?? 0})"
                  onmouseenter="window.showEloChartHover && window.showEloChartHover('${pt.season}', ${pt.round}, '${escapedTeam}', '${escapedOpp}', '${pt.result || '-'}', ${pt.elo}, ${pt.delta}, ${pt.winProbPreMatch ?? 0})"
                  onmouseleave="window.clearEloChartHover && window.clearEloChartHover()">
            <title>${p.teamName} (${pt.season} ${rLabel}${compLabel}): ${pt.elo.toFixed(1)} (${pt.delta > 0 ? '+' : ''}${pt.delta.toFixed(1)})</title>
          </circle>
        `;
      });

      pathsHTML += `
        <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
              class="transition-opacity opacity-85 hover:opacity-100 hover:stroke-[3.5] cursor-pointer">
          <title>${p.teamName}: ${formatElo(tr.current)}</title>
        </path>
      `;
    }

    // Clickable Legend item chip
    const chipOpacity = isHidden ? 'opacity-40 grayscale line-through' : 'opacity-100';
    legendItems += `
      <button type="button"
              onclick="window.toggleEloManagerVisibility && window.toggleEloManagerVisibility('${p.managerId}')"
              class="flex items-center gap-1.5 text-[10px] font-semibold whitespace-nowrap px-2 py-1 rounded-lg border transition cursor-pointer hover:scale-105 active:scale-95 ${chipOpacity}"
              style="border-color: var(--table-border); background-color: var(--table-surface);"
              title="Clicca per mostrare o nascondere ${p.teamName}">
        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${color};"></span>
        <span class="truncate max-w-[85px] sm:max-w-[110px]" style="color: var(--text-main);">${p.teamName}</span>
        <span class="font-mono font-bold" style="color: ${color};">${formatElo(tr.current)}</span>
      </button>
    `;
  });

  // Hover Box Content
  let hoverBoxContent = `<span class="opacity-70 truncate"><i class="fa-solid fa-hand-pointer mr-1.5 text-amber-500"></i>Tocca o passa sui punti per visualizzare i dettagli del match</span>`;
  if (lockedEloChartMatch) {
    let matchPt: any = null;
    for (const p of kpiProfiles) {
      if (p.teamName === lockedEloChartMatch.team) {
        const tr = getManagerEloTrack(p.profile, activeMode);
        matchPt = tr?.trajectory.find(pt => pt.season === lockedEloChartMatch.season && pt.round === lockedEloChartMatch.round);
        break;
      }
    }
    if (matchPt) {
      const deltaSign = matchPt.delta > 0 ? '+' : '';
      const deltaColor = matchPt.delta > 0 ? 'text-emerald-400' : matchPt.delta < 0 ? 'text-rose-400' : 'text-slate-400';
      const resBadge = matchPt.result === 'W' ? 'text-emerald-400 font-bold' : matchPt.result === 'L' ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold';
      const winProb = matchPt.winProbPreMatch ?? 0;
      hoverBoxContent = `
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 w-full text-[11px] sm:text-xs">
          <div class="flex items-center gap-1.5 font-bold min-w-0 flex-wrap">
            <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] shrink-0">${matchPt.season} G${matchPt.round}</span>
            <span style="color: var(--text-main);" class="truncate max-w-[110px] sm:max-w-none">${lockedEloChartMatch.team}</span>
            <span class="opacity-60 text-[10px] shrink-0">vs</span>
            <span style="color: var(--text-muted);" class="truncate max-w-[110px] sm:max-w-none">${matchPt.opponentTeamName || lockedEloChartMatch.opponent}</span>
            <span class="${resBadge} shrink-0">(${matchPt.result || '-'})</span>
          </div>
          <div class="flex items-center gap-2 font-mono shrink-0">
            <span class="font-black text-amber-400 text-xs sm:text-sm">${matchPt.elo.toFixed(1)} pt</span>
            <span class="${deltaColor} font-bold text-[11px]">(${deltaSign}${matchPt.delta.toFixed(1)})</span>
            ${winProb > 0 ? `<span class="opacity-75 text-[10px] font-sans" style="color: var(--text-muted);">(Prob. ${winProb.toFixed(0)}%)</span>` : ''}
          </div>
        </div>
      `;
    }
  }

  return `
    <div class="p-3.5 sm:p-4 rounded-2xl border flex flex-col gap-3"
         style="background-color: var(--table-surface); border-color: var(--table-border);">
      
      <!-- Chart Controls Header: Season dropdown & visibility actions -->
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-chart-line text-amber-500 text-xs"></i>
          <h4 class="font-bold text-xs sm:text-sm uppercase tracking-wider" style="color: var(--text-main);">
            Traiettoria Elo
          </h4>
        </div>

        <!-- Season Selector Dropdown & Quick Actions -->
        <div class="flex items-center gap-2 flex-wrap">
          <select onchange="window.switchEloChartSeason && window.switchEloChartSeason(this.value)"
                  class="px-2.5 py-1 rounded-xl text-xs font-bold border transition cursor-pointer"
                  style="background-color: var(--input-bg); border-color: var(--table-border); color: var(--text-main);">
            <optgroup label="Stagioni">
              <option value="all" ${selectedEloSeason === 'all' ? 'selected' : ''}>Tutte le stagioni (Continuo)</option>
              <option value="2026/27" ${selectedEloSeason === '2026/27' ? 'selected' : ''}>2026/27 (Corrente)</option>
              <option value="2025/26" ${selectedEloSeason === '2025/26' ? 'selected' : ''}>2025/26</option>
            </optgroup>
            <optgroup label="Finestra Recente">
              <option value="last10" ${selectedEloSeason === 'last10' ? 'selected' : ''}>Ultimi 10 match</option>
              <option value="last20" ${selectedEloSeason === 'last20' ? 'selected' : ''}>Ultimi 20 match</option>
              <option value="last30" ${selectedEloSeason === 'last30' ? 'selected' : ''}>Ultimi 30 match</option>
            </optgroup>
          </select>

          <button type="button"
                  onclick="window.showAllEloManagers && window.showAllEloManagers()"
                  class="px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-600/40 bg-slate-500/10 text-slate-300 hover:text-amber-400 hover:bg-amber-500/10 transition cursor-pointer">
            Tutti
          </button>
          <button type="button"
                  onclick="window.hideAllEloManagers && window.hideAllEloManagers()"
                  class="px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-600/40 bg-slate-500/10 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer">
            Nessuno
          </button>
        </div>
      </div>

      <!-- Interactive Hover Status Box with responsive min-height (unclipped) -->
      <div id="elo-chart-hover-box"
           class="min-h-[44px] sm:min-h-[38px] px-3 py-1.5 rounded-xl border flex items-center justify-center text-xs font-semibold text-center transition-colors"
           style="background-color: var(--input-bg); border-color: var(--table-border); color: var(--text-muted);">
        ${hoverBoxContent}
      </div>

      <!-- Responsive SVG Chart -->
      <div class="w-full overflow-hidden flex items-center justify-center">
        <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="w-full h-auto max-h-[320px] select-none">
          ${gridLines}
          ${xLabels}
          ${pathsHTML}
          ${dotsHTML}
        </svg>
      </div>

      <!-- Interactive Manager Legend (Clickable Chips) -->
      <div class="flex items-center gap-1.5 flex-wrap pt-2.5 border-t" style="border-color: var(--table-border);">
        ${legendItems}
      </div>
    </div>
  `;
}
