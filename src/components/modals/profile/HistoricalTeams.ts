/**
 * src/components/modals/profile/HistoricalTeams.ts
 * Manages manager historical aliases, team names, and seasons intervals across career
 */

import type { Manager } from '@/types';
import { state } from '@/state';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import { escapeHtml } from '@/utils/dom';

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
    const logoHtml = `<img src="${resolvedLogo}" alt="${escapeHtml(team.name)}" class="w-4 h-4 rounded-full object-contain shrink-0 bg-white/20 border border-slate-300 dark:border-slate-600 shadow-sm" onerror="this.onerror=null; this.src='${fallbackCrest}'">`;

    const seasonsHtml = team.formattedSeasons
      ? `<span class="opacity-60 text-[10px] font-normal tracking-tight">• ${escapeHtml(team.formattedSeasons)}</span>`
      : '';

    chip.innerHTML = `${logoHtml} <span class="leading-tight">${escapeHtml(team.name)}</span> ${seasonsHtml}`;
    listEl.appendChild(chip);
  });
}
