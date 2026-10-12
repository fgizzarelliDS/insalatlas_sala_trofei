import { state } from '@/state';
import { getAvailableSeasons, renderSeasonPills, renderSeasonHeaderSummary } from './seasonSelector';
import { renderChampionshipTable } from './standingsTable';
import { renderOtherTournamentsSection } from './tournamentCards';

export * from './seasonSelector';
export * from './standingsTable';
export * from './tournamentCards';

let currentSelectedSeason: string | null = null;

/**
 * Switches the main view between Albo d'Oro and Archivio Stagioni & Classifiche
 */
export function switchMainViewTab(tab: 'albo' | 'seasons'): void {
  const alboContent = document.getElementById('main-tab-albo-content');
  const seasonsContent = document.getElementById('main-tab-seasons-content');
  const btnAlbo = document.getElementById('main-tab-btn-albo');
  const btnSeasons = document.getElementById('main-tab-btn-seasons');

  const activeBtnClass =
    'flex-1 sm:flex-initial justify-center sm:justify-start px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm bg-amber-500 text-slate-950';
  const inactiveBtnClass =
    'flex-1 sm:flex-initial justify-center sm:justify-start px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-1.5 border border-transparent';

  if (tab === 'albo') {
    alboContent?.classList.remove('hidden');
    seasonsContent?.classList.add('hidden');
    if (btnAlbo) {
      btnAlbo.className = activeBtnClass;
      btnAlbo.style.color = '#020617';
    }
    if (btnSeasons) {
      btnSeasons.className = inactiveBtnClass;
      btnSeasons.style.color = 'var(--text-main)';
    }
  } else {
    alboContent?.classList.add('hidden');
    seasonsContent?.classList.remove('hidden');
    if (btnSeasons) {
      btnSeasons.className = activeBtnClass;
      btnSeasons.style.color = '#020617';
    }
    if (btnAlbo) {
      btnAlbo.className = inactiveBtnClass;
      btnAlbo.style.color = 'var(--text-main)';
    }
    renderSeasonsArchive();
  }
}

/**
 * Sets active archive season and updates view
 */
export function selectArchiveSeason(season: string): void {
  currentSelectedSeason = season;
  renderSeasonsArchive();
}

/**
 * Renders the full seasonal tournament archive view
 */
export function renderSeasonsArchive(): void {
  const container = document.getElementById('main-tab-seasons-content');
  if (!container) return;

  const seasons = getAvailableSeasons();
  if (seasons.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-sm font-bold opacity-60 italic">
        Nessun dato sulle stagioni archiviato.
      </div>
    `;
    return;
  }

  if (!currentSelectedSeason || !seasons.includes(currentSelectedSeason)) {
    currentSelectedSeason = seasons[0];
  }

  // 1. Season Pills Bar
  const pillsHtml = renderSeasonPills(seasons, currentSelectedSeason);

  // 2. Competitions in current season
  const comps = (state.competitions || []).filter(c => c.season === currentSelectedSeason);

  // Separate into Championship vs Other tournaments
  const championship = comps.find(c => c.category === 'championship' || /serie\s*atlas|campionato/i.test(c.name));
  const otherTournaments = comps.filter(c => c !== championship);

  // Season Header Summary
  const totalTeams = championship?.ranking?.length || comps[0]?.ranking?.length || 0;
  const seasonSummaryHtml = renderSeasonHeaderSummary(currentSelectedSeason, comps.length, totalTeams);

  // Render Championship Standings Table
  const championshipHtml = championship ? renderChampionshipTable(championship) : '';

  // Render Other Tournaments (Cups, Supercups, Mundialito, Playout)
  const othersHtml = renderOtherTournamentsSection(otherTournaments);

  container.innerHTML = `
    <!-- Season Pills Bar -->
    ${pillsHtml}

    <!-- Season Header -->
    ${seasonSummaryHtml}

    <!-- Championship Standings -->
    ${championshipHtml}

    <!-- Other Competitions Grid -->
    ${othersHtml}
  `;
}

// Global window assignments for inline HTML handlers
if (typeof window !== 'undefined') {
  (window as unknown as { switchMainViewTab?: typeof switchMainViewTab }).switchMainViewTab = switchMainViewTab;
  (window as unknown as { selectArchiveSeason?: typeof selectArchiveSeason }).selectArchiveSeason = selectArchiveSeason;
  (window as unknown as { renderSeasonsArchive?: typeof renderSeasonsArchive }).renderSeasonsArchive = renderSeasonsArchive;
}
