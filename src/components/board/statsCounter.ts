import { state } from '@/state';
import { LEAGUE } from '@/config';
import { getAvailableSeasons } from './seasons/seasonSelector';

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
    totalScudetti += m.gold || 0;
    totalCups += (m.cup_gold || 0) + (m.supercup || 0);
    totalMundialito += m.mundialito || 0;
    totalSpoons += m.spoon || 0;
    totalCartonati += m.cartonato || 0;
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
}
