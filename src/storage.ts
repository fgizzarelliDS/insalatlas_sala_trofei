import { Manager, LeagueData, TitlesConfig, CompetitionRecord } from '@/types';
import { DEFAULT_TITLES, LEAGUE } from '@/config';
import { state } from '@/state';
import { showToast, applyTitlesToDOM } from '@/ui';
import { renderBoard } from '@/components/board/tableBoard';
import { updateStatistics } from '@/components/board/statsCounter';

const STORAGE_KEY_DATA = `${LEAGUE.storagePrefix}_palmares_data_v1`;
const STORAGE_KEY_TITLES = `${LEAGUE.storagePrefix}_custom_titles_v1`;
const STORAGE_KEY_COMPETITIONS = `${LEAGUE.storagePrefix}_competitions_data_v1`;

/**
 * Parses and populates league payload into app state
 */
export function applyLoadedData(json: LeagueData): boolean {
  let loaded = false;
  if (json && Array.isArray(json.leagueData)) {
    state.managers = json.leagueData;
    loaded = true;
  } else if (json && Array.isArray(json.managers)) {
    state.managers = json.managers;
    loaded = true;
  } else if (Array.isArray(json)) {
    state.managers = json as Manager[];
    loaded = true;
  }

  if (json && Array.isArray(json.competitions)) {
    state.competitions = json.competitions;
  }

  if (json && json.customTitles && typeof json.customTitles === 'object') {
    state.titles = { ...DEFAULT_TITLES, ...json.customTitles };
  } else if (json && json.titles && typeof json.titles === 'object') {
    state.titles = { ...DEFAULT_TITLES, ...json.titles };
  }

  return loaded;
}

/**
 * Loads remote data.json or falls back to localStorage
 */
export async function loadLeagueData(): Promise<Manager[]> {
  try {
    const response = await fetch('data.json?t=' + Date.now());
    if (response.ok) {
      const json: LeagueData = await response.json();
      if (applyLoadedData(json)) {
        // Sync local cache
        saveData();
        saveTitles();
        return state.managers;
      }
    }
  } catch (err) {
    console.warn('Impossibile caricare data.json dal server, uso fallback locale', err);
  }

  // Fallback to localStorage
  loadData();
  loadTitles();
  return state.managers;
}

/**
 * Loads league data from localStorage
 */
export function loadData(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DATA);
    state.managers = saved ? (JSON.parse(saved) as Manager[]) : [];
    const savedComps = localStorage.getItem(STORAGE_KEY_COMPETITIONS);
    state.competitions = savedComps ? (JSON.parse(savedComps) as CompetitionRecord[]) : [];
  } catch (e) {
    state.managers = [];
    state.competitions = [];
  }
}

/**
 * Saves current managers and competitions to localStorage
 */
export function saveData(): void {
  try {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(state.managers));
    localStorage.setItem(STORAGE_KEY_COMPETITIONS, JSON.stringify(state.competitions));
  } catch (e) {
    console.error('Errore salvataggio localStorage:', e);
  }
}

/**
 * Loads custom titles from localStorage
 */
export function loadTitles(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TITLES);
    if (saved) {
      const parsed = JSON.parse(saved) as TitlesConfig;
      if (parsed.col3 === 'Cucchiaio' || parsed.col6 === 'Mundialito') {
        parsed.col3 = DEFAULT_TITLES.col3;
        parsed.col4 = DEFAULT_TITLES.col4;
        parsed.col5 = DEFAULT_TITLES.col5;
        parsed.col6 = DEFAULT_TITLES.col6;
        parsed.col7 = DEFAULT_TITLES.col7;
      }
      state.titles = { ...DEFAULT_TITLES, ...parsed };
      saveTitles();
    } else {
      state.titles = { ...DEFAULT_TITLES };
    }
  } catch (e) {
    state.titles = { ...DEFAULT_TITLES };
  }
}

/**
 * Saves current titles to localStorage
 */
export function saveTitles(): void {
  try {
    localStorage.setItem(STORAGE_KEY_TITLES, JSON.stringify(state.titles));
  } catch (e) {
    console.error('Errore salvataggio titoli in localStorage:', e);
  }
}

/**
 * Exports current data and custom titles as a downloadable JSON file
 */
export function exportBackupJSON(): void {
  const backupPayload: LeagueData = {
    leagueData: state.managers,
    competitions: state.competitions,
    customTitles: state.titles,
    exportedAt: new Date().toISOString()
  };
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `data_backup_${new Date().getFullYear()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('File di backup salvato sul tuo computer!', 'success');
}

/**
 * Parses user-uploaded JSON file, populates state, saves to storage, and re-renders UI
 * @param event - Input change event from file input
 */
export function importBackupJSON(event: Event): void {
  const target = event.target as HTMLInputElement;
  const file = target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e: ProgressEvent<FileReader>) {
    try {
      const content = e.target?.result as string;
      const parsed = JSON.parse(content);

      if (applyLoadedData(parsed)) {
        saveData();
        saveTitles();
        applyTitlesToDOM();
        renderBoard();
        updateStatistics();
        showToast('Dati e titoli importati con successo dal file JSON!', 'success');
      } else {
        throw new Error('Formato dati non riconosciuto');
      }
    } catch (err) {
      console.error(err);
      showToast('Errore: file JSON non valido o formato corrotto.', 'error');
    } finally {
      if (target) target.value = '';
    }
  };

  reader.onerror = function () {
    showToast('Errore nella lettura del file dal disco.', 'error');
  };

  reader.readAsText(file);
}

/**
 * Restores DEFAULT_TITLES into state, DOM, and storage
 */
export function resetDefaultTitles(): void {
  state.titles = { ...DEFAULT_TITLES };
  saveTitles();
  applyTitlesToDOM();
  showToast('Titoli predefiniti ripristinati!', 'info');
}

/**
 * Re-fetches remote data.json, overrides state, updates storage and re-renders UI
 */
export async function resetOfficialData(): Promise<void> {
  showToast('Ripristino dati ufficiali in corso...', 'info');
  try {
    const response = await fetch('data.json?t=' + Date.now());
    if (!response.ok) throw new Error('File data.json non raggiungibile');

    const json = await response.json();
    if (applyLoadedData(json)) {
      saveData();
      saveTitles();
      applyTitlesToDOM();
      renderBoard();
      updateStatistics();
      showToast('Dati ufficiali ripristinati con successo da data.json!', 'success');
    } else {
      throw new Error('Formato dati non riconosciuto in data.json');
    }
  } catch (err) {
    console.error('Errore durante il ripristino:', err);
    showToast('Impossibile scaricare data.json dal server.', 'error');
  }
}
