import type { SeasonRecord } from '@/types';
import { state } from '@/state';

/**
 * Returns all distinct completed league seasons sorted chronologically ascending (2016/17 -> 2025/26)
 */
export function getAllLeagueSeasonsChronological(): string[] {
  const seasonsSet = new Set<string>();
  if (state.competitions) {
    state.competitions.forEach(c => {
      if (c.season && !c.in_progress && c.status !== 'in_progress') {
        seasonsSet.add(c.season);
      }
    });
  }
  if (state.managers) {
    state.managers.forEach(m => {
      m.history?.forEach(h => {
        if (h.season && !h.in_progress && (h as any).status !== 'in_progress') {
          seasonsSet.add(h.season);
        }
      });
    });
  }
  if (seasonsSet.size === 0) {
    return [
      '2016/17', '2017/18', '2018/19', '2019/20', '2020/21',
      '2021/22', '2022/23', '2023/24', '2024/25', '2025/26'
    ];
  }
  return Array.from(seasonsSet).sort((a, b) => {
    const yA = parseInt(a.match(/\d{4}/)?.[0] || '0', 10);
    const yB = parseInt(b.match(/\d{4}/)?.[0] || '0', 10);
    return yA - yB;
  });
}

/**
 * Renders an inline responsive SVG bump chart showing historical league positions
 * across the full timeline of completed seasons, rendering N/D nodes for unrecorded or missing seasons.
 */
export function renderRankTrajectorySparkline(history: SeasonRecord[]): string {
  const rankedSeasons = history.filter(
    s => !s.in_progress && (s as any).status !== 'in_progress' && typeof s.rank === 'number' && (s.rank as number) > 0
  );
  if (rankedSeasons.length === 0) return '';

  const allSeasons = getAllLeagueSeasonsChronological();
  const historyMap = new Map<string, SeasonRecord>();
  history.forEach(h => {
    if (h.season) historyMap.set(h.season, h);
  });

  const width = 500;
  const height = 130;
  const padding = { top: 22, right: 30, bottom: 34, left: 34 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const minRank = 1;
  const maxRank = Math.max(12, ...rankedSeasons.map(s => s.rank as number));

  const getY = (rank: number) => {
    return padding.top + ((rank - minRank) / (maxRank - minRank)) * innerH;
  };

  const getX = (index: number, total: number) => {
    if (total <= 1) return padding.left + innerW / 2;
    return padding.left + (index / (total - 1)) * innerW;
  };

  // Helper to dynamically retrieve participant team count for a season from the database
  const getSeasonTeamCount = (season: string): number => {
    const comp = state.competitions?.find(
      c => c.season === season && (c.category === 'Campionato' || (c.name && c.name.toLowerCase().includes('serie')))
    );
    if (comp?.ranking && comp.ranking.length > 0) {
      return comp.ranking.length;
    }
    const fromManagers = state.managers?.filter(m => m.history?.some(h => h.season === season)).length;
    if (fromManagers && fromManagers > 0) {
      return fromManagers;
    }
    const record = history.find(h => h.season === season);
    return typeof record?.rank === 'number' ? Math.max(record.rank, 8) : 12;
  };

  // Helper to dynamically retrieve the last rank of a championship season
  const getSeasonLastRank = (season: string, fallbackCount: number): number => {
    const comp = state.competitions?.find(
      c => c.season === season && (c.category === 'Campionato' || (c.name && c.name.toLowerCase().includes('serie')))
    );
    if (comp?.ranking && comp.ranking.length > 0) {
      const numericRanks = comp.ranking
        .map(r => r.rank)
        .filter((rk): rk is number => typeof rk === 'number' && rk > 0);
      if (numericRanks.length > 0) {
        return Math.max(...numericRanks);
      }
    }
    return fallbackCount;
  };

  // Neutral mid-level Y position for unranked/unrecorded seasons (e.g. 2020/21 or missing seasons)
  const yND = getY(6.5);

  const points = allSeasons.map((season, idx) => {
    const record = historyMap.get(season);
    const isRanked = Boolean(
      record &&
      !record.in_progress &&
      (record as any).status !== 'in_progress' &&
      typeof record.rank === 'number' &&
      (record.rank as number) > 0
    );
    const teamCount = getSeasonTeamCount(season);
    const lastRank = getSeasonLastRank(season, teamCount);
    const hasSpoon = Boolean(record?.achievements?.some(a => a.badge === 'spoon'));
    const isLastPlace = isRanked && (hasSpoon || ((record!.rank as number) > 3 && (record!.rank as number) >= lastRank));
    return {
      x: getX(idx, allSeasons.length),
      y: isRanked ? getY(record!.rank as number) : yND,
      season,
      rank: isRanked ? (record!.rank as number) : null,
      isRanked,
      team: record?.team || '',
      score: record?.points,
      teamCount,
      isLastPlace
    };
  });

  // Build trajectory paths: solid for ranked consecutive segments, dashed when connecting to/from N/D
  let pathsSvg = '';
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const isDashed = !p1.isRanked || !p2.isRanked;
    const strokeAttr = isDashed
      ? 'stroke="#94a3b8" stroke-width="1.8" stroke-dasharray="3,3" stroke-opacity="0.65"'
      : 'stroke="var(--accent-color, #f59e0b)" stroke-width="2.5" stroke-linecap="round"';
    pathsSvg += `<path d="M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}" fill="none" ${strokeAttr} />\n`;
  }

  const y1 = getY(1);
  const yPodium = getY(3);
  const yLast = getY(maxRank);

  let nodesSvg = '';
  points.forEach(p => {
    const seasonShort = p.season.replace(/^20/, '');

    if (!p.isRanked) {
      const tooltip = `${p.season}: Classifica N/D su ${p.teamCount} squadre (${p.team || 'Partecipante'})`;
      nodesSvg += `
      <g class="cursor-pointer">
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5.5" fill="var(--modal-bg)" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="2,2" />
        <title>${tooltip}</title>
        <text x="${p.x.toFixed(1)}" y="${height - 14}" font-size="9" font-weight="bold" fill="currentColor" opacity="0.75" text-anchor="middle">${seasonShort}</text>
        <text x="${p.x.toFixed(1)}" y="${height - 4}" font-size="7.5" font-weight="semibold" fill="currentColor" opacity="0.45" text-anchor="middle">${p.teamCount} sq</text>
        <text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" font-size="8" font-weight="extrabold" fill="#94a3b8" text-anchor="middle">N/D</text>
      </g>
    `;
      return;
    }

    let nodeColor = '#3b82f6';
    let strokeColor = '#1e3a8a';
    let r = 4;
    const label = `#${p.rank}`;

    if (p.rank === 1) {
      nodeColor = '#f59e0b';
      strokeColor = '#b45309';
      r = 6.5;
    } else if (p.rank === 2) {
      nodeColor = '#94a3b8';
      strokeColor = '#475569';
      r = 5.5;
    } else if (p.rank === 3) {
      nodeColor = '#b45309';
      strokeColor = '#78350f';
      r = 5;
    } else if (p.isLastPlace) {
      nodeColor = '#ef4444';
      strokeColor = '#991b1b';
      r = 5.5;
    }

    const scoreText = (typeof p.score === 'number' && p.score > 0) ? ` - ${p.score} pt` : '';
    const spoonSuffix = p.isLastPlace ? ' (Cucchiaio di Legno 🥄)' : '';
    const tooltip = `${p.season}: #${p.rank} su ${p.teamCount} squadre (${p.team})${spoonSuffix}${scoreText}`;
    nodesSvg += `
      <g class="cursor-pointer">
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${nodeColor}" stroke="${strokeColor}" stroke-width="1.5" />
        <title>${tooltip}</title>
        <text x="${p.x.toFixed(1)}" y="${height - 14}" font-size="9" font-weight="bold" fill="currentColor" opacity="0.75" text-anchor="middle">${seasonShort}</text>
        <text x="${p.x.toFixed(1)}" y="${height - 4}" font-size="7.5" font-weight="semibold" fill="currentColor" opacity="0.45" text-anchor="middle">${p.teamCount} sq</text>
        <text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" font-size="9" font-weight="extrabold" fill="${nodeColor}" text-anchor="middle">${label}</text>
      </g>
    `;
  });

  return `
    <svg viewBox="0 0 ${width} ${height}" class="w-full h-auto select-none" style="overflow: visible;">
      <!-- Gridlines -->
      <line x1="${padding.left}" y1="${y1.toFixed(1)}" x2="${width - padding.right}" y2="${y1.toFixed(1)}" stroke="#f59e0b" stroke-opacity="0.25" stroke-dasharray="2,2" stroke-width="1" />
      <text x="${padding.left - 4}" y="${(y1 + 3).toFixed(1)}" font-size="8" font-weight="bold" fill="#f59e0b" opacity="0.75" text-anchor="end">1°</text>

      <line x1="${padding.left}" y1="${yPodium.toFixed(1)}" x2="${width - padding.right}" y2="${yPodium.toFixed(1)}" stroke="#b45309" stroke-opacity="0.15" stroke-dasharray="2,2" stroke-width="1" />
      <text x="${padding.left - 4}" y="${(yPodium + 3).toFixed(1)}" font-size="8" font-weight="bold" fill="#b45309" opacity="0.6" text-anchor="end">3°</text>

      <line x1="${padding.left}" y1="${yLast.toFixed(1)}" x2="${width - padding.right}" y2="${yLast.toFixed(1)}" stroke="#ef4444" stroke-opacity="0.2" stroke-dasharray="2,2" stroke-width="1" />
      <text x="${padding.left - 4}" y="${(yLast + 3).toFixed(1)}" font-size="8" font-weight="bold" fill="#ef4444" opacity="0.6" text-anchor="end">${maxRank}°</text>

      <!-- Trajectory Paths -->
      ${pathsSvg}

      <!-- Nodes -->
      ${nodesSvg}
    </svg>
  `;
}
