/**
 * src/components/modals/profile/CareerTab.ts
 * Tab 2 in Manager Profile Modal: Season-by-season career history, rankings, achievements & aliases (Orchestrator)
 */

import type { Manager } from '@/types';
import { renderRankTrajectorySparkline } from './SparklineChart';

// Historical Teams module
import {
  formatSeasonsList,
  getHistoricalTeamDetails,
  getDistinctTeamNames,
  populateHistoricalTeams,
  type HistoricalTeamRecord
} from './HistoricalTeams';

// Profile Elo Sparkline module
import {
  getDefaultProfileEloSeason,
  getProfileEloSeason,
  refreshCareerEloSparkline,
  switchProfileEloSeason,
  setProfileEloRange,
  selectProfileEloPoint,
  showProfileEloHover,
  clearProfileEloHover,
  renderEloTrajectorySparkline,
  updateProfileEloSparklineUI,
  resetProfileEloStateForManager,
  type LockedProfileEloMatch
} from './EloSparklineChart';

// Elo Upsets module
import {
  extractManagerEpicMatches,
  populateEloUpsetsCard,
  type ManagerEpicMatches
} from './EloUpsetsCard';

// Re-exports for consumers, window registry, and unit tests
export {
  formatSeasonsList,
  getHistoricalTeamDetails,
  getDistinctTeamNames,
  populateHistoricalTeams,
  getDefaultProfileEloSeason,
  getProfileEloSeason,
  refreshCareerEloSparkline,
  switchProfileEloSeason,
  setProfileEloRange,
  selectProfileEloPoint,
  showProfileEloHover,
  clearProfileEloHover,
  renderEloTrajectorySparkline,
  updateProfileEloSparklineUI,
  extractManagerEpicMatches,
  populateEloUpsetsCard,
  type HistoricalTeamRecord,
  type LockedProfileEloMatch,
  type ManagerEpicMatches
};

/**
 * Populates season-by-season career cards with rank badges, points, team names, and trophy chips
 */
export function populateCareerTimeline(m: Manager): void {
  const trajCard = document.getElementById('profile-trajectory-card');
  const trajSparkline = document.getElementById('profile-trajectory-sparkline');
  const timelineCard = document.getElementById('profile-career-timeline-card');
  const timelineContainer = document.getElementById('profile-career-timeline');

  // 1. Reset state and update the Elo Trajectory Sparkline & Upsets Card
  resetProfileEloStateForManager(m);
  updateProfileEloSparklineUI(m);
  populateEloUpsetsCard(m);

  if (!m.history || m.history.length === 0) {
    if (trajCard) trajCard.classList.add('hidden');
    if (timelineCard) timelineCard.classList.add('hidden');
    return;
  }

  // 2. Populate Historical Team Names
  populateHistoricalTeams(m);

  // 3. Populate Championship Rank Bump Chart
  if (trajSparkline && trajCard) {
    const sparklineSvg = renderRankTrajectorySparkline(m.history);
    if (sparklineSvg) {
      trajSparkline.innerHTML = sparklineSvg;
      trajCard.classList.remove('hidden');
    } else {
      trajCard.classList.add('hidden');
    }
  }

  // 4. Populate Season-by-Season Career Timeline Cards
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
          rankBadge = `<span class="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-700/25 dark:text-amber-400 dark:border-amber-700/40 shadow-sm">🥉 3° Posto${ptsLabel}</span>`;
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
  window.switchProfileEloSeason = switchProfileEloSeason;
  window.setProfileEloRange = setProfileEloRange;
  window.selectProfileEloPoint = selectProfileEloPoint;
  window.showProfileEloHover = showProfileEloHover;
  window.clearProfileEloHover = clearProfileEloHover;
}
