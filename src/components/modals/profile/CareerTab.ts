import type { Manager } from '@/types';
import { state } from '@/state';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import { renderRankTrajectorySparkline } from './SparklineChart';

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
      if (s.in_progress || (s as any).status === 'in_progress') {
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
