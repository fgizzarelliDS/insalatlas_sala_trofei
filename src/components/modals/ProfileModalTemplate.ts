import type { Manager, TradingCardBadge, SeasonRecord } from '@/types';
import { state } from '@/state';
import { formatScore } from '@/score';
import { renderTrophySVG, renderCoachBanner } from '@/trophies';
import { getManagerArchetype, computeTailRiskProfile } from '@/analytics';

/**
 * Updates DOM elements for vital stats, badges, and trophy shelf inside the profile modal
 */
export function populateProfileModalDOM(m: Manager, score: number, totalMajor: number, successRate: number): void {
  // 1. Vital stats
  const nameEl = document.getElementById('profile-name');
  const yearsEl = document.getElementById('profile-years-badge');
  const scoreEl = document.getElementById('profile-score');
  const rateEl = document.getElementById('profile-success-rate');
  const totalEl = document.getElementById('profile-total-titles');

  if (nameEl) nameEl.textContent = m.name;
  if (yearsEl) yearsEl.textContent = `${m.years} ${m.years === 1 ? 'Stagione disputata' : 'Stagioni disputate'}`;
  if (scoreEl) scoreEl.textContent = `${formatScore(score)} pt`;
  if (rateEl) rateEl.textContent = `${successRate}%`;
  if (totalEl) totalEl.textContent = String(totalMajor);

  // 2. Honorary Badges
  const badgesContainer = document.getElementById('profile-badges-container');
  if (badgesContainer) {
    badgesContainer.innerHTML = '';
    const badges: TradingCardBadge[] = [];

    // Behavioral Archetype Badge from Analytics
    const efficiency = m.years > 0 ? parseFloat((totalMajor / m.years).toFixed(2)) : 0;
    const arch = getManagerArchetype(m, totalMajor, efficiency);
    badges.push({
      label: `Profilo: ${arch.tag}`,
      icon: arch.icon,
      color: '',
      customStyle: `background: ${arch.color}25; color: ${arch.color}; border: 1px solid ${arch.color}50;`
    });

    // Net Tail Risk (NTI) Behavioral Badge
    const risk = computeTailRiskProfile(m);
    badges.push({
      label: `Rischio: ${risk.label}`,
      icon: risk.icon,
      color: '',
      customStyle: `background: ${risk.color}25; color: ${risk.color}; border: 1px solid ${risk.color}50;`
    });

    if (m.years >= 8) {
      badges.push({
        label: 'Veterano della Lega',
        icon: 'fa-shield-halved',
        color: 'bg-indigo-900/60 text-indigo-300 border-indigo-700/60'
      });
    }
    if (totalMajor >= 4) {
      badges.push({
        label: 'Re dei Titoli',
        icon: 'fa-crown',
        color: 'bg-amber-900/60 text-amber-300 border-amber-600/60'
      });
    }
    if ((m.gold || 0) >= 2) {
      badges.push({
        label: 'Campione Seriale',
        icon: 'fa-star',
        color: 'bg-yellow-900/60 text-yellow-300 border-yellow-600/60'
      });
    }
    if ((m.cup_gold || 0) + (m.supercup || 0) >= 3) {
      badges.push({
        label: 'Re delle Coppe',
        icon: 'fa-trophy',
        color: 'bg-blue-900/60 text-blue-300 border-blue-600/60'
      });
    }
    if ((m.cartonato || 0) > 0) {
      badges.push({
        label: 'Incubo Playout',
        icon: 'fa-skull-crossbones',
        color: 'bg-rose-950/70 text-rose-300 border-rose-700/60'
      });
    }
    if ((m.spoon || 0) >= 2) {
      badges.push({
        label: 'Collezionista di Cucchiai',
        icon: 'fa-utensils',
        color: 'bg-amber-950/80 text-amber-500 border-amber-800/60'
      });
    }

    if (badges.length === 0) {
      badgesContainer.innerHTML =
        '<span class="text-xs opacity-50 italic">Nessun riconoscimento speciale sbloccato.</span>';
    } else {
      badges.forEach(b => {
        const el = document.createElement('span');
        el.className = `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${b.color || ''}`;
        if (b.customStyle) el.style.cssText = b.customStyle;
        el.innerHTML = `<i class="fa-solid ${b.icon}"></i> ${b.label}`;
        badgesContainer.appendChild(el);
      });
    }
  }

  // 3. Graphic Trophy Shelf
  const shelf = document.getElementById('profile-trophy-shelf');
  if (shelf) {
    shelf.innerHTML = '';

    const trophyTypes = [
      { label: 'Scudetti (1° Posto)', count: m.gold || 0, svg: 'gold_cup' },
      { label: 'Secondi Posti', count: m.silver || 0, svg: 'silver_cup' },
      { label: 'Terzi Posti', count: m.bronze || 0, svg: 'bronze_cup' },
      { label: 'Coppe di Lega (Oro)', count: m.cup_gold || 0, svg: 'coppa_gold' },
      { label: 'Coppe di Lega (Argento)', count: m.cup_silver || 0, svg: 'coppa_silver' },
      { label: 'Supercoppe', count: m.supercup || 0, svg: 'supercup' },
      { label: 'Mundialito', count: m.mundialito || 0, svg: 'mundialito' },
      { label: 'Cucchiai di Legno', count: m.spoon || 0, svg: 'wooden_spoon' }
    ];

    trophyTypes.forEach(t => {
      if (t.count > 0) {
        let icons = '';
        for (let i = 0; i < t.count; i++) icons += renderTrophySVG(t.svg);
        shelf.innerHTML += `
          <div class="flex items-center justify-between border-b pb-2 last:border-b-0 gap-2" style="border-color: var(--table-border);">
            <span class="text-xs font-semibold opacity-80 shrink-0">${t.label} (x${t.count})</span>
            <div class="flex items-center gap-1 flex-wrap justify-end">${icons}</div>
          </div>
        `;
      }
    });

    // Cartonati / Playout Banners
    const cartonatiCount = m.cartonato || 0;
    const coaches = m.coach_banners || m.cartonato_coaches || [];
    if (cartonatiCount > 0 || coaches.length > 0) {
      let banners: string[] = [];
      if (coaches.length > 0) {
        banners = coaches.map(c => renderCoachBanner(c));
      } else {
        for (let i = 0; i < cartonatiCount; i++) banners.push(renderCoachBanner('CARTONATO'));
      }
      shelf.innerHTML += `
        <div class="flex items-center justify-between pt-1">
          <span class="text-xs font-semibold opacity-80">Banner Playout</span>
          <div class="flex items-center gap-1.5 flex-wrap justify-end">${banners.join('')}</div>
        </div>
      `;
    }

    if (shelf.innerHTML.trim() === '') {
      shelf.innerHTML = '<div class="text-xs opacity-50 italic py-2 text-center">Bacheca ancora vuota.</div>';
    }
  }

  // 4. Rank Trajectory and Career Timeline
  populateCareerTimeline(m);
}

/**
 * Returns all distinct league seasons sorted chronologically ascending (2016/17 -> 2025/26)
 */
export function getAllLeagueSeasonsChronological(): string[] {
  const seasonsSet = new Set<string>();
  if (state.competitions) {
    state.competitions.forEach(c => {
      if (c.season) seasonsSet.add(c.season);
    });
  }
  if (state.managers) {
    state.managers.forEach(m => {
      m.history?.forEach(h => {
        if (h.season) seasonsSet.add(h.season);
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
 * across the full 10-season timeline, rendering N/D nodes for unrecorded or missing seasons.
 */
export function renderRankTrajectorySparkline(history: SeasonRecord[]): string {
  const rankedSeasons = history.filter(s => typeof s.rank === 'number' && (s.rank as number) > 0);
  if (rankedSeasons.length === 0) return '';

  const allSeasons = getAllLeagueSeasonsChronological();
  const historyMap = new Map<string, SeasonRecord>();
  history.forEach(h => {
    if (h.season) historyMap.set(h.season, h);
  });

  const width = 500;
  const height = 120;
  const padding = { top: 22, right: 30, bottom: 25, left: 34 };
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

  // Neutral mid-level Y position for unranked/unrecorded seasons (e.g. 2020/21 or missing seasons)
  const yND = getY(6.5);

  const points = allSeasons.map((season, idx) => {
    const record = historyMap.get(season);
    const isRanked = typeof record?.rank === 'number' && (record.rank as number) > 0;
    return {
      x: getX(idx, allSeasons.length),
      y: isRanked ? getY(record!.rank as number) : yND,
      season,
      rank: isRanked ? (record!.rank as number) : null,
      isRanked,
      team: record?.team || '',
      score: record?.points
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
      const tooltip = p.team
        ? `${p.season}: Classifica N/D (${p.team})`
        : `${p.season}: Classifica N/D (Non disputata / Dati non disponibili)`;
      nodesSvg += `
      <g class="cursor-pointer">
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5.5" fill="var(--modal-bg)" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="2,2" />
        <title>${tooltip}</title>
        <text x="${p.x.toFixed(1)}" y="${height - 6}" font-size="9" font-weight="bold" fill="currentColor" opacity="0.65" text-anchor="middle">${seasonShort}</text>
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
    } else if (p.rank! >= 11) {
      nodeColor = '#ef4444';
      strokeColor = '#991b1b';
      r = 5;
    }

    const scoreText = (typeof p.score === 'number' && p.score > 0 && p.season !== '2020/21') ? ` - ${p.score} pt` : '';
    nodesSvg += `
      <g class="cursor-pointer">
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${nodeColor}" stroke="${strokeColor}" stroke-width="1.5" />
        <title>${p.season}: #${p.rank} (${p.team})${scoreText}</title>
        <text x="${p.x.toFixed(1)}" y="${height - 6}" font-size="9" font-weight="bold" fill="currentColor" opacity="0.65" text-anchor="middle">${seasonShort}</text>
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
          if (r.logo && !teamsMap.get(key)!.logo) {
            teamsMap.get(key)!.logo = r.logo;
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
          if (entry && !entry.logo) {
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
    countEl.textContent = `${teams.length} ${teams.length === 1 ? 'denominazione' : 'denominazioni'}`;
  }

  listEl.innerHTML = '';
  teams.forEach(team => {
    const chip = document.createElement('span');
    chip.className =
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-sm transition-colors bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';

    const logoHtml = team.logo
      ? `<img src="${team.logo}" alt="${team.name}" class="w-4 h-4 rounded-full object-contain shrink-0 bg-white/20 border border-slate-300 dark:border-slate-600 shadow-sm" onerror="this.outerHTML='<i class=\\\'fa-solid fa-shield text-[10px] text-amber-500 dark:text-amber-400\\\'></i>'">`
      : `<i class="fa-solid fa-shield text-[10px] text-amber-500 dark:text-amber-400"></i>`;

    const seasonsHtml = team.formattedSeasons
      ? `<span class="opacity-60 text-[10px] font-normal tracking-tight">• ${team.formattedSeasons}</span>`
      : '';

    chip.innerHTML = `${logoHtml} <span class="leading-tight">${team.name}</span> ${seasonsHtml}`;
    listEl.appendChild(chip);
  });
}

/**
 * Populates season-by-season career cards with rank badges, points, team names, and trophy chips
 */
export function populateCareerTimeline(m: Manager): void {
  const trajCard = document.getElementById('profile-trajectory-card');
  const trajSparkline = document.getElementById('profile-trajectory-sparkline');
  const timelineCard = document.getElementById('profile-career-timeline-card');
  const timelineContainer = document.getElementById('profile-career-timeline');

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
      if (typeof s.rank === 'number' && s.rank > 0) {
        const hasValidPoints = typeof s.points === 'number' && s.points > 0 && s.season !== '2020/21';
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
        rankBadge = `<span class="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700/50">Partecipante (Dato non archiviato)</span>`;
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
