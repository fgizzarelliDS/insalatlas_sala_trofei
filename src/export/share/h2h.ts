import type { Manager } from '@/types';
import { showToast } from '@/ui';
import { LEAGUE } from '@/config';
import {
  renderH2HDuelCanvas,
  renderH2HDuelStoryCanvas,
  renderMultiManagerStoryCanvas,
  renderMultiManagerCanvas,
  downloadBlob,
  copyBlobToClipboard
} from '@/export/canvas';

export {
  buildH2HWhatsAppShareText,
  buildMultiManagerWhatsAppShareText
} from './h2hText';

/**
 * Captures the H2H duel dialog in high definition and downloads PNG directly
 */
export async function exportH2HDuelHD(managerA: Manager, managerB: Manager): Promise<void> {
  const card = document.getElementById('head-to-head-dialog');
  if (!card) {
    showToast('Impossibile trovare la scheda del duello', 'error');
    return;
  }

  showToast('Generazione duello HD in corso...', 'info');

  const dropdown = document.getElementById('h2h-share-dropdown-menu');
  if (dropdown) dropdown.classList.add('hidden');

  try {
    const canvas = await renderH2HDuelCanvas(card);
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Errore durante la creazione dell'immagine", 'error');
        return;
      }
      const filename = `${LEAGUE.filePrefix}_h2h_${managerA.id}_vs_${managerB.id}_${Date.now()}.png`;
      downloadBlob(blob, filename);
    }, 'image/png');
  } catch (err) {
    console.error('H2H export failed:', err);
    showToast('Impossibile esportare il duello', 'error');
  }
}

/**
 * Captures the H2H duel dialog in high definition and copies PNG to clipboard
 */
export async function copyH2HDuelToClipboard(managerA: Manager, managerB: Manager): Promise<boolean> {
  const card = document.getElementById('head-to-head-dialog');
  if (!card) {
    showToast('Impossibile trovare la scheda del duello', 'error');
    return false;
  }

  showToast('Copia immagine duello in corso...', 'info');

  const dropdown = document.getElementById('h2h-share-dropdown-menu');
  if (dropdown) dropdown.classList.add('hidden');

  try {
    const canvas = await renderH2HDuelCanvas(card);
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast("Errore durante la creazione dell'immagine", 'error');
          resolve(false);
          return;
        }
        const filename = `${LEAGUE.filePrefix}_h2h_${managerA.id}_vs_${managerB.id}_${Date.now()}.png`;
        const success = await copyBlobToClipboard(blob, filename);
        resolve(success);
      }, 'image/png');
    });
  } catch (err) {
    console.error('H2H copy failed:', err);
    showToast('Impossibile copiare il duello', 'error');
    return false;
  }
}

/**
 * Renders and downloads high-definition 9:16 vertical Instagram/WhatsApp Story for a 1vs1 H2H Duel
 */
export async function exportH2HDuelStoryHD(managerA: Manager, managerB: Manager): Promise<void> {
  showToast('Generazione Story Duello 9:16 in corso...', 'info');
  const dropdown = document.getElementById('h2h-share-dropdown-menu');
  if (dropdown) dropdown.classList.add('hidden');

  try {
    const canvas = await renderH2HDuelStoryCanvas(managerA, managerB);
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Errore durante la creazione della Story", 'error');
        return;
      }
      const filename = `${LEAGUE.filePrefix}_duel_story_${managerA.id}_vs_${managerB.id}_${Date.now()}.png`;
      downloadBlob(blob, filename);
    }, 'image/png');
  } catch (err) {
    console.error('H2H Duel Story export failed:', err);
    showToast('Impossibile esportare la Story', 'error');
  }
}

/**
 * Renders and downloads high-definition 9:16 vertical Story for Tavolo dei Rivali multi-manager cluster
 */
export async function exportMultiManagerStoryHD(
  managers: Manager[],
  tournamentMode: 'ppg' | 'simultaneous' = 'simultaneous'
): Promise<void> {
  showToast('Generazione Story Tavolo Rivali 9:16 in corso...', 'info');
  const dropdown = document.getElementById('h2h-share-dropdown-menu');
  if (dropdown) dropdown.classList.add('hidden');

  try {
    const canvas = await renderMultiManagerStoryCanvas(managers, tournamentMode);
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Errore durante la creazione della Story", 'error');
        return;
      }
      const filename = `${LEAGUE.filePrefix}_rivals_story_${Date.now()}.png`;
      downloadBlob(blob, filename);
    }, 'image/png');
  } catch (err) {
    console.error('Multi-manager Story export failed:', err);
    showToast('Impossibile esportare la Story', 'error');
  }
}

/**
 * Captures the Tavolo dei Rivali multi-manager dialog in high definition and downloads PNG directly
 */
export async function exportMultiManagerHD(): Promise<void> {
  const card = document.getElementById('head-to-head-dialog');
  if (!card) {
    showToast('Impossibile trovare la scheda del Tavolo dei Rivali', 'error');
    return;
  }

  showToast('Generazione Tavolo dei Rivali HD in corso...', 'info');

  const dropdown = document.getElementById('h2h-share-dropdown-menu');
  if (dropdown) dropdown.classList.add('hidden');

  try {
    const canvas = await renderMultiManagerCanvas(card);
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Errore durante la creazione dell'immagine", 'error');
        return;
      }
      const filename = `${LEAGUE.filePrefix}_tavolo_rivali_${Date.now()}.png`;
      downloadBlob(blob, filename);
    }, 'image/png');
  } catch (err) {
    console.error('Multi-manager export failed:', err);
    showToast('Impossibile esportare il Tavolo dei Rivali', 'error');
  }
}

/**
 * Captures the Tavolo dei Rivali multi-manager dialog in high definition and copies PNG to clipboard
 */
export async function copyMultiManagerToClipboard(): Promise<boolean> {
  const card = document.getElementById('head-to-head-dialog');
  if (!card) {
    showToast('Impossibile trovare la scheda del Tavolo dei Rivali', 'error');
    return false;
  }

  showToast('Copia immagine Tavolo dei Rivali in corso...', 'info');

  const dropdown = document.getElementById('h2h-share-dropdown-menu');
  if (dropdown) dropdown.classList.add('hidden');

  try {
    const canvas = await renderMultiManagerCanvas(card);
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast("Errore durante la creazione dell'immagine", 'error');
          resolve(false);
          return;
        }
        const filename = `${LEAGUE.filePrefix}_tavolo_rivali_${Date.now()}.png`;
        const success = await copyBlobToClipboard(blob, filename);
        resolve(success);
      }, 'image/png');
    });
  } catch (err) {
    console.error('Multi-manager clipboard copy failed:', err);
    showToast('Impossibile copiare il Tavolo dei Rivali', 'error');
    return false;
  }
}
