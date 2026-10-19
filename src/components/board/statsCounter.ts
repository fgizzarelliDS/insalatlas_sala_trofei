import { state } from '@/state';
import { LEAGUE, getActiveCompetitions } from '@/config';
import { getAvailableSeasons } from './seasons/seasonSelector';
import { getManagerTrophyCount } from '@/score';

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
 * Grouping cup and supercup into the canonical "Coppe & Supercoppe" card to maintain the single-row 6-card layout.
 */
export function renderTopStatsCards(): void {
  const container = document.getElementById('top-stats-cards-container');
  if (!container) return;

  const activeComps = getActiveCompetitions();
  const hasCup = activeComps.some(c => c.id === 'cup');
  const hasSupercup = activeComps.some(c => c.id === 'supercup');
  const combineCups = hasCup && hasSupercup;

  interface StatCardDef {
    id: string;
    modalTarget: string;
    title: string;
    icon: string;
    badgeStyle: string;
    labelHtml: string;
    counterId: string;
    hasDetail?: boolean;
    featureFlag?: boolean;
  }

  const cards: StatCardDef[] = [
    {
      id: 'seasons',
      modalTarget: 'seasons',
      title: 'Clicca per visualizzare la cronologia e i verdetti di tutte le stagioni',
      icon: '📅',
      badgeStyle: 'bg-indigo-500/20 text-indigo-400',
      labelHtml: 'STAGIONI',
      counterId: 'stat-total-seasons',
      hasDetail: true,
      featureFlag: true
    }
  ];

  if (combineCups) {
    if (activeComps.some(c => c.id === 'championship')) {
      cards.push({
        id: 'championship',
        modalTarget: 'scudetti',
        title: "Clicca per visualizzare l'Albo d'Oro e i podi storici dei Campionati",
        icon: '🥇',
        badgeStyle: 'bg-amber-500/20 text-amber-400',
        labelHtml: 'Scudetti',
        counterId: 'stat-total-scudetti',
        featureFlag: true
      });
    }

    cards.push({
      id: 'cups',
      modalTarget: 'cups',
      title: "Clicca per visualizzare l'Albo d'Oro e le finali di Coppa e Supercoppa",
      icon: '🏆',
      badgeStyle: 'bg-blue-500/20 text-blue-400',
      labelHtml: 'Coppe &amp;<br>Supercoppe',
      counterId: 'stat-total-cups',
      featureFlag: LEAGUE.features.cup || LEAGUE.features.supercup
    });

    if (activeComps.some(c => c.id === 'mundialito')) {
      cards.push({
        id: 'mundialito',
        modalTarget: 'mundialito',
        title: "Clicca per visualizzare l'Albo d'Oro e i finalisti del Mundialito",
        icon: '🌍',
        badgeStyle: 'bg-amber-700/20 text-amber-500',
        labelHtml: 'Mundialito',
        counterId: 'stat-total-mundialito',
        featureFlag: LEAGUE.features.mundialito
      });
    }

    if (activeComps.some(c => c.id === 'spoon')) {
      cards.push({
        id: 'spoon',
        modalTarget: 'spoons',
        title: 'Clicca per visualizzare il Muro dei Cucchiai di Legno (ultimi posti)',
        icon: '🥄',
        badgeStyle: 'bg-amber-800/20 text-amber-500',
        labelHtml: 'Cucchiai Legno',
        counterId: 'stat-total-spoons',
        featureFlag: LEAGUE.features.spoon
      });
    }

    if (activeComps.some(c => c.id === 'cartonato')) {
      cards.push({
        id: 'cartonato',
        modalTarget: 'cartonato',
        title: "Clicca per visualizzare l'Albo dei Cartonati e Playout",
        icon: '📦',
        badgeStyle: 'bg-blue-900/30 text-blue-400',
        labelHtml: 'Banner Cartonato',
        counterId: 'stat-total-cartonati',
        featureFlag: LEAGUE.features.cartonato
      });
    }

    const standardIds = new Set(['championship', 'cup', 'supercup', 'mundialito', 'spoon', 'cartonato']);
    for (const comp of activeComps) {
      if (!standardIds.has(comp.id)) {
        cards.push({
          id: comp.id,
          modalTarget: comp.id,
          title: `Clicca per visualizzare l'Albo d'Oro di ${comp.name}`,
          icon: comp.cardIcon || '🏆',
          badgeStyle: comp.cardBadgeStyle || 'bg-amber-500/20 text-amber-400',
          labelHtml: comp.shortName,
          counterId: `stat-total-${comp.id}`,
          featureFlag: comp.enabled !== false
        });
      }
    }
  } else {
    for (const comp of activeComps) {
      const icon = comp.cardIcon || (comp.id === 'championship' ? '🥇' : comp.id === 'cup' ? '🏆' : comp.id === 'supercup' ? '⭐' : comp.id === 'mundialito' ? '🌍' : comp.id === 'spoon' ? '🥄' : comp.id === 'cartonato' ? '📦' : '🏆');
      const badgeStyle = comp.cardBadgeStyle || (comp.id === 'championship' ? 'bg-amber-500/20 text-amber-400' : comp.id === 'cup' ? 'bg-blue-500/20 text-blue-400' : comp.id === 'supercup' ? 'bg-yellow-500/20 text-yellow-400' : comp.id === 'mundialito' ? 'bg-amber-700/20 text-amber-500' : comp.id === 'spoon' ? 'bg-amber-800/20 text-amber-500' : comp.id === 'cartonato' ? 'bg-blue-900/30 text-blue-400' : 'bg-amber-500/20 text-amber-400');
      const counterId = comp.id === 'championship' ? 'stat-total-scudetti' : comp.id === 'spoon' ? 'stat-total-spoons' : comp.id === 'cartonato' ? 'stat-total-cartonati' : `stat-total-${comp.id}`;
      const modalTarget = comp.id === 'championship' ? 'scudetti' : comp.id === 'spoon' ? 'spoons' : comp.id;

      cards.push({
        id: comp.id,
        modalTarget,
        title: `Clicca per visualizzare l'Albo d'Oro di ${comp.name}`,
        icon,
        badgeStyle,
        labelHtml: comp.shortName,
        counterId,
        featureFlag: comp.enabled !== false
      });
    }
  }

  const numCards = cards.length;
  let lgColsClass = 'lg:grid-cols-6';
  if (numCards >= 7) {
    lgColsClass = 'lg:grid-cols-4';
  } else if (numCards === 5) {
    lgColsClass = 'lg:grid-cols-5';
  } else if (numCards === 4) {
    lgColsClass = 'lg:grid-cols-4';
  } else if (numCards <= 3) {
    lgColsClass = 'lg:grid-cols-3';
  }

  container.className = `grid grid-cols-2 sm:grid-cols-3 ${lgColsClass} gap-3 sm:gap-4 mb-6 max-w-5xl mx-auto`;

  container.innerHTML = cards.map(c => `
    <div onclick="window.openTrophyModal && window.openTrophyModal('${c.modalTarget}')"
      title="${c.title}"
      class="h-[76px] sm:h-[82px] px-3 py-2.5 rounded-2xl albo-table-wrap flex items-center gap-2.5 sm:gap-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-95 hover:border-amber-500/50 shadow-sm group">
      <div
        class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${c.badgeStyle} flex items-center justify-center text-base sm:text-lg font-black shrink-0 transition-transform group-hover:scale-110">
        ${c.icon}</div>
      <div class="min-w-0 flex-1 flex flex-col justify-center text-center">
        <div id="${c.counterId}" class="font-sport font-extrabold text-lg sm:text-xl leading-none"
          style="color: var(--text-main);">0</div>
        <div class="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mt-1 leading-tight"
          style="color: var(--text-muted);">
          ${c.labelHtml}
        </div>
        ${c.hasDetail ? '<div id="stat-seasons-detail" class="text-[9px] font-semibold lowercase opacity-75 mt-0.5 leading-tight"></div>' : ''}
      </div>
    </div>
  `).join('');

  updateStatistics();
}

