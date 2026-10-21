import type { Manager } from '@/types';
import { state } from '@/state';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import { renderRankTrajectorySparkline } from './SparklineChart';
import {
  getEloMode,
  getManagerEloTrack,
  formatElo,
  getCachedEloProfile,
  loadAnalyticsEloData
} from '@/analytics/analyticsCore';
import { getLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';
import type { EloTrajectoryPoint } from '@/types/analytics';

export interface HistoricalTeamRecord {
  name: string;
  logo: string | null;
  seasons: string[];
  formattedSeasons: string;
}

/**
 * Formats a list of seasons into compact intervals for consecutive years (e.g. '21/22–25/26')
 * and comma-separated lists for non-consecutive years (e.g. '18/19, 21/22').
 */
export function formatSeasonsList(seasons: string[]): string {
  if (!seasons || seasons.length === 0) return '';
  const parsed = seasons
    .map(s => {
      const m = s.match(/(\d{2,4})\/(\d{2,4})/);
      if (!m) return { raw: s, startYear: 0, short: s };
      let y1 = parseInt(m[1], 10);
      if (y1 < 100) y1 += 2000;
      const s1 = String(y1).slice(-2);
      const s2 = String(y1 + 1).slice(-2);
      return { raw: s, startYear: y1, short: `${s1}/${s2}` };
    })
    .filter(p => p.startYear > 0)
    .sort((a, b) => a.startYear - b.startYear);

  if (parsed.length === 0) return '';
  const ranges: (typeof parsed)[] = [];
  let currentGroup = [parsed[0]];
  for (let i = 1; i < parsed.length; i++) {
    const prev = currentGroup[currentGroup.length - 1];
    const curr = parsed[i];
    if (curr.startYear === prev.startYear) continue; // duplicate season
    if (curr.startYear === prev.startYear + 1) {
      currentGroup.push(curr);
    } else {
      ranges.push(currentGroup);
      currentGroup = [curr];
    }
  }
  if (currentGroup.length > 0) ranges.push(currentGroup);

  return ranges
    .map(group => {
      if (group.length === 1) return group[0].short;
      return `${group[0].short}–${group[group.length - 1].short}`;
    })
    .join(', ');
}

/**
 * Returns distinct historical teams used by the manager with their logo, seasons and formatted ranges
 */
export function getHistoricalTeamDetails(m: Manager): HistoricalTeamRecord[] {
  const norm = (s?: string | null) => (s || '').replace(/\s+/g, '').toLowerCase();

  const isValid = (name?: string | null) => {
    if (!name) return false;
    const trimmed = name.trim();
    return (
      trimmed.length > 0 &&
      trimmed.toLowerCase() !== 'squadra non registrata' &&
      trimmed.toLowerCase() !== 'partecipante'
    );
  };

  const teamsMap = new Map<string, { name: string; seasons: Set<string>; logo: string | null }>();

  // 1. Collect from career history
  if (m.history) {
    m.history.forEach(s => {
      if (isValid(s.team)) {
        const trimmed = s.team!.trim();
        const key = norm(trimmed);
        if (!teamsMap.has(key)) {
          teamsMap.set(key, { name: trimmed, seasons: new Set(), logo: null });
        } else {
          const existing = teamsMap.get(key)!;
          if (trimmed.length > existing.name.length) {
            existing.name = trimmed;
          }
        }
        if (s.season) teamsMap.get(key)!.seasons.add(s.season);
      }
    });
  }

  // 2. Collect from all competition rankings
  if (state.competitions) {
    state.competitions.forEach(comp => {
      comp.ranking?.forEach(r => {
        if (r.managerId === m.id && isValid(r.teamName)) {
          const trimmed = r.teamName.trim();
          const key = norm(trimmed);
          if (!teamsMap.has(key)) {
            teamsMap.set(key, { name: trimmed, seasons: new Set(), logo: null });
          } else {
            const existing = teamsMap.get(key)!;
            if (trimmed.length > existing.name.length) {
              existing.name = trimmed;
            }
          }
          if (comp.season) teamsMap.get(key)!.seasons.add(comp.season);
          if (r.logo) {
            const currentLogo = teamsMap.get(key)!.logo;
            const isCrestSvg = (logo?: string | null) => !!logo && logo.includes('assets/crests/');
            if (!currentLogo || (isCrestSvg(currentLogo) && !isCrestSvg(r.logo))) {
              teamsMap.get(key)!.logo = r.logo;
            }
          }
        }
      });
    });
  }

  // 3. Fallback logo search across all rankings
  if (state.competitions) {
    state.competitions.forEach(comp => {
      comp.ranking?.forEach(r => {
        if (r.teamName && r.logo) {
          const key = norm(r.teamName);
          const entry = teamsMap.get(key);
          const isCrestSvg = (logo?: string | null) => !!logo && logo.includes('assets/crests/');
          if (entry && (!entry.logo || (isCrestSvg(entry.logo) && !isCrestSvg(r.logo)))) {
            entry.logo = r.logo;
          }
        }
      });
    });
  }

  return Array.from(teamsMap.values()).map(t => {
    const seasonsList = Array.from(t.seasons);
    return {
      name: t.name,
      logo: t.logo,
      seasons: seasonsList,
      formattedSeasons: formatSeasonsList(seasonsList)
    };
  });
}

/**
 * Returns distinct historical team names used by the manager,
 * deduplicating collapsed vs spaced versions (e.g. 'Steven Bradbury FC' > 'StevenBradburyFC').
 */
export function getDistinctTeamNames(m: Manager): string[] {
  return getHistoricalTeamDetails(m).map(t => t.name);
}

/**
 * Populates the list of historical team names used by the manager across their career
 */
export function populateHistoricalTeams(m: Manager): void {
  const card = document.getElementById('profile-historical-teams-card');
  const countEl = document.getElementById('profile-historical-teams-count');
  const listEl = document.getElementById('profile-historical-teams-list');

  if (!card || !listEl) return;

  const teams = getHistoricalTeamDetails(m);

  if (teams.length === 0) {
    card.classList.add('hidden');
    return;
  }

  card.classList.remove('hidden');
  if (countEl) {
    countEl.textContent = `${teams.length} ${teams.length === 1 ? 'Nome Storico' : 'Nomi Storici'}`;
  }

  listEl.innerHTML = '';
  teams.forEach(team => {
    const chip = document.createElement('span');
    chip.className =
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-sm transition-colors bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';

    const resolvedLogo = resolveTeamLogo(team.name, team.logo);
    const fallbackCrest = getTeamFallbackCrest(team.name);
    const logoHtml = `<img src="${resolvedLogo}" alt="${team.name}" class="w-4 h-4 rounded-full object-contain shrink-0 bg-white/20 border border-slate-300 dark:border-slate-600 shadow-sm" onerror="this.onerror=null; this.src='${fallbackCrest}'">`;

    const seasonsHtml = team.formattedSeasons
      ? `<span class="opacity-60 text-[10px] font-normal tracking-tight">• ${team.formattedSeasons}</span>`
      : '';

    chip.innerHTML = `${logoHtml} <span class="leading-tight">${team.name}</span> ${seasonsHtml}`;
    listEl.appendChild(chip);
  });
}

let profileEloSeason: string = 'all';
let currentProfileManager: Manager | null = null;
let selectedProfileEloIndex: number | null = null;

interface LockedProfileEloMatch {
  season: string;
  round: number;
  team: string;
  opponent: string;
  result: string;
  elo: number;
  delta: number;
  winProb: number;
  idx?: number;
}
let lockedProfileEloMatch: LockedProfileEloMatch | null = null;

/**
 * Refreshes career Elo sparkline when mode or manager changes
 */
export function refreshCareerEloSparkline(): void {
  if (currentProfileManager) {
    populateCareerTimeline(currentProfileManager);
  }
}

/**
 * Updates season or recent window filter ('all', '2026/27', '2025/26', 'last10', etc.) and re-renders sparkline
 */
export function switchProfileEloSeason(season: string): void {
  profileEloSeason = season;
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
  winProb: number
): void {
  selectedProfileEloIndex = idx;
  lockedProfileEloMatch = { season, round, team, opponent, result, elo, delta, winProb, idx };
  showProfileEloHover(season, round, team, opponent, result, elo, delta, winProb);

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
  winProb: number
): void {
  const box = document.getElementById('profile-elo-hover-box');
  if (!box) return;

  const deltaSign = delta > 0 ? '+' : '';
  const deltaColor = delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-400';
  const resBadge = result === 'W' ? 'text-emerald-400 font-bold' : result === 'L' ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold';

  box.innerHTML = `
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 w-full text-[11px] sm:text-xs">
      <div class="flex items-center gap-1.5 font-bold min-w-0 flex-wrap">
        <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] shrink-0">${season} G${round}</span>
        <span class="truncate max-w-[110px] sm:max-w-none" style="color: var(--text-main);">${team}</span>
        <span class="opacity-60 text-[10px] shrink-0" style="color: var(--text-muted);">vs</span>
        <span class="truncate max-w-[110px] sm:max-w-none" style="color: var(--text-muted);">${opponent || 'Avversario'}</span>
        <span class="${resBadge} shrink-0">(${result})</span>
      </div>
      <div class="flex items-center gap-2 font-mono shrink-0">
        <span class="font-black text-amber-400 text-xs sm:text-sm">${elo.toFixed(1)} pt</span>
        <span class="${deltaColor} font-bold text-[10px]">(${deltaSign}${delta.toFixed(1)})</span>
        ${winProb > 0 ? `<span class="opacity-75 text-[10px] font-sans" style="color: var(--text-muted);">(Prob. ${winProb.toFixed(0)}%)</span>` : ''}
      </div>
    </div>
  `;
}

/**
 * Restores idle state or preserves locked clicked match details
 */
export function clearProfileEloHover(): void {
  const box = document.getElementById('profile-elo-hover-box');
  if (!box) return;

  if (lockedProfileEloMatch) {
    if (currentProfileManager) {
      const activeMode = getEloMode();
      const fullProfile = getCachedEloProfile(currentProfileManager.id);
      const liveData = getLiveSeasonDetails();
      const teamMetric = liveData?.standings.find(s => s.managerId === currentProfileManager?.id);
      const eloTrack = getManagerEloTrack(fullProfile || teamMetric?.elo, activeMode);

      if (eloTrack) {
        const matchPt = eloTrack.trajectory.find(
          p => p.season === lockedProfileEloMatch!.season && p.round === lockedProfileEloMatch!.round
        );
        if (matchPt) {
          showProfileEloHover(
            matchPt.season,
            matchPt.round,
            lockedProfileEloMatch.team,
            matchPt.opponentTeamName || lockedProfileEloMatch.opponent,
            matchPt.result || lockedProfileEloMatch.result || '',
            matchPt.elo,
            matchPt.delta,
            matchPt.winProbPreMatch || 0
          );
          return;
        }
      }
    }

    // Fallback if matchPt cannot be re-resolved
    showProfileEloHover(
      lockedProfileEloMatch.season,
      lockedProfileEloMatch.round,
      lockedProfileEloMatch.team,
      lockedProfileEloMatch.opponent,
      lockedProfileEloMatch.result || '',
      lockedProfileEloMatch.elo,
      lockedProfileEloMatch.delta,
      lockedProfileEloMatch.winProb || 0
    );
    return;
  }

  if (currentProfileManager) {
    const liveData = getLiveSeasonDetails();
    const teamMetric = liveData?.standings.find(s => s.managerId === currentProfileManager?.id);
    const activeMode = getEloMode();
    const fullProfile = getCachedEloProfile(currentProfileManager.id);
    const eloTrack = getManagerEloTrack(fullProfile || teamMetric?.elo, activeMode);
    const curVal = eloTrack ? `${formatElo(eloTrack.current)} pt (${eloTrack.lastDelta >= 0 ? '+' : ''}${eloTrack.lastDelta.toFixed(1)})` : '';

    box.innerHTML = `
      <div class="flex items-center justify-between gap-2 w-full text-[11px]">
        <span class="opacity-70 truncate"><i class="fa-solid fa-hand-pointer mr-1.5 text-amber-500"></i>Tocca o passa sui punti</span>
        <span class="font-mono font-bold text-amber-500 dark:text-amber-400 shrink-0">${curVal}</span>
      </div>
    `;
  } else {
    box.innerHTML = `
      <span class="opacity-70 truncate"><i class="fa-solid fa-hand-pointer mr-1.5 text-amber-500"></i>Tocca o passa sui punti</span>
    `;
  }
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

  const width = 500;
  const height = 130;
  const padding = { top: 22, right: 35, bottom: 25, left: 45 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  let minElo = Math.min(...displayPts.map(p => p.elo));
  let maxElo = Math.max(...displayPts.map(p => p.elo));
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

  displayPts.forEach((pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.elo);
    if (idx === 0) pathD += `M ${x} ${y}`;
    else pathD += ` L ${x} ${y}`;

    // Detect season change
    if (idx > 0 && pt.season !== displayPts[idx - 1].season) {
      seasonDividers += `
        <line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + innerH}" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="3,3" />
        <text x="${x + 4}" y="${padding.top + 8}" font-size="8" font-weight="bold" fill="currentColor" opacity="0.6">${pt.season}</text>
      `;
    }

    const isFirst = idx === 0;
    const isLast = idx === count - 1;
    const dotR = isLast ? 4.5 : 3;
    const dotColor = isLast ? '#fbbf24' : '#f59e0b';
    const escapedTeam = (teamName || '').replace(/'/g, "\\'");
    const escapedOpp = (pt.opponentTeamName || '').replace(/'/g, "\\'");

    const isSelected = lockedProfileEloMatch
      ? (lockedProfileEloMatch.season === pt.season && lockedProfileEloMatch.round === pt.round)
      : (selectedProfileEloIndex === idx);
    const ringHTML = isSelected
      ? `<circle class="elo-active-ring" cx="${x}" cy="${y}" r="7" fill="none" stroke="#fbbf24" stroke-width="2" pointer-events="none"></circle>`
      : '';

    dots += `
      ${ringHTML}
      <circle data-point-idx="${idx}" cx="${x}" cy="${y}" r="${dotR}" fill="${dotColor}" stroke="#0f172a" stroke-width="1.5" pointer-events="none"></circle>
      <circle cx="${x}" cy="${y}" r="12" fill="transparent" stroke="transparent" class="cursor-pointer"
              onclick="window.selectProfileEloPoint && window.selectProfileEloPoint(${idx}, '${pt.season}', ${pt.round}, '${escapedTeam}', '${escapedOpp}', '${pt.result || ''}', ${pt.elo}, ${pt.delta}, ${pt.winProbPreMatch || 0})"
              onmouseenter="window.showProfileEloHover && window.showProfileEloHover('${pt.season}', ${pt.round}, '${escapedTeam}', '${escapedOpp}', '${pt.result || ''}', ${pt.elo}, ${pt.delta}, ${pt.winProbPreMatch || 0})"
              onmouseleave="window.clearProfileEloHover && window.clearProfileEloHover()">
        <title>${pt.season} G${pt.round}: ${teamName} vs ${pt.opponentTeamName} (${pt.result}) ${pt.elo.toFixed(1)} (${pt.delta > 0 ? '+' : ''}${pt.delta.toFixed(1)})</title>
      </circle>
    `;

    if (isFirst || isLast) {
      const textAnchor = isFirst ? 'start' : 'end';
      const textX = x;
      const textY = y > (padding.top + innerH / 2) ? y - 8 : y + 14;
      dots += `
        <text x="${textX}" y="${textY}" text-anchor="${textAnchor}" font-size="8.5" font-family="monospace" font-weight="bold" fill="#f59e0b">
          ${Math.round(pt.elo)}
        </text>
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
      <text x="${padding.left - 6}" y="${getY(maxElo) + 3}" text-anchor="end" font-size="8" font-family="monospace" fill="currentColor" opacity="0.6">${Math.round(maxElo)}</text>
      <text x="${padding.left - 6}" y="${getY(minElo) + 3}" text-anchor="end" font-size="8" font-family="monospace" fill="currentColor" opacity="0.6">${Math.round(minElo)}</text>
      ${seasonDividers}
      <!-- Sparkline path -->
      <path d="${pathD}" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
    </svg>
  `;
}

/**
 * Populates season-by-season career cards with rank badges, points, team names, and trophy chips
 */
export function populateCareerTimeline(m: Manager): void {
  if (currentProfileManager?.id !== m.id) {
    selectedProfileEloIndex = null;
    lockedProfileEloMatch = null;
  }
  currentProfileManager = m;
  const trajCard = document.getElementById('profile-trajectory-card');
  const trajSparkline = document.getElementById('profile-trajectory-sparkline');
  const eloTrajCard = document.getElementById('profile-elo-trajectory-card');
  const eloTrajSparkline = document.getElementById('profile-elo-trajectory-sparkline');
  const eloBadgeEl = document.getElementById('profile-elo-trajectory-badge');
  const timelineCard = document.getElementById('profile-career-timeline-card');
  const timelineContainer = document.getElementById('profile-career-timeline');

  // Trajectory Elo Sparkline
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
        eloBadgeEl.textContent = activeMode === 'flat' ? '⚡ Puro' : '🏛️ Storico';
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

  if (!m.history || m.history.length === 0) {
    if (trajCard) trajCard.classList.add('hidden');
    if (timelineCard) timelineCard.classList.add('hidden');
    return;
  }

  // Historical Team Names
  populateHistoricalTeams(m);

  // Trajectory Sparkline
  if (trajSparkline && trajCard) {
    const sparklineSvg = renderRankTrajectorySparkline(m.history);
    if (sparklineSvg) {
      trajSparkline.innerHTML = sparklineSvg;
      trajCard.classList.remove('hidden');
    } else {
      trajCard.classList.add('hidden');
    }
  }

  // Career Timeline
  if (timelineContainer && timelineCard) {
    timelineContainer.innerHTML = '';
    timelineCard.classList.remove('hidden');

    m.history.forEach(s => {
      const card = document.createElement('div');
      card.className = 'p-3.5 rounded-xl border transition-colors shadow-sm';
      card.style.borderColor = 'var(--table-border)';
      card.style.backgroundColor = 'var(--table-surface)';

      // Badges for achievements
      let achievementChips = '';
      if (s.achievements && s.achievements.length > 0) {
        s.achievements.forEach(a => {
          let chipClass = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40';
          if (a.badge === 'silver' || a.badge === 'cup_silver' || a.badge === 'supercup_silver' || a.badge === 'mundialito_silver') {
            chipClass = 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600';
          } else if (a.badge === 'bronze') {
            chipClass = 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-800/25 dark:text-amber-400 dark:border-amber-700/40';
          } else if (a.badge === 'spoon') {
            chipClass = 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40';
          } else if (a.badge === 'cartonato') {
            chipClass = 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700/50';
          }

          achievementChips += `
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border shadow-sm ${chipClass}">
              <span>${a.icon}</span> <span>${a.title}</span>
            </span>
          `;
        });
      }

      // League placement chip
      let rankBadge = '';
      if (s.in_progress || s.status === 'in_progress') {
        rankBadge = `<span class="px-2 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/30 animate-pulse shadow-sm">In Corso</span>`;
      } else if (typeof s.rank === 'number' && s.rank > 0) {
        const hasValidPoints = typeof s.points === 'number' && s.points > 0;
        const ptsLabel = hasValidPoints ? ` • ${s.points} pt` : '';
        if (s.rank === 1) {
          rankBadge = `<span class="px-2 py-0.5 rounded-lg text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/25 dark:text-amber-300 dark:border-amber-500/40 shadow-sm">🥇 1° Posto${ptsLabel}</span>`;
        } else if (s.rank === 2) {
          rankBadge = `<span class="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600 shadow-sm">🥈 2° Posto${ptsLabel}</span>`;
        } else if (s.rank === 3) {
          rankBadge = `<span class="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-700/25 dark:text-amber-400 dark:border-amber-700/40 shadow-sm">🥉 3° Posto${ptsLabel}</span>`;
        } else {
          rankBadge = `<span class="px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-sm">#${s.rank}${ptsLabel}</span>`;
        }
      } else {
        rankBadge = `<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/60 shadow-sm">Partecipante • N/D</span>`;
      }

      // Drawer button if competitionId exists
      let drawerBtn = '';
      let drawerContainer = '';
      if (s.competitionId) {
        drawerBtn = `
          <button type="button" onclick="window.toggleCompetitionDrawer(${s.competitionId}, '${s.season}')"
            class="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 transition flex items-center gap-1 shadow-sm">
            <i class="fa-solid fa-list-ol text-amber-500 dark:text-amber-400"></i>
            <span>Classifica</span>
          </button>
        `;
        drawerContainer = `<div id="drawer-comp-${s.competitionId}" class="competition-drawer hidden mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700/60"></div>`;
      }

      card.innerHTML = `
        <div class="flex items-center justify-between gap-2 flex-wrap mb-1.5">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
              ${s.season}
            </span>
            <span class="font-bold text-xs opacity-90">${s.team || 'Partecipante'}</span>
          </div>
          <div class="flex items-center gap-1.5">
            ${rankBadge}
            ${drawerBtn}
          </div>
        </div>
        ${achievementChips ? `<div class="flex items-center gap-1.5 flex-wrap mt-2">${achievementChips}</div>` : ''}
        ${drawerContainer}
      `;

      timelineContainer.appendChild(card);
    });
  }
}

// Global window registration
if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>;
  w.switchProfileEloSeason = switchProfileEloSeason;
  w.setProfileEloRange = setProfileEloRange;
  w.selectProfileEloPoint = selectProfileEloPoint;
  w.showProfileEloHover = showProfileEloHover;
  w.clearProfileEloHover = clearProfileEloHover;
}

