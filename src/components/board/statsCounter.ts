import { state } from '@/state';
import { LEAGUE, getActiveCompetitions } from '@/config';
import { getAvailableSeasons } from './seasons/seasonSelector';
import { getManagerTrophyCount } from '@/score';
import type { CompetitionDefinition } from '@/types';

/**
 * Recalculates and updates header summary counters
 */
export function updateStatistics(): void {
  let totalScudetti = 0;
  let totalCups = 0;
  let totalMundialito = 0;
  let totalSpoons = 0;
  let totalCartonati = 0;

  state.managers.forEach(m => {
    totalScudetti += getManagerTrophyCount(m, 'championship', 'gold');
    totalCups += getManagerTrophyCount(m, 'cup', 'gold') + getManagerTrophyCount(m, 'supercup', 'gold');
    totalMundialito += getManagerTrophyCount(m, 'mundialito', 'gold');
    totalSpoons += getManagerTrophyCount(m, 'spoon', 'gold');
    totalCartonati += getManagerTrophyCount(m, 'cartonato', 'gold');
  });

  const seasons = getAvailableSeasons();
  const totalSeasons = seasons.length;
  const inProgressSeasons = seasons.filter(s =>
    state.competitions.some(c => c.season === s && (c.in_progress || c.status === 'in_progress'))
  ).length;
  const completedSeasons = totalSeasons - inProgressSeasons;

  const seasonsEl = document.getElementById('stat-total-seasons');
  const seasonsDetailEl = document.getElementById('stat-seasons-detail');
  const scudettiEl = document.getElementById('stat-total-scudetti');
  const cupsEl = document.getElementById('stat-total-cups');
  const mundialitoEl = document.getElementById('stat-total-mundialito');
  const spoonsEl = document.getElementById('stat-total-spoons');
  const cartonatiEl = document.getElementById('stat-total-cartonati');

  if (seasonsEl) seasonsEl.textContent = String(totalSeasons);
  if (seasonsDetailEl) {
    if (inProgressSeasons > 0) {
      seasonsDetailEl.textContent = `(${completedSeasons} + ${inProgressSeasons} in corso)`;
    } else {
      seasonsDetailEl.textContent = '';
    }
  }
  if (scudettiEl) scudettiEl.textContent = String(totalScudetti);
  if (cupsEl) {
    cupsEl.textContent = String(totalCups);
    const card = cupsEl.closest?.('.albo-table-wrap') as HTMLElement | null;
    if (card) card.style.display = (LEAGUE.features.cup || LEAGUE.features.supercup) ? '' : 'none';
  }
  if (mundialitoEl) {
    mundialitoEl.textContent = String(totalMundialito);
    const card = mundialitoEl.closest?.('.albo-table-wrap') as HTMLElement | null;
    if (card) card.style.display = LEAGUE.features.mundialito ? '' : 'none';
  }
  if (spoonsEl) {
    spoonsEl.textContent = String(totalSpoons);
    const card = spoonsEl.closest?.('.albo-table-wrap') as HTMLElement | null;
    if (card) card.style.display = LEAGUE.features.spoon ? '' : 'none';
  }
  if (cartonatiEl) {
    cartonatiEl.textContent = String(totalCartonati);
    const card = cartonatiEl.closest?.('.albo-table-wrap') as HTMLElement | null;
    if (card) card.style.display = LEAGUE.features.cartonato ? '' : 'none';
  }

  // Also update individual competition counter elements: stat-total-${comp.id}
  for (const comp of getActiveCompetitions()) {
    const el = document.getElementById(`stat-total-${comp.id}`);
    if (el) {
      const count = state.managers.reduce((sum, m) => sum + getManagerTrophyCount(m, comp.id, 'gold'), 0);
      el.textContent = String(count);
    }
  }
}

/**
 * Dynamically renders the top summary cards based on the active competitions in COMPETITION_REGISTRY
 */
export function renderTopStatsCards(): void {
  const container = document.getElementById('top-stats-cards-container');
  if (!container) return;

  const activeComps = getActiveCompetitions();
  const numCards = 1 + activeComps.length;

  container.className = `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-${Math.min(numCards, 6)} gap-3 sm:gap-4 mb-6 max-w-5xl mx-auto`;

  const getCompCardIcon = (comp: CompetitionDefinition): string => {
    if (comp.id === 'championship') return '🥇';
    if (comp.id === 'cup') return '🏆';
    if (comp.id === 'supercup') return '⭐';
    if (comp.id === 'mundialito') return '🌍';
    if (comp.id === 'spoon') return '🥄';
    if (comp.id === 'cartonato') return '📦';
    if (comp.type === 'dishonor') return '🥄';
    return '🏆';
  };

  const getCompCardBadgeStyle = (comp: CompetitionDefinition): string => {
    if (comp.id === 'championship') return 'bg-amber-500/20 text-amber-400';
    if (comp.id === 'cup') return 'bg-blue-500/20 text-blue-400';
    if (comp.id === 'supercup') return 'bg-yellow-500/20 text-yellow-400';
    if (comp.id === 'mundialito') return 'bg-amber-700/20 text-amber-500';
    if (comp.id === 'spoon') return 'bg-amber-800/20 text-amber-500';
    if (comp.id === 'cartonato') return 'bg-blue-900/30 text-blue-400';
    return 'bg-amber-500/20 text-amber-400';
  };

  const seasonsCardHTML = `
    <!-- Card 0: Stagioni Totali -->
    <div onclick="window.openTrophyModal && window.openTrophyModal('seasons')"
      title="Clicca per visualizzare la cronologia e i verdetti di tutte le stagioni"
      class="h-[76px] sm:h-[82px] px-3 py-2.5 rounded-2xl albo-table-wrap flex items-center gap-2.5 sm:gap-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-95 hover:border-amber-500/50 shadow-sm group">
      <div
        class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-base sm:text-lg font-black shrink-0 transition-transform group-hover:scale-110">
        📅</div>
      <div class="min-w-0 flex-1 flex flex-col justify-center text-center">
        <div id="stat-total-seasons" class="font-sport font-extrabold text-lg sm:text-xl leading-none"
          style="color: var(--text-main);">0</div>
        <div class="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mt-1 leading-tight"
          style="color: var(--text-muted);">
          STAGIONI
        </div>
        <div id="stat-seasons-detail" class="text-[9px] font-semibold lowercase opacity-75 mt-0.5 leading-tight"></div>
      </div>
    </div>
  `;

  const compCardsHTML = activeComps.map(comp => {
    const icon = getCompCardIcon(comp);
    const badgeStyle = getCompCardBadgeStyle(comp);
    const counterId = comp.id === 'championship'
      ? 'stat-total-scudetti'
      : comp.id === 'spoon'
      ? 'stat-total-spoons'
      : comp.id === 'cartonato'
      ? 'stat-total-cartonati'
      : `stat-total-${comp.id}`;

    return `
      <div onclick="window.openTrophyModal && window.openTrophyModal('${comp.id}')"
        title="Clicca per visualizzare l'Albo d'Oro di ${comp.name}"
        class="h-[76px] sm:h-[82px] px-3 py-2.5 rounded-2xl albo-table-wrap flex items-center gap-2.5 sm:gap-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-95 hover:border-amber-500/50 shadow-sm group">
        <div
          class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${badgeStyle} flex items-center justify-center text-base sm:text-lg font-black shrink-0 transition-transform group-hover:scale-110">
          ${icon}</div>
        <div class="min-w-0 flex-1 flex flex-col justify-center text-center">
          <div id="${counterId}" class="font-sport font-extrabold text-lg sm:text-xl leading-none"
            style="color: var(--text-main);">0</div>
          <div class="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mt-1 leading-tight"
            style="color: var(--text-muted);">
            ${comp.shortName}
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = seasonsCardHTML + compCardsHTML;
  updateStatistics();
}

