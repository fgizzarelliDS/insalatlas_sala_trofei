import { state } from '@/state';

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

  const scudettiEl = document.getElementById('stat-total-scudetti');
  const cupsEl = document.getElementById('stat-total-cups');
  const mundialitoEl = document.getElementById('stat-total-mundialito');
  const spoonsEl = document.getElementById('stat-total-spoons');
  const cartonatiEl = document.getElementById('stat-total-cartonati');

  if (scudettiEl) scudettiEl.textContent = String(totalScudetti);
  if (cupsEl) cupsEl.textContent = String(totalCups);
  if (mundialitoEl) mundialitoEl.textContent = String(totalMundialito);
  if (spoonsEl) spoonsEl.textContent = String(totalSpoons);
  if (cartonatiEl) cartonatiEl.textContent = String(totalCartonati);
}
