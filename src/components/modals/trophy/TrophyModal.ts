import { state } from '@/state';
import { LEAGUE, getCompetitionDef } from '@/config';
import { showToast } from '@/ui';
import type { TrophyModalKey, CupSubTab } from './TrophyModalTypes';
import { renderTrophyModalShellHTML } from './TrophyModalShell';
import {
  renderScudettiRollHTML,
  renderCupsContent,
  renderMundialitoContent,
  renderSpoonsContent,
  renderCartonatoContent,
  renderSeasonsOverviewRollHTML,
  renderGenericCompetitionRollHTML
} from './TrophyModalContent';
import { pushOpenModal, popCloseModal } from '@/components/modals/baseModal';

let currentTrophyKey: TrophyModalKey | null = null;
let currentCupSubTab: CupSubTab = 'coppa';

/**
 * Returns rendered body HTML depending on the active trophy key
 */
function renderTrophyBody(key: TrophyModalKey, subTab: CupSubTab): string {
  switch (key) {
    case 'scudetti':
    case 'championship':
      return renderScudettiRollHTML(state.competitions, state.managers);
    case 'cups':
      return renderCupsContent(subTab, state.competitions, state.managers);
    case 'cup':
      return renderCupsContent('coppa', state.competitions, state.managers);
    case 'supercup':
      return renderCupsContent('supercoppa', state.competitions, state.managers);
    case 'mundialito':
      return renderMundialitoContent(state.competitions, state.managers);
    case 'spoons':
    case 'spoon':
      return renderSpoonsContent(state.competitions, state.managers);
    case 'cartonato':
      return renderCartonatoContent(state.competitions, state.managers);
    case 'seasons':
      return renderSeasonsOverviewRollHTML(state.competitions, state.managers);
    default: {
      const comp = getCompetitionDef(key);
      if (comp) {
        return renderGenericCompetitionRollHTML(comp, state.competitions, state.managers);
      }
      return renderSeasonsOverviewRollHTML(state.competitions, state.managers);
    }
  }
}

/**
 * Opens the interactive Trophy History Modal for a specific category
 */
export function openTrophyModal(
  key: TrophyModalKey,
  subTab: CupSubTab = 'coppa',
  updateHistory = true
): void {
  currentTrophyKey = key;
  currentCupSubTab = subTab;

  const container = document.getElementById('trophy-history-modal');
  if (!container) return;

  const bodyHTML = renderTrophyBody(currentTrophyKey, currentCupSubTab);
  container.innerHTML = renderTrophyModalShellHTML(currentTrophyKey, currentCupSubTab, bodyHTML);
  container.classList.remove('hidden');

  // Prevent background body scroll while modal is active
  if (typeof document !== 'undefined' && document.body) {
    document.body.style.overflow = 'hidden';
  }

  // Register with modal stack
  pushOpenModal('trophy-history-modal', () => closeTrophyModal(true));

  // URL deep-linking sync
  if (updateHistory && typeof window !== 'undefined' && window.location) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('trophy', key);
      if (key === 'cups') {
        url.searchParams.set('sub', subTab);
      } else {
        url.searchParams.delete('sub');
      }
      window.history.pushState({ trophy: key, sub: subTab }, '', url.toString());
    } catch {
      // Ignored in mocked environments
    }
  }
}

/**
 * Closes the active Trophy History Modal
 */
export function closeTrophyModal(updateHistory = true): void {
  popCloseModal('trophy-history-modal');
  if (!currentTrophyKey) return;
  currentTrophyKey = null;

  closeTrophyShareDropdown();

  const container = document.getElementById('trophy-history-modal');
  if (container) {
    container.innerHTML = '';
    container.classList.add('hidden');
  }

  // Restore background body scroll
  if (typeof document !== 'undefined' && document.body) {
    document.body.style.overflow = '';
  }


  // Clean URL query param
  if (updateHistory && typeof window !== 'undefined' && window.location) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('trophy');
      url.searchParams.delete('sub');
      window.history.pushState({}, '', url.toString());
    } catch {
      // Ignored
    }
  }
}

/**
 * Toggles the export share dropdown inside the trophy modal
 */
export function toggleTrophyShareDropdown(e?: Event): void {
  if (e) {
    e.stopPropagation();
  }
  const menu = document.getElementById('trophy-share-dropdown-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

/**
 * Closes the export share dropdown inside the trophy modal
 */
export function closeTrophyShareDropdown(): void {
  const menu = document.getElementById('trophy-share-dropdown-menu');
  if (menu) {
    menu.classList.add('hidden');
  }
}

let isExportingTrophy = false;

/**
 * Captures the open trophy roll of honor modal into a high-res PNG and triggers download
 */
export async function exportTrophyModalHD(): Promise<void> {
  if (isExportingTrophy) {
    showToast('Generazione albo HD già in corso...', 'info');
    return;
  }
  const dialog = document.getElementById('trophy-history-dialog');
  if (!dialog) {
    showToast("Impossibile trovare la scheda dell'albo d'oro", 'error');
    return;
  }

  isExportingTrophy = true;
  showToast("Generazione Albo d'Oro HD in corso...", 'info');

  try {
    const { renderTrophyModalCanvas, downloadBlob } = await import('@/export');
    const canvas = await renderTrophyModalCanvas(dialog);
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Errore durante la creazione dell'immagine", 'error');
        return;
      }
      const filename = `${LEAGUE.brand.name}_Albo_${currentTrophyKey || 'trofeo'}_${Date.now()}.png`;
      downloadBlob(blob, filename);
    }, 'image/png');
  } catch (err) {
    console.error('Trophy modal export failed:', err);
    showToast("Impossibile esportare l'albo d'oro", 'error');
  } finally {
    isExportingTrophy = false;
  }
}

/**
 * Captures the open trophy roll of honor modal into a high-res PNG and copies directly to clipboard
 */
export async function copyTrophyModalToClipboard(): Promise<boolean> {
  if (isExportingTrophy) {
    showToast('Generazione albo già in corso...', 'info');
    return false;
  }
  const dialog = document.getElementById('trophy-history-dialog');
  if (!dialog) {
    showToast("Impossibile trovare la scheda dell'albo d'oro", 'error');
    return false;
  }

  isExportingTrophy = true;
  showToast("Copia immagine Albo d'Oro in corso...", 'info');

  try {
    const { renderTrophyModalCanvas, copyBlobToClipboard } = await import('@/export');
    const canvas = await renderTrophyModalCanvas(dialog);
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast("Errore durante la creazione dell'immagine", 'error');
          resolve(false);
          return;
        }
        const filename = `${LEAGUE.brand.name}_Albo_${currentTrophyKey || 'trofeo'}_${Date.now()}.png`;
        const success = await copyBlobToClipboard(blob, filename);
        resolve(success);
      }, 'image/png');
    });
  } catch (err) {
    console.error('Trophy modal copy failed:', err);
    showToast("Impossibile copiare l'albo d'oro", 'error');
    return false;
  } finally {
    isExportingTrophy = false;
  }
}

/**
 * Switches tab inside Coppe & Supercoppe modal
 */
export function switchTrophyModalTab(subTab: CupSubTab): void {
  if (currentTrophyKey !== 'cups') return;
  currentCupSubTab = subTab;

  const container = document.getElementById('trophy-history-modal');
  if (!container) return;

  const bodyHTML = renderTrophyBody('cups', currentCupSubTab);
  container.innerHTML = renderTrophyModalShellHTML('cups', currentCupSubTab, bodyHTML);

  if (typeof window !== 'undefined' && window.location) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('trophy', 'cups');
      url.searchParams.set('sub', subTab);
      window.history.replaceState({ trophy: 'cups', sub: subTab }, '', url.toString());
    } catch {
      // Ignored
    }
  }
}

/**
 * Generates and opens WhatsApp share text for the active trophy
 */
export function shareTrophyWhatsApp(key: TrophyModalKey, subTab?: CupSubTab): void {
  let baseUrl = LEAGUE.siteUrl;
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      baseUrl = `${window.location.origin}${window.location.pathname}`;
    }
  }

  const subQuery = (key === 'cups' && subTab) ? `&sub=${subTab}` : '';
  const shareUrl = `${baseUrl}?trophy=${key}${subQuery}`;

  let title = "Albo d'Oro";
  if (key === 'scudetti') title = `🥇 Albo d'Oro Scudetti ${LEAGUE.brand.championshipLabel}`;
  else if (key === 'cups' && subTab === 'supercoppa') title = `⭐ Albo d'Oro ${LEAGUE.competitions.supercup.title}`;
  else if (key === 'cups') title = `🏆 Albo d'Oro ${LEAGUE.competitions.cup.title}`;
  else if (key === 'mundialito') title = "🌍 Albo d'Oro Mundialito";
  else if (key === 'spoons') title = `🥄 Muro dei Cucchiai di Legno (${LEAGUE.brand.championshipLabel})`;
  else if (key === 'cartonato') title = "📦 Albo Playout & Banner Cartonato";
  else if (key === 'seasons') title = "📅 Cronologia Storica delle Stagioni";

  const message = `${title}
📜 Consulta l'albo ufficiale, i podi e le finali storiche su ${LEAGUE.brand.name}:
👉 ${shareUrl}`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  if (typeof window !== 'undefined') {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }
  showToast('Apertura WhatsApp in corso...', 'info');
}

// Bind to window for HTML inline event handlers
if (typeof window !== 'undefined') {
  Object.assign(window, {
    openTrophyModal,
    closeTrophyModal,
    switchTrophyModalTab,
    shareTrophyWhatsApp,
    toggleTrophyShareDropdown,
    closeTrophyShareDropdown,
    exportTrophyModalHD,
    copyTrophyModalToClipboard
  });
}

