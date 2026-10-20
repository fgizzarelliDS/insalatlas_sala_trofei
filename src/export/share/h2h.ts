import type { Manager } from '@/types';
import { showToast } from '@/ui';
import { formatScore } from '@/score';
import { computeHeadToHead } from '@/analytics';
import { LEAGUE } from '@/config';
import {
  renderH2HDuelCanvas,
  renderH2HDuelStoryCanvas,
  renderMultiManagerStoryCanvas,
  downloadBlob,
  copyBlobToClipboard
} from '@/export/canvas';

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
 * Formats rich banter text and direct link for WhatsApp sharing of a 1vs1 Head-to-Head duel
 */
export function buildH2HWhatsAppShareText(
  managerA: Manager,
  managerB: Manager,
  customBaseUrl?: string
): string {
  const stats = computeHeadToHead(managerA, managerB);

  let baseUrl = LEAGUE.siteUrl;
  if (customBaseUrl) {
    baseUrl = customBaseUrl;
  } else if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      baseUrl = `${window.location.origin}${window.location.pathname}`;
    }
  }

  const shareUrl = `${baseUrl}?h2h=${encodeURIComponent(managerA.id)}:${encodeURIComponent(managerB.id)}`;

  return `⚔️ *${LEAGUE.brand.name} • Duello Head-to-Head*
👤 *${managerA.name.toUpperCase()}* vs *${managerB.name.toUpperCase()}*

🏁 *Scontri Diretti in Campionato:*
${stats.winsA} Vittorie ${managerA.name} • ${stats.ties} Pari • ${stats.winsB} Vittorie ${managerB.name} (${stats.sharedSeasonsCount} campionati condivisi)

🏆 *Palmarès a Confronto:*
• Scudetti: ${managerA.gold || 0} vs ${managerB.gold || 0}
• Coppe di Lega: ${managerA.cup_gold || 0} vs ${managerB.cup_gold || 0}
• Rating Storico: ${formatScore(stats.palmares.ratingScore.a)} PT vs ${formatScore(stats.palmares.ratingScore.b)} PT

📊 *Indice di Freddezza:*
• ${managerA.name}: ${stats.metricsA.clutchIcon} ${stats.metricsA.clutchLabel}
• ${managerB.name}: ${stats.metricsB.clutchIcon} ${stats.metricsB.clutchLabel}

📜 *Verdetto:* ${stats.narrativeVerdict}

👉 Guarda il duello completo:
${shareUrl}`;
}

/**
 * Formats rich banter text and direct link for WhatsApp sharing of Tavolo dei Rivali multi-manager cluster
 */
export function buildMultiManagerWhatsAppShareText(
  managers: Manager[],
  multiSelectedIds: string[],
  customBaseUrl?: string
): string {
  const names = managers.map(m => m.name.toUpperCase()).join(' vs ');
  let baseUrl = LEAGUE.siteUrl;
  if (customBaseUrl) {
    baseUrl = customBaseUrl;
  } else if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      baseUrl = `${window.location.origin}${window.location.pathname}`;
    }
  }

  const shareUrl = `${baseUrl}?h2h=multi&m=${encodeURIComponent(multiSelectedIds.join(':'))}`;
  return `🕸️ *${LEAGUE.brand.name} • Tavolo dei Rivali*
⚔️ *${names}*

📊 Confronto radar multidimensionale a 6 assi e mini-torneo incrociato tra rivali storici.

👉 Guarda il tavolo completo:
${shareUrl}`;
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
    const { renderMultiManagerCanvas } = await import('@/export/renderers/h2h');
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
    const { renderMultiManagerCanvas } = await import('@/export/renderers/h2h');
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
