import type {
  CompetitionRecord,
  CompetitionRankingItem,
  SeasonRecord,
  Achievement
} from '@/types';
import { state } from '@/state';
import { verifyAdminPassword, LEAGUE } from '@/config';
import { showToast, enableEditMode } from '@/ui';
import { saveData } from '@/storage';
import { renderBoard } from '@/components/board/tableBoard';
import { updateStatistics } from '@/components/board/statsCounter';
import { renderSeasonsArchive, selectArchiveSeason } from '@/components/board/seasons';
import { getTeamFallbackCrest } from '@/crests';
import {
  parseFantacalcioText,
  fetchAndParseFantacalcioUrl,
  getManagerHistoricalDefaults,
  type ParsedChampionshipRow
} from '@/utils/fantacalcioParser';
import {
  renderSeasonModalContent,
  renderChampionshipRowsHTML
} from './SeasonModalTemplate';
import { escapeHtml } from '@/utils/dom';

/**
 * Opens the Season Creation modal, prompting for admin password if not yet in edit mode
 */
export async function openSeasonModal(): Promise<void> {
  if (!state.isEditMode) {
    const inputPass = prompt('🔐 Inserisci la Password Amministratore per creare una nuova stagione:');
    if (!inputPass) return;

    const isValid = await verifyAdminPassword(inputPass);
    if (!isValid) {
      showToast('❌ Password errata. Accesso negato.', 'error');
      return;
    }

    enableEditMode();
  }

  const modal = document.getElementById('season-modal');
  const content = document.getElementById('season-modal-content');

  if (content) {
    content.innerHTML = renderSeasonModalContent(12);
    populateAllDatalists(12);
  }

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

/**
 * Closes the Season Creation modal
 */
export function closeSeasonModal(): void {
  const modal = document.getElementById('season-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

/**
 * Populates historical team datalists for all active rows
 */
function populateAllDatalists(teamCount: number): void {
  for (let i = 1; i <= teamCount; i++) {
    const selectEl = document.getElementById(`season-manager-${i}`) as HTMLSelectElement | null;
    const datalistEl = document.getElementById(`season-team-list-${i}`);
    if (selectEl && selectEl.value && datalistEl) {
      const defaults = getManagerHistoricalDefaults(selectEl.value, state.managers, state.competitions);
      datalistEl.innerHTML = defaults.allTeams.map(t => `<option value="${escapeHtml(t)}"></option>`).join('');
    }
  }
}

/**
 * Handles dropdown change on manager selection, auto-populating team name, coach alias, and datalist
 */
export function handleManagerSelectChange(rowIdx: number, managerId: string): void {
  const teamInput = document.getElementById(`season-team-${rowIdx}`) as HTMLInputElement | null;
  const coachInput = document.getElementById(`season-coach-${rowIdx}`) as HTMLInputElement | null;
  const datalistEl = document.getElementById(`season-team-list-${rowIdx}`);
  const selectEl = document.getElementById(`season-manager-${rowIdx}`) as HTMLSelectElement | null;

  if (selectEl) {
    selectEl.classList.remove('border-amber-500', 'ring-1', 'ring-amber-500/40');
  }

  if (!managerId) {
    if (datalistEl) datalistEl.innerHTML = '';
    return;
  }

  const defaults = getManagerHistoricalDefaults(managerId, state.managers, state.competitions);

  // Auto-fill latest team name if empty
  if (teamInput && !teamInput.value.trim() && defaults.latestTeam) {
    teamInput.value = defaults.latestTeam;
  }

  // Auto-fill coach alias if empty
  if (coachInput && !coachInput.value.trim() && defaults.coach) {
    coachInput.value = defaults.coach;
  }

  // Populate datalist with all historical teams
  if (datalistEl) {
    datalistEl.innerHTML = defaults.allTeams.map(t => `<option value="${escapeHtml(t)}"></option>`).join('');
  }
}

/**
 * Updates team count and re-renders table rows, preserving any already entered input values
 */
export function changeSeasonTeamCount(newCountStr: string): void {
  const newCount = parseInt(newCountStr, 10);
  if (isNaN(newCount) || newCount < 4) return;

  const tbody = document.getElementById('season-standings-tbody');
  if (!tbody) return;

  // Snapshot current values
  const currentRows: ParsedChampionshipRow[] = [];
  const existingRows = tbody.querySelectorAll('tr');
  existingRows.forEach((_, idx) => {
    const i = idx + 1;
    const teamInput = document.getElementById(`season-team-${i}`) as HTMLInputElement | null;
    const coachInput = document.getElementById(`season-coach-${i}`) as HTMLInputElement | null;
    const mgrSelect = document.getElementById(`season-manager-${i}`) as HTMLSelectElement | null;
    const ptsInput = document.getElementById(`season-points-${i}`) as HTMLInputElement | null;

    currentRows.push({
      rank: i,
      teamName: teamInput?.value || '',
      coachName: coachInput?.value || '',
      matchedManagerId: mgrSelect?.value || undefined,
      points: ptsInput?.value ? parseFloat(ptsInput.value) : 0
    });
  });

  tbody.innerHTML = renderChampionshipRowsHTML(newCount, currentRows);
  populateAllDatalists(newCount);
}

/**
 * Parses pasted Fantacalcio text (CSV, TSV, vertical, or regex) and auto-populates the form
 */
export function handleFantacalcioPasteParse(): void {
  const textarea = document.getElementById('season-fanta-paste') as HTMLTextAreaElement | null;
  if (!textarea || !textarea.value.trim()) {
    showToast('Incolla prima il testo o la classifica da Fantacalcio.', 'error');
    return;
  }

  const parsed = parseFantacalcioText(textarea.value, state.managers);
  if (!parsed.rows || parsed.rows.length === 0) {
    showToast('Impossibile estrarre la classifica dal testo incollato. Verifica il formato.', 'error');
    return;
  }

  // Auto-fill Season Year if detected
  const yearInput = document.getElementById('season-field-year') as HTMLInputElement | null;
  if (yearInput && parsed.season) {
    yearInput.value = parsed.season;
  }

  // Auto-fill Competition Name if detected
  const compNameInput = document.getElementById('season-field-comp-name') as HTMLInputElement | null;
  if (compNameInput && parsed.competitionName) {
    compNameInput.value = parsed.competitionName;
  }

  // Auto-fill League URL if detected
  const urlInput = document.getElementById('season-fanta-url') as HTMLInputElement | null;
  if (urlInput && parsed.leagueUrl) {
    urlInput.value = parsed.leagueUrl;
  }

  // Update Team Count selector
  const countSelect = document.getElementById('season-field-team-count') as HTMLSelectElement | null;
  const count = parsed.rows.length;
  if (countSelect) {
    // Add custom option if not in [8, 10, 12, 14, 16]
    const exists = Array.from(countSelect.options).some(o => o.value === String(count));
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = String(count);
      opt.textContent = `${count} Squadre`;
      countSelect.appendChild(opt);
    }
    countSelect.value = String(count);
  }

  // Render rows
  const tbody = document.getElementById('season-standings-tbody');
  if (tbody) {
    tbody.innerHTML = renderChampionshipRowsHTML(count, parsed.rows);
    populateAllDatalists(count);
  }

  const unmapped = parsed.rows.filter(r => !r.matchedManagerId).length;
  if (unmapped > 0) {
    showToast(`Classifica elaborata (${count} squadre). Attenzione: ${unmapped} mister da selezionare manualmente.`, 'info');
  } else {
    showToast(`Classifica elaborata con successo (${count} squadre)!`, 'success');
  }
}

/**
 * Handles .CSV / .txt file upload from local device
 */
export function handleFantacalcioFileUpload(event: Event): void {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target?.result as string;
    const textarea = document.getElementById('season-fanta-paste') as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = text;
      handleFantacalcioPasteParse();
    }
  };
  reader.readAsText(file, 'UTF-8');
}

/**
 * Downloads public league page via CORS proxy and parses standings
 */
export async function handleFantacalcioUrlFetch(): Promise<void> {
  const urlInput = document.getElementById('season-fanta-url') as HTMLInputElement | null;
  const url = urlInput?.value.trim();
  if (!url) {
    showToast("Inserisci prima l'URL pubblico della lega Fantacalcio.", 'error');
    return;
  }

  showToast('Scaricamento classifica in corso...', 'info');

  try {
    const parsed = await fetchAndParseFantacalcioUrl(url, state.managers);
    if (!parsed.rows || parsed.rows.length === 0) {
      showToast('Nessuna tabella di classifica rilevata alla pagina indicata.', 'error');
      return;
    }

    const count = parsed.rows.length;
    const countSelect = document.getElementById('season-field-team-count') as HTMLSelectElement | null;
    if (countSelect) {
      countSelect.value = String(count);
    }

    const tbody = document.getElementById('season-standings-tbody');
    if (tbody) {
      tbody.innerHTML = renderChampionshipRowsHTML(count, parsed.rows);
      populateAllDatalists(count);
    }

    showToast(`Scaricata classifica di ${count} squadre!`, 'success');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    showToast(`Errore download: ${msg}`, 'error');
  }
}

/**
 * Toggles collapsible card section (e.g. secondary cups)
 */
export function toggleSeasonSection(sectionId: string): void {
  const content = document.getElementById(`${sectionId}-content`);
  const chevron = document.getElementById(`${sectionId}-chevron`);
  if (!content) return;

  content.classList.toggle('hidden');
  if (chevron) {
    chevron.classList.toggle('rotate-180');
  }
}

/**
 * Removes previous season achievements, history, and competition records for clean overwrite
 */
function removeExistingSeasonData(season: string): void {
  // 1. Remove previous competitions for this season
  state.competitions = state.competitions.filter(c => c.season !== season);

  // 2. Remove achievements and history from managers for this season
  state.managers.forEach(mgr => {
    if (!mgr.history) return;
    const existingEntry = mgr.history.find(h => h.season === season);
    if (existingEntry) {
      // Revert distinct year count
      mgr.years = Math.max(1, (mgr.years || 1) - 1);

      // Revert trophies awarded in this season (only if season was completed)
      if (!existingEntry.in_progress) {
        if (existingEntry.rank === 1) mgr.gold = Math.max(0, (mgr.gold || 0) - 1);
        if (existingEntry.rank === 2) mgr.silver = Math.max(0, (mgr.silver || 0) - 1);
        if (existingEntry.rank === 3) mgr.bronze = Math.max(0, (mgr.bronze || 0) - 1);
      }

      existingEntry.achievements?.forEach(a => {
        if (a.badge === 'spoon') mgr.spoon = Math.max(0, (mgr.spoon || 0) - 1);
        if (a.badge === 'cup_gold') mgr.cup_gold = Math.max(0, (mgr.cup_gold || 0) - 1);
        if (a.badge === 'cup_silver') mgr.cup_silver = Math.max(0, (mgr.cup_silver || 0) - 1);
        if (a.badge === 'supercup') mgr.supercup = Math.max(0, (mgr.supercup || 0) - 1);
        if (a.badge === 'supercup_silver') mgr.supercup_silver = Math.max(0, (mgr.supercup_silver || 0) - 1);
        if (a.badge === 'mundialito') mgr.mundialito = Math.max(0, (mgr.mundialito || 0) - 1);
        if (a.badge === 'mundialito_silver') mgr.mundialito_silver = Math.max(0, (mgr.mundialito_silver || 0) - 1);
        if (a.badge === 'cartonato') mgr.cartonato = Math.max(0, (mgr.cartonato || 0) - 1);
      });

      // Remove the history record
      mgr.history = mgr.history.filter(h => h.season !== season);
    }
  });
}

/**
 * Validates form inputs, generates competition records, updates manager palmarès, and saves state
 */
export function saveSeason(e: Event): void {
  e.preventDefault();

  const seasonYearInput = document.getElementById('season-field-year') as HTMLInputElement | null;
  const compNameInput = document.getElementById('season-field-comp-name') as HTMLInputElement | null;
  const teamCountSelect = document.getElementById('season-field-team-count') as HTMLSelectElement | null;

  const season = seasonYearInput?.value.trim() || '';
  const compName = compNameInput?.value.trim() || '';
  const teamCount = parseInt(teamCountSelect?.value || '12', 10);

  // Validate header
  if (!season || !/^\d{4}\/\d{2}$/.test(season)) {
    showToast("Formato stagione non valido. Usa il formato 'YYYY/YY' (es. 2024/25).", 'error');
    return;
  }
  if (!compName) {
    showToast('Inserisci il nome del campionato.', 'error');
    return;
  }

  // Validate Championship rows
  const rankingItems: CompetitionRankingItem[] = [];
  const selectedManagerIds = new Set<string>();

  for (let i = 1; i <= teamCount; i++) {
    const teamInput = document.getElementById(`season-team-${i}`) as HTMLInputElement | null;
    const coachInput = document.getElementById(`season-coach-${i}`) as HTMLInputElement | null;
    const mgrSelect = document.getElementById(`season-manager-${i}`) as HTMLSelectElement | null;
    const ptsInput = document.getElementById(`season-points-${i}`) as HTMLInputElement | null;

    const teamName = teamInput?.value.trim() || '';
    const coach = coachInput?.value.trim() || '';
    const managerId = mgrSelect?.value || '';
    const pointsStr = ptsInput?.value.trim() || '';

    if (!teamName) {
      showToast(`Posizione #${i}: Inserisci il nome della squadra.`, 'error');
      teamInput?.focus();
      return;
    }
    if (!managerId) {
      showToast(`Posizione #${i} (${teamName}): Seleziona il Mister ${LEAGUE.brand.name}.`, 'error');
      mgrSelect?.focus();
      mgrSelect?.classList.add('border-rose-500', 'ring-1', 'ring-rose-500/50');
      return;
    }
    if (selectedManagerIds.has(managerId)) {
      const mgr = state.managers.find(m => m.id === managerId);
      showToast(`Mister duplicato: '${mgr?.name || managerId}' è già assegnato a un'altra posizione.`, 'error');
      mgrSelect?.focus();
      return;
    }
    if (!pointsStr || isNaN(parseFloat(pointsStr))) {
      showToast(`Posizione #${i} (${teamName}): Inserisci i punti di classifica.`, 'error');
      ptsInput?.focus();
      return;
    }

    selectedManagerIds.add(managerId);

    rankingItems.push({
      rank: i,
      teamName,
      coach: coach || (state.managers.find(m => m.id === managerId)?.name || 'Mister'),
      managerId,
      points: parseFloat(pointsStr),
      logo: getTeamFallbackCrest(teamName)
    });
  }

  // Check for duplicate/existing season overwrite
  const alreadyExists = state.competitions.some(c => c.season === season);
  if (alreadyExists) {
    const confirmOverwrite =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(
            `La stagione ${season} è già presente nell'archivio.\nVuoi sovrascriverla e ricalcolare i relativi trofei e anni per questa stagione?`
          )
        : true;
    if (!confirmOverwrite) return;
    removeExistingSeasonData(season);
  }

  const inProgressCheckbox = document.getElementById('season-field-in-progress') as HTMLInputElement | null;
  const inProgress = !!inProgressCheckbox?.checked;

  const baseCompId = Date.now();
  const newCompetitions: CompetitionRecord[] = [];

  // 1. Championship Competition Record
  const championshipComp: CompetitionRecord = {
    id: baseCompId,
    name: compName,
    season,
    category: 'Campionato',
    in_progress: inProgress,
    status: inProgress ? 'in_progress' : 'completed',
    ranking: rankingItems
  };
  newCompetitions.push(championshipComp);

  // 2. Secondary Tournaments (Optional)
  const cupGoldMgr = (document.getElementById('season-cup-gold') as HTMLSelectElement | null)?.value;
  const cupSilverMgr = (document.getElementById('season-cup-silver') as HTMLSelectElement | null)?.value;
  if (cupGoldMgr) {
    const cupRanking: CompetitionRankingItem[] = [
      { rank: 1, teamName: 'Vincitore Coppa', coach: '', managerId: cupGoldMgr, points: null },
      ...(cupSilverMgr ? [{ rank: 2, teamName: 'Finalista Coppa', coach: '', managerId: cupSilverMgr, points: null }] : [])
    ];
    newCompetitions.push({
      id: baseCompId + 1,
      name: `Coppa ${LEAGUE.brand.name} ${season}`,
      season,
      category: 'Coppa',
      in_progress: inProgress,
      status: inProgress ? 'in_progress' : 'completed',
      ranking: cupRanking
    });
  }

  const supercupGoldMgr = (document.getElementById('season-supercup-gold') as HTMLSelectElement | null)?.value;
  const supercupSilverMgr = (document.getElementById('season-supercup-silver') as HTMLSelectElement | null)?.value;
  if (supercupGoldMgr) {
    const supercupRanking: CompetitionRankingItem[] = [
      { rank: 1, teamName: 'Vincitore Supercoppa', coach: '', managerId: supercupGoldMgr, points: null },
      ...(supercupSilverMgr ? [{ rank: 2, teamName: 'Finalista Supercoppa', coach: '', managerId: supercupSilverMgr, points: null }] : [])
    ];
    newCompetitions.push({
      id: baseCompId + 2,
      name: `Supercoppa ${LEAGUE.brand.name} ${season}`,
      season,
      category: 'Supercoppa',
      in_progress: inProgress,
      status: inProgress ? 'in_progress' : 'completed',
      ranking: supercupRanking
    });
  }

  const mundialitoGoldMgr = (document.getElementById('season-mundialito-gold') as HTMLSelectElement | null)?.value;
  const mundialitoSilverMgr = (document.getElementById('season-mundialito-silver') as HTMLSelectElement | null)?.value;
  if (mundialitoGoldMgr) {
    const mundialitoRanking: CompetitionRankingItem[] = [
      { rank: 1, teamName: 'Vincitore Mundialito', coach: '', managerId: mundialitoGoldMgr, points: null },
      ...(mundialitoSilverMgr ? [{ rank: 2, teamName: 'Finalista Mundialito', coach: '', managerId: mundialitoSilverMgr, points: null }] : [])
    ];
    newCompetitions.push({
      id: baseCompId + 3,
      name: `Mundialito ${season}`,
      season,
      category: 'Mundialito',
      in_progress: inProgress,
      status: inProgress ? 'in_progress' : 'completed',
      ranking: mundialitoRanking
    });
  }

  const cartonatoWinnerMgr = (document.getElementById('season-cartonato-winner') as HTMLSelectElement | null)?.value;
  const cartonatoCoachName = (document.getElementById('season-cartonato-coach') as HTMLInputElement | null)?.value.trim() || 'CARTONATO';
  if (cartonatoWinnerMgr) {
    newCompetitions.push({
      id: baseCompId + 4,
      name: `Playout ${LEAGUE.brand.name} ${season}`,
      season,
      category: 'Playout',
      in_progress: inProgress,
      status: inProgress ? 'in_progress' : 'completed',
      ranking: [{ rank: 1, teamName: 'Vincitore Playout', coach: cartonatoCoachName, managerId: cartonatoWinnerMgr, points: null }]
    });
  }

  // Prepend new competitions to state
  state.competitions = [...newCompetitions, ...state.competitions];

  // 3. Update Manager Honors and Palmarès
  const distinctParticipatingManagers = new Set<string>();

  rankingItems.forEach(r => {
    if (!r.managerId) return;
    const mgr = state.managers.find(m => m.id === r.managerId);
    if (!mgr) return;

    distinctParticipatingManagers.add(mgr.id);

    const achievements: Achievement[] = [];

    if (!inProgress) {
      if (r.rank === 1) {
        mgr.gold = (mgr.gold || 0) + 1;
        achievements.push({
          title: `Campione ${LEAGUE.brand.name}`,
          category: 'Campionato',
          badge: 'gold',
          icon: '🥇',
          competitionId: baseCompId
        });
      } else if (r.rank === 2) {
        mgr.silver = (mgr.silver || 0) + 1;
        achievements.push({
          title: 'Vice-Campione',
          category: 'Campionato',
          badge: 'silver',
          icon: '🥈',
          competitionId: baseCompId
        });
      } else if (r.rank === 3) {
        mgr.bronze = (mgr.bronze || 0) + 1;
        achievements.push({
          title: '3° Classificato',
          category: 'Campionato',
          badge: 'bronze',
          icon: '🥉',
          competitionId: baseCompId
        });
      } else if (r.rank === teamCount && teamCount >= 8) {
        mgr.spoon = (mgr.spoon || 0) + 1;
        achievements.push({
          title: 'Cucchiaio di Legno',
          category: 'Campionato',
          badge: 'spoon',
          icon: '🥄',
          competitionId: baseCompId
        });
      }
    }

    // Append history entry
    const historyEntry: SeasonRecord = {
      season,
      team: r.teamName,
      rank: r.rank,
      points: r.points,
      competitionId: baseCompId,
      in_progress: inProgress,
      achievements
    };

    if (!mgr.history) mgr.history = [];
    mgr.history.unshift(historyEntry);
  });

  // Increment distinct years played by exactly +1
  distinctParticipatingManagers.forEach(mgrId => {
    const mgr = state.managers.find(m => m.id === mgrId);
    if (mgr) {
      mgr.years = (mgr.years || 0) + 1;
    }
  });

  // Apply Secondary Cups increments to winners & finalists (only if season is completed)
  if (!inProgress) {
    if (cupGoldMgr) {
      const m = state.managers.find(mgr => mgr.id === cupGoldMgr);
      if (m) {
        m.cup_gold = (m.cup_gold || 0) + 1;
        m.history?.[0]?.achievements?.push({
          title: 'Vincitore Coppa di Lega',
          category: 'Coppa',
          badge: 'cup_gold',
          icon: '🏆',
          competitionId: baseCompId + 1
        });
      }
    }
    if (cupSilverMgr) {
      const m = state.managers.find(mgr => mgr.id === cupSilverMgr);
      if (m) {
        m.cup_silver = (m.cup_silver || 0) + 1;
        m.history?.[0]?.achievements?.push({
          title: 'Finalista Coppa di Lega',
          category: 'Coppa',
          badge: 'cup_silver',
          icon: '🥈',
          competitionId: baseCompId + 1
        });
      }
    }

    if (supercupGoldMgr) {
      const m = state.managers.find(mgr => mgr.id === supercupGoldMgr);
      if (m) {
        m.supercup = (m.supercup || 0) + 1;
        m.history?.[0]?.achievements?.push({
          title: 'Vincitore Supercoppa',
          category: 'Supercoppa',
          badge: 'supercup',
          icon: '⭐',
          competitionId: baseCompId + 2
        });
      }
    }
    if (supercupSilverMgr) {
      const m = state.managers.find(mgr => mgr.id === supercupSilverMgr);
      if (m) {
        m.supercup_silver = (m.supercup_silver || 0) + 1;
        m.history?.[0]?.achievements?.push({
          title: 'Finalista Supercoppa',
          category: 'Supercoppa',
          badge: 'supercup_silver',
          icon: '🥈',
          competitionId: baseCompId + 2
        });
      }
    }

    if (mundialitoGoldMgr) {
      const m = state.managers.find(mgr => mgr.id === mundialitoGoldMgr);
      if (m) {
        m.mundialito = (m.mundialito || 0) + 1;
        m.history?.[0]?.achievements?.push({
          title: 'Vincitore Mundialito',
          category: 'Mundialito',
          badge: 'mundialito',
          icon: '🌍',
          competitionId: baseCompId + 3
        });
      }
    }
    if (mundialitoSilverMgr) {
      const m = state.managers.find(mgr => mgr.id === mundialitoSilverMgr);
      if (m) {
        m.mundialito_silver = (m.mundialito_silver || 0) + 1;
        m.history?.[0]?.achievements?.push({
          title: 'Finalista Mundialito',
          category: 'Mundialito',
          badge: 'mundialito_silver',
          icon: '🥈',
          competitionId: baseCompId + 3
        });
      }
    }

    if (cartonatoWinnerMgr) {
      const m = state.managers.find(mgr => mgr.id === cartonatoWinnerMgr);
      if (m) {
        m.cartonato = (m.cartonato || 0) + 1;
        if (!m.cartonato_coaches) m.cartonato_coaches = [];
        m.cartonato_coaches.push(cartonatoCoachName);
        if (!m.coach_banners) m.coach_banners = [];
        m.coach_banners.push(cartonatoCoachName);

        m.history?.[0]?.achievements?.push({
          title: `Vincitore Playout (${cartonatoCoachName})`,
          category: 'Playout',
          badge: 'cartonato',
          icon: '📦',
          competitionId: baseCompId + 4
        });
      }
    }
  }

  // Persist to localStorage
  saveData();

  // Refresh user interface
  renderBoard();
  updateStatistics();
  renderSeasonsArchive();
  selectArchiveSeason(season);

  closeSeasonModal();
  showToast(`Stagione ${season} creata con successo! Clicca 'Salva Modifiche' per scaricare il JSON.`, 'success');
}
