/**
 * src/components/modals/profile/EloSparklineChart.ts
 * Manages the interactive SVG Elo trajectory sparkline for individual manager profiles,
 * including responsive 1:1 mobile viewBox, full-height touch targets, and hover/lock state.
 */

import type { Manager } from '@/types';
import type { EloTrajectoryPoint } from '@/types/analytics';
import {
  getEloMode,
  getManagerEloTrack,
  formatElo,
  getCachedEloProfile,
  loadAnalyticsEloData
} from '@/analytics/analyticsCore';
import { getLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';

export const getDefaultProfileEloSeason = (): string =>
  typeof window !== 'undefined' && typeof window.innerWidth === 'number' && window.innerWidth > 0 && window.innerWidth < 640
    ? 'last10'
    : 'all';

let profileEloSeason: string = getDefaultProfileEloSeason();
let profileEloSeasonUserModified = false;
let currentProfileManager: Manager | null = null;
let selectedProfileEloIndex: number | null = null;

export interface LockedProfileEloMatch {
  season: string;
  round: number;
  team: string;
  opponent: string;
  result: string;
  elo: number;
  delta: number;
  winProb: number;
  idx?: number;
  gf?: number;
  ga?: number;
  fpFor?: number;
  fpAgainst?: number;
}
let lockedProfileEloMatch: LockedProfileEloMatch | null = null;

export function getProfileEloSeason(): string {
  return profileEloSeason;
}

export function getCurrentProfileManager(): Manager | null {
  return currentProfileManager;
}

export function setCurrentProfileManager(m: Manager | null): void {
  currentProfileManager = m;
}

/**
 * Resets selection state when switching to a different manager in profile modal
 */
export function resetProfileEloStateForManager(m: Manager): void {
  if (currentProfileManager?.id !== m.id) {
    selectedProfileEloIndex = null;
    lockedProfileEloMatch = null;
    if (!profileEloSeasonUserModified) {
      profileEloSeason = getDefaultProfileEloSeason();
    }
  }
  currentProfileManager = m;
}

/**
 * Refreshes career Elo sparkline when mode or manager changes
 */
export function refreshCareerEloSparkline(): void {
  if (currentProfileManager) {
    updateProfileEloSparklineUI(currentProfileManager);
  }
}

/**
 * Updates season or recent window filter ('all', '2026/27', '2025/26', 'last10', etc.) and re-renders sparkline
 */
export function switchProfileEloSeason(season: string): void {
  profileEloSeason = season;
  profileEloSeasonUserModified = true;
  selectedProfileEloIndex = null;
  if (lockedProfileEloMatch && season !== 'all' && !season.startsWith('last') && lockedProfileEloMatch.season !== season) {
    lockedProfileEloMatch = null;
  }
  refreshCareerEloSparkline();
}

/**
 * Backwards compatibility helper for range limit
 */
export function setProfileEloRange(range: number): void {
  if (range === 0) profileEloSeason = 'all';
  refreshCareerEloSparkline();
}

/**
 * Locks on a clicked point so match details replace "Passa il mouse" permanently
 */
export function selectProfileEloPoint(
  idx: number,
  season: string,
  round: number,
  team: string,
  opponent: string,
  result: string,
  elo: number,
  delta: number,
  winProb: number,
  gf?: number,
  ga?: number,
  fpFor?: number,
  fpAgainst?: number
): void {
  selectedProfileEloIndex = idx;
  lockedProfileEloMatch = { season, round, team, opponent, result, elo, delta, winProb, idx, gf, ga, fpFor, fpAgainst };
  showProfileEloHover(season, round, team, opponent, result, elo, delta, winProb, gf, ga, fpFor, fpAgainst);

  // Active ring on sparkline
  const svg = document.querySelector('#profile-elo-trajectory-sparkline svg');
  if (svg) {
    const allActiveRings = svg.querySelectorAll('.elo-active-ring');
    allActiveRings.forEach(r => r.remove());

    const targetDot = svg.querySelector(`[data-point-idx="${idx}"]`);
    if (targetDot) {
      const cx = targetDot.getAttribute('cx');
      const cy = targetDot.getAttribute('cy');
      if (cx && cy) {
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('class', 'elo-active-ring');
        ring.setAttribute('cx', cx);
        ring.setAttribute('cy', cy);
        ring.setAttribute('r', '7');
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', '#fbbf24');
        ring.setAttribute('stroke-width', '2');
        ring.setAttribute('pointer-events', 'none');
        targetDot.parentNode?.insertBefore(ring, targetDot);
      }
    }
  }
}

/**
 * Shows hovered point details on the profile Elo sparkline
 */
export function showProfileEloHover(
  season: string,
  round: number,
  team: string,
  opponent: string,
  result: string,
  elo: number,
  delta: number,
  winProb: number,
  _gf?: number,
  _ga?: number,
  _fpFor?: number,
  _fpAgainst?: number
): void {
  const hoverBox = document.getElementById('profile-elo-hover-box');
  if (!hoverBox) return;

  const deltaSign = delta > 0 ? '+' : '';
  const deltaColor = delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-400';
  const resBadge = result === 'W'
    ? '<span class="text-emerald-400 font-bold">(W)</span>'
    : result === 'L'
      ? '<span class="text-rose-400 font-bold">(L)</span>'
      : result === 'D'
        ? '<span class="text-amber-400 font-bold">(D)</span>'
        : '';

  hoverBox.innerHTML = `
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 w-full text-[11px] sm:text-xs">
      <div class="flex items-center gap-1.5 font-bold min-w-0 flex-wrap">
        <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] shrink-0 font-mono">${season} G${round}</span>
        <span class="truncate max-w-[110px] sm:max-w-none" style="color: var(--text-main);">${team}</span>
        <span class="opacity-60 text-[10px] shrink-0">vs</span>
        <span class="truncate max-w-[110px] sm:max-w-none" style="color: var(--text-muted);">${opponent || 'Avversario'}</span>
        ${resBadge}
      </div>
      <div class="flex items-center gap-2 font-mono shrink-0">
        <span class="font-bold text-amber-400 text-xs sm:text-sm">${elo.toFixed(1)} pt</span>
        <span class="${deltaColor} font-bold text-[11px]">(${deltaSign}${delta.toFixed(1)})</span>
        ${winProb > 0 ? `<span class="opacity-70 text-[10px] font-sans" style="color: var(--text-muted);">(Prob. ${winProb.toFixed(0)}%)</span>` : ''}
      </div>
    </div>
  `;
}

/**
 * Clears hovered point on the profile Elo sparkline
 */
export function clearProfileEloHover(): void {
  const hoverBox = document.getElementById('profile-elo-hover-box');
  if (!hoverBox) return;

  if (lockedProfileEloMatch) {
    showProfileEloHover(
      lockedProfileEloMatch.season,
      lockedProfileEloMatch.round,
      lockedProfileEloMatch.team,
      lockedProfileEloMatch.opponent,
      lockedProfileEloMatch.result,
      lockedProfileEloMatch.elo,
      lockedProfileEloMatch.delta,
      lockedProfileEloMatch.winProb,
      lockedProfileEloMatch.gf,
      lockedProfileEloMatch.ga,
      lockedProfileEloMatch.fpFor,
      lockedProfileEloMatch.fpAgainst
    );
    return;
  }

  const liveData = getLiveSeasonDetails();
  const activeMode = getEloMode();
  const fullProfile = currentProfileManager ? getCachedEloProfile(currentProfileManager.id) : null;
  const teamMetric = currentProfileManager ? liveData?.standings.find(s => s.managerId === currentProfileManager!.id) : null;
  const eloTrack = getManagerEloTrack(fullProfile || teamMetric?.elo, activeMode);
  const currentElo = eloTrack?.current;
  const lastDelta = eloTrack?.lastDelta;

  let currentBadge = '';
  if (currentElo !== undefined) {
    const sign = (lastDelta || 0) > 0 ? '+' : '';
    const dColor = (lastDelta || 0) > 0 ? 'text-emerald-400' : (lastDelta || 0) < 0 ? 'text-rose-400' : 'text-slate-400';
    currentBadge = `
      <span class="font-mono font-bold text-amber-400">${formatElo(currentElo)} pt</span>
      ${lastDelta !== undefined ? `<span class="${dColor} font-mono text-[11px] ml-1">(${sign}${lastDelta.toFixed(1)})</span>` : ''}
    `;
  }

  hoverBox.innerHTML = `
    <span class="opacity-70 truncate"><i class="fa-solid fa-hand-pointer mr-1 text-amber-500"></i>Tocca o passa sui punti</span>
    ${currentBadge ? `<span class="shrink-0 text-right">${currentBadge}</span>` : ''}
  `;
}

/**
 * Renders an inline responsive SVG sparkline showing multi-season Elo trajectory points
 */
export function renderEloTrajectorySparkline(
  trajectory: EloTrajectoryPoint[],
  seasonFilter: string = 'all',
  teamName: string = '',
  seasonsMap?: Record<string, EloTrajectoryPoint[]>
): string {
  if ((!trajectory || trajectory.length === 0) && (!seasonsMap || Object.keys(seasonsMap).length === 0)) return '';

  let displayPts: EloTrajectoryPoint[] = [];
  const sorted = [...(trajectory || [])].sort((a, b) => {
    if (a.season !== b.season) return a.season.localeCompare(b.season);
    if (a.matchIndex !== undefined && b.matchIndex !== undefined) {
      return a.matchIndex - b.matchIndex;
    }
    return a.round - b.round;
  });

  if (seasonFilter === 'last10' || seasonFilter === 'last20' || seasonFilter === 'last30') {
    const n = seasonFilter === 'last10' ? 10 : seasonFilter === 'last20' ? 20 : 30;
    displayPts = sorted.slice(-n);
  } else if (seasonFilter !== 'all' && seasonsMap?.[seasonFilter]) {
    displayPts = seasonsMap[seasonFilter];
  } else {
    displayPts = seasonFilter === 'all'
      ? sorted
      : sorted.filter(p => p.season === seasonFilter);
  }

  if (displayPts.length === 0) {
    const msg = seasonFilter.startsWith('last')
      ? 'Nessun match disputato nella finestra recente selezionata.'
      : `Nessun match disputato nella stagione selezionata (${seasonFilter}).`;
    return `<div class="p-6 text-center text-xs opacity-60 italic">${msg}</div>`;
  }

  const isMobile = typeof window !== 'undefined' && typeof window.innerWidth === 'number' && window.innerWidth > 0 && window.innerWidth < 640;
  const width = isMobile ? 340 : 500;
  const height = isMobile ? 165 : 145;
  const padding = isMobile
    ? { top: 22, right: 28, bottom: 35, left: 38 }
    : { top: 22, right: 35, bottom: 32, left: 45 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const rawMinElo = Math.min(...displayPts.map(p => p.elo));
  const rawMaxElo = Math.max(...displayPts.map(p => p.elo));
  let minElo = rawMinElo;
  let maxElo = rawMaxElo;
  if (maxElo - minElo < 20) {
    minElo -= 10;
    maxElo += 10;
  } else {
    minElo = Math.floor(minElo - 5);
    maxElo = Math.ceil(maxElo + 5);
  }

  const count = displayPts.length;
  const getX = (idx: number) => {
    if (count <= 1) return padding.left + innerW / 2;
    return padding.left + (idx / (count - 1)) * innerW;
  };

  const getY = (val: number) => {
    return padding.top + ((maxElo - val) / (maxElo - minElo)) * innerH;
  };

  let pathD = '';
  let dots = '';
  let seasonDividers = '';
  let xLabels = '';
  const sliceW = count > 1 ? innerW / (count - 1) : innerW;
  const maxXLabels = isMobile ? 6 : 9;
  const labelInterval = count > maxXLabels ? Math.ceil(count / maxXLabels) : 1;

  displayPts.forEach((pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.elo);
    if (idx === 0) pathD += `M ${x} ${y}`;
    else pathD += ` L ${x} ${y}`;

    // Detect season change
    if (idx > 0 && pt.season !== displayPts[idx - 1].season) {
      seasonDividers += `
        <line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + innerH}" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="3,3" />
        <text x="${x + 4}" y="${padding.top + 8}" font-size="9" font-weight="bold" fill="currentColor" opacity="0.6">${pt.season}</text>
      `;
    }

    const isFirst = idx === 0;
    const isLast = idx === count - 1;
    const dotR = isLast ? 4.5 : (count > 20 ? 2.5 : 3);
    const dotColor = isLast ? '#fbbf24' : '#f59e0b';
    const escapedTeam = (teamName || '').replace(/'/g, "\\'");
    const escapedOpp = (pt.opponentTeamName || '').replace(/'/g, "\\'");

    const isSelected = lockedProfileEloMatch
      ? (lockedProfileEloMatch.season === pt.season && lockedProfileEloMatch.round === pt.round)
      : (selectedProfileEloIndex === idx);
    const ringHTML = isSelected
      ? `<circle class="elo-active-ring" cx="${x}" cy="${y}" r="7" fill="none" stroke="#fbbf24" stroke-width="2" pointer-events="none"></circle>`
      : '';
    const sliceX = Math.max(padding.left, x - sliceW / 2);

    const rLabel = pt.roundLabel || `G${pt.round}`;
    const compLabel = pt.competitionCategory && pt.competitionCategory !== 'Campionato' ? ` [${pt.competitionCategory}]` : '';

    dots += `
      ${ringHTML}
      <circle data-point-idx="${idx}" cx="${x}" cy="${y}" r="${dotR}" fill="${dotColor}" stroke="#0f172a" stroke-width="1.2" pointer-events="none"></circle>
      <rect x="${sliceX}" y="${padding.top}" width="${sliceW}" height="${innerH}" fill="transparent" class="cursor-pointer"
            onclick="window.selectProfileEloPoint && window.selectProfileEloPoint(${idx}, '${pt.season}', ${pt.round}, '${escapedTeam}', '${escapedOpp}', '${pt.result || ''}', ${pt.elo}, ${pt.delta}, ${pt.winProbPreMatch || 0})"
            onmouseenter="window.showProfileEloHover && window.showProfileEloHover('${pt.season}', ${pt.round}, '${escapedTeam}', '${escapedOpp}', '${pt.result || ''}', ${pt.elo}, ${pt.delta}, ${pt.winProbPreMatch || 0})"
            onmouseleave="window.clearProfileEloHover && window.clearProfileEloHover()">
        <title>${pt.season} ${rLabel}${compLabel}: ${teamName} vs ${pt.opponentTeamName} (${pt.result}) ${pt.elo.toFixed(1)} (${pt.delta > 0 ? '+' : ''}${pt.delta.toFixed(1)})</title>
      </rect>
    `;

    if (isFirst || isLast) {
      const textAnchor = isFirst ? 'start' : 'end';
      const textX = x;
      const textY = y > (padding.top + innerH / 2) ? y - 8 : y + 14;
      dots += `
        <text x="${textX}" y="${textY}" text-anchor="${textAnchor}" font-size="9.5" font-family="monospace" font-weight="bold" fill="#f59e0b">
          ${Math.round(pt.elo)}
        </text>
      `;
    }

    // X-axis round label and tick
    const isStep = idx % labelInterval === 0;
    const wouldCollideWithStep = isLast && (idx % labelInterval !== 0) && ((idx % labelInterval) < Math.max(2, Math.floor(labelInterval / 2)));
    if (isStep || (isLast && !wouldCollideWithStep)) {
      xLabels += `
        <line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + innerH}" stroke="currentColor" stroke-opacity="0.06" />
        <text x="${x}" y="${padding.top + innerH + 16}" text-anchor="middle" font-size="8.5" font-weight="bold" fill="currentColor" opacity="0.6">${rLabel}</text>
      `;
    }
  });

  return `
    <svg viewBox="0 0 ${width} ${height}" class="w-full h-auto select-none overflow-visible">
      <defs>
        <linearGradient id="elo-profile-sparkline-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <!-- Gridlines -->
      <line x1="${padding.left}" y1="${getY(maxElo)}" x2="${padding.left + innerW}" y2="${getY(maxElo)}" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="2,2"/>
      <line x1="${padding.left}" y1="${getY(minElo)}" x2="${padding.left + innerW}" y2="${getY(minElo)}" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="2,2"/>
      <text x="${padding.left - 6}" y="${getY(maxElo) + 3}" text-anchor="end" font-size="9" font-family="monospace" fill="currentColor" opacity="0.6">${Math.round(maxElo)}</text>
      <text x="${padding.left - 6}" y="${getY(minElo) + 3}" text-anchor="end" font-size="9" font-family="monospace" fill="currentColor" opacity="0.6">${Math.round(minElo)}</text>
      ${xLabels}
      ${seasonDividers}
      <!-- Sparkline path -->
      <path d="${pathD}" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
    </svg>
  `;
}

/**
 * Updates the Elo sparkline DOM card for a manager
 */
export function updateProfileEloSparklineUI(m: Manager): void {
  const eloTrajCard = document.getElementById('profile-elo-trajectory-card');
  const eloTrajSparkline = document.getElementById('profile-elo-trajectory-sparkline');
  const eloBadgeEl = document.getElementById('profile-elo-trajectory-badge');

  const liveData = getLiveSeasonDetails();
  const teamMetric = liveData?.standings.find(s => s.managerId === m.id);
  const activeMode = getEloMode();
  const fullProfile = getCachedEloProfile(m.id);
  const eloTrack = getManagerEloTrack(fullProfile || teamMetric?.elo, activeMode);

  // If full profile not cached yet, prefetch in background and update sparkline
  if (!fullProfile) {
    loadAnalyticsEloData().then(managers => {
      if (managers && managers[m.id] && currentProfileManager?.id === m.id) {
        const updatedTrack = getManagerEloTrack(managers[m.id], getEloMode());
        if (updatedTrack && eloTrajSparkline && eloTrajCard) {
          const eloSvg = renderEloTrajectorySparkline(
            updatedTrack.trajectory,
            profileEloSeason,
            teamMetric?.teamName || m.name,
            updatedTrack.seasons
          );
          if (eloSvg) {
            eloTrajSparkline.innerHTML = eloSvg;
            eloTrajCard.classList.remove('hidden');
          }
        }
      }
    }).catch(() => {});
  }

  const hasPoints = eloTrack && (
    eloTrack.trajectory.length > 0 ||
    (eloTrack.seasons && Object.keys(eloTrack.seasons).length > 0)
  );

  if (eloTrajCard && eloTrajSparkline && eloTrack && hasPoints) {
    const eloSvg = renderEloTrajectorySparkline(
      eloTrack.trajectory,
      profileEloSeason,
      teamMetric?.teamName || m.name,
      eloTrack.seasons
    );
    if (eloSvg) {
      eloTrajSparkline.innerHTML = eloSvg;
      if (eloBadgeEl) {
        eloBadgeEl.textContent = activeMode === 'historical' ? '🏛️ Storico' : activeMode === 'atlas' ? '🔮 Atlas' : '⚡ Puro';
      }
      const seasonSelect = document.getElementById('profile-elo-season-select') as HTMLSelectElement | null;
      if (seasonSelect) {
        seasonSelect.value = profileEloSeason;
      }
      clearProfileEloHover();
      eloTrajCard.classList.remove('hidden');
    } else {
      eloTrajCard.classList.add('hidden');
    }
  } else if (eloTrajCard) {
    eloTrajCard.classList.add('hidden');
  }
}
