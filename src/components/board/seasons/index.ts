import { state } from '@/state';
import { getAvailableSeasons, renderSeasonPills, renderSeasonHeaderSummary } from './seasonSelector';
import { renderChampionshipTable } from './standingsTable';
import { renderOtherTournamentsSection } from './tournamentCards';

export * from './seasonSelector';
export * from './standingsTable';
export * from './tournamentCards';

import { renderRecordsTab } from '@/components/board/records';

let currentSelectedSeason: string | null = null;

export function getCurrentSelectedSeason(): string | null {
  return currentSelectedSeason;
}

export function setCurrentSelectedSeason(season: string | null): void {
  currentSelectedSeason = season ? season.replace('-', '/') : null;
}

/**
 * Switches the main view between Albo d'Oro, Archivio Stagioni & Classifiche, and Record & Primati Storici
 */
export function switchMainViewTab(tab: 'albo' | 'seasons' | 'records', updateHistory = true): void {
  const alboContent = document.getElementById('main-tab-albo-content');
  const seasonsContent = document.getElementById('main-tab-seasons-content');
  const recordsContent = document.getElementById('main-tab-records-content');

  const btnAlbo = document.getElementById('main-tab-btn-albo');
  const btnSeasons = document.getElementById('main-tab-btn-seasons');
  const btnRecords = document.getElementById('main-tab-btn-records');

  const activeBtnClass =
    'flex-1 sm:flex-initial justify-center sm:justify-start px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm bg-amber-500 text-slate-950 font-black';
  const inactiveBtnClass =
    'flex-1 sm:flex-initial justify-center sm:justify-start px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-1.5 border border-transparent';

  // Reset all buttons
  [btnAlbo, btnSeasons, btnRecords].forEach(btn => {
    if (btn) {
      btn.className = inactiveBtnClass;
      btn.style.color = 'var(--text-main)';
    }
  });

  // Hide all content containers
  alboContent?.classList.add('hidden');
  seasonsContent?.classList.add('hidden');
  recordsContent?.classList.add('hidden');

  if (tab === 'albo') {
    alboContent?.classList.remove('hidden');
    if (btnAlbo) {
      btnAlbo.className = activeBtnClass;
      btnAlbo.style.color = '#020617';
    }
  } else if (tab === 'seasons') {
    seasonsContent?.classList.remove('hidden');
    if (btnSeasons) {
      btnSeasons.className = activeBtnClass;
      btnSeasons.style.color = '#020617';
    }
    renderSeasonsArchive();
  } else if (tab === 'records') {
    recordsContent?.classList.remove('hidden');
    if (btnRecords) {
      btnRecords.className = activeBtnClass;
      btnRecords.style.color = '#020617';
    }
    renderRecordsTab();
  }

  // Synchronize browser URL and history
  if (updateHistory && typeof window !== 'undefined' && window.location) {
    try {
      const url = new URL(window.location.href);
      if (tab === 'albo') {
        url.searchParams.delete('tab');
        url.searchParams.delete('season');
        url.searchParams.delete('record');
        url.searchParams.delete('category');
        url.searchParams.delete('cat');
      } else if (tab === 'seasons') {
        url.searchParams.set('tab', 'seasons');
        url.searchParams.delete('record');
        url.searchParams.delete('category');
        url.searchParams.delete('cat');
        if (currentSelectedSeason) {
          url.searchParams.set('season', currentSelectedSeason.replace('/', '-'));
        }
      } else if (tab === 'records') {
        url.searchParams.set('tab', 'records');
        url.searchParams.delete('season');
      }

      if (url.search !== window.location.search) {
        window.history.pushState({ tab, season: currentSelectedSeason }, '', url.toString());
      }
    } catch {
      // Ignored in non-standard / mocked environments
    }
  }
}

/**
 * Sets active archive season and updates view
 */
export function selectArchiveSeason(season: string, updateHistory = true): void {
  currentSelectedSeason = season.replace('-', '/');
  renderSeasonsArchive();

  if (updateHistory && typeof window !== 'undefined' && window.location) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'seasons');
      url.searchParams.set('season', currentSelectedSeason.replace('/', '-'));
      window.history.replaceState({ tab: 'seasons', season: currentSelectedSeason }, '', url.toString());
    } catch {
      // Ignored in non-standard / mocked environments
    }
  }
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
  const isSeasonInProgress = comps.some(c => c.in_progress || c.status === 'in_progress');
  const seasonSummaryHtml = renderSeasonHeaderSummary(currentSelectedSeason, comps.length, totalTeams, isSeasonInProgress);

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
