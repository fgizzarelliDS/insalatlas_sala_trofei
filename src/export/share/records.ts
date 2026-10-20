import type { LeagueRecord } from '@/analytics/records';
import { state } from '@/state';
import { showToast } from '@/ui';
import { computeAllLeagueRecords } from '@/analytics/records';
import { getLeagueYearSpan } from '@/analytics/records/helpers';
import { LEAGUE } from '@/config';
import {
  renderRecordCardCanvas,
  renderHallOfFamePosterCanvas,
  renderRecordStoryCanvas,
  renderRecordsSummaryStoryCanvas,
  downloadBlob,
  copyBlobToClipboard
} from '@/export/canvas';

/**
 * Captures an individual Hall of Fame Record Card in high definition and downloads PNG directly
 */
export async function exportRecordCardHD(recordId: string): Promise<void> {
  const card = document.getElementById(`record-card-${recordId}`);
  if (!card) {
    showToast('Impossibile trovare la scheda del record', 'error');
    return;
  }

  showToast('Generazione card record HD in corso...', 'info');

  const dropdown = document.getElementById(`record-share-dropdown-${recordId}`);
  if (dropdown) dropdown.classList.add('hidden');

  try {
    const canvas = await renderRecordCardCanvas(card);
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Errore durante la creazione dell'immagine", 'error');
        return;
      }
      const filename = `${LEAGUE.filePrefix}_record_${recordId}_${Date.now()}.png`;
      downloadBlob(blob, filename);
    }, 'image/png');
  } catch (err) {
    console.error('Record card export failed:', err);
    showToast('Impossibile esportare la card del record', 'error');
  }
}

/**
 * Captures an individual Hall of Fame Record Card in high definition and copies PNG to clipboard
 */
export async function copyRecordCardToClipboard(recordId: string): Promise<boolean> {
  const card = document.getElementById(`record-card-${recordId}`);
  if (!card) {
    showToast('Impossibile trovare la scheda del record', 'error');
    return false;
  }

  showToast('Copia immagine record in corso...', 'info');

  const dropdown = document.getElementById(`record-share-dropdown-${recordId}`);
  if (dropdown) dropdown.classList.add('hidden');

  try {
    const canvas = await renderRecordCardCanvas(card);
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast("Errore durante la creazione dell'immagine", 'error');
          resolve(false);
          return;
        }
        const filename = `${LEAGUE.filePrefix}_record_${recordId}_${Date.now()}.png`;
        const success = await copyBlobToClipboard(blob, filename);
        resolve(success);
      }, 'image/png');
    });
  } catch (err) {
    console.error('Record card copy failed:', err);
    showToast('Impossibile copiare la card del record', 'error');
    return false;
  }
}

/**
 * Formats rich banter text and direct link for sharing a Hall of Fame record on WhatsApp
 */
export function buildRecordWhatsAppShareText(record: LeagueRecord, customBaseUrl?: string): string {
  let baseUrl = LEAGUE.siteUrl;
  if (customBaseUrl) {
    baseUrl = customBaseUrl;
  } else if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      baseUrl = `${window.location.origin}${window.location.pathname}`;
    }
  }

  const shareUrl = `${baseUrl}?record=${encodeURIComponent(record.id)}`;

  let holderLine = '';
  if (record.primaryHolders && record.primaryHolders.length > 1) {
    const names = record.primaryHolders
      .map(h => `${h.managerName}${h.season ? ` (${h.season})` : ''}`)
      .join(' • ');
    holderLine = `🤝 *Co-Primatisti (Pari Merito):* ${names}`;
  } else {
    const details = [
      record.primaryHolder.season ? `(${record.primaryHolder.season})` : '',
      record.primaryHolder.teamName ? `_${record.primaryHolder.teamName}_` : ''
    ].filter(Boolean).join(' • ');
    holderLine = `👑 *Primatista:* *${record.primaryHolder.managerName}*${details ? ` ${details}` : ''}`;
  }

  const val = record.primaryHolder.formattedValue;
  const sub = record.primaryHolder.normalizedDetail || record.primaryHolder.detail;

  const lines = [
    `🏆 *${LEAGUE.brand.name} • Record & Primati Storici*`,
    `📜 *${record.title.toUpperCase()}*`,
    `📊 *Valore:* *${val}*${sub ? ` (${sub})` : ''}`,
    holderLine,
    record.description ? `\n📖 _"${record.description}"_` : '',
    `\n👉 Guarda la scheda e la Hall of Fame:\n${shareUrl}`
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Opens WhatsApp directly with pre-filled message and direct link to the record
 */
export function shareRecordWhatsApp(recordId: string): void {
  const records = computeAllLeagueRecords(state.managers, state.competitions);
  const record = records.find(r => r.id === recordId);
  if (!record) {
    showToast('Impossibile trovare il record selezionato', 'error');
    return;
  }

  const text = buildRecordWhatsAppShareText(record);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  showToast('Apertura WhatsApp in corso...', 'info');
}

let isExportingPoster = false;

/**
 * Captures all official Hall of Fame records into a high-definition poster PNG and triggers download
 */
export async function exportHallOfFamePosterHD(): Promise<void> {
  if (isExportingPoster) {
    showToast('Generazione poster già in corso...', 'info');
    return;
  }

  isExportingPoster = true;
  showToast('Generazione Poster Hall of Fame HD in corso...', 'info');

  try {
    const canvas = await renderHallOfFamePosterCanvas();
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Errore durante la creazione dell'immagine del poster", 'error');
        return;
      }
      const filename = `${LEAGUE.filePrefix}_poster_hof_${Date.now()}.png`;
      downloadBlob(blob, filename);
    }, 'image/png');
  } catch (err) {
    console.error('Poster export failed:', err);
    showToast('Impossibile esportare il poster Hall of Fame', 'error');
  } finally {
    isExportingPoster = false;
  }
}

/**
 * Captures all official Hall of Fame records into a high-definition poster PNG and copies to clipboard
 */
export async function copyHallOfFamePosterToClipboard(): Promise<boolean> {
  if (isExportingPoster) {
    showToast('Generazione poster già in corso...', 'info');
    return false;
  }

  isExportingPoster = true;
  showToast('Copia immagine poster in corso...', 'info');

  try {
    const canvas = await renderHallOfFamePosterCanvas();
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast("Errore durante la creazione dell'immagine del poster", 'error');
          resolve(false);
          return;
        }
        const filename = `${LEAGUE.filePrefix}_poster_hof_${Date.now()}.png`;
        const success = await copyBlobToClipboard(blob, filename);
        resolve(success);
      }, 'image/png');
    });
  } catch (err) {
    console.error('Poster copy failed:', err);
    showToast('Impossibile copiare il poster Hall of Fame', 'error');
    return false;
  } finally {
    isExportingPoster = false;
  }
}

/**
 * Formats rich banter text and direct link for sharing the Hall of Fame poster on WhatsApp
 */
export function buildPosterWhatsAppShareText(customBaseUrl?: string): string {
  let baseUrl = LEAGUE.siteUrl;
  if (customBaseUrl) {
    baseUrl = customBaseUrl;
  } else if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      baseUrl = `${window.location.origin}${window.location.pathname}`;
    }
  }
  const shareUrl = `${baseUrl}?tab=records`;

  const leagueSpan = getLeagueYearSpan(state.competitions);
  const allRecords = computeAllLeagueRecords(state.managers, state.competitions);
  const count = allRecords.length > 0 ? allRecords.length : 25;
  const champLabel = (LEAGUE.brand.championshipLabel || LEAGUE.brand.name).toUpperCase();

  return `🏆 *${LEAGUE.brand.name} • Hall of Fame Ufficiale (${leagueSpan.spanText})*
📜 *I ${count} RECORD & PRIMATI ALL-TIME DELLA ${champLabel}*

⚡ *Punti & Podi* • 🏆 *Dominio & Coppe*
💀 *Rivalità Head-to-Head* • 🎖️ *Strisce & Fedeltà*
🎭 *Disonori & Curiosità*

📊 Chi detiene più titoli? Chi ha segnato più punti? Chi è la bestia nera della lega?

👉 Guarda tutti i record e i primatisti storici:
${shareUrl}`;
}

/**
 * Opens WhatsApp directly with pre-filled message and direct link to the Hall of Fame records
 */
export function sharePosterWhatsApp(): void {
  const text = buildPosterWhatsAppShareText();
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  if (typeof window !== 'undefined') {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }
  showToast('Apertura WhatsApp in corso...', 'info');
}

/**
 * Renders and downloads high-definition 9:16 vertical Story for an individual Hall of Fame Record
 */
export async function exportRecordStoryHD(recordId: string): Promise<void> {
  const records = computeAllLeagueRecords(state.managers, state.competitions);
  const record = records.find(r => r.id === recordId);
  if (!record) {
    showToast('Impossibile trovare il record selezionato', 'error');
    return;
  }

  showToast('Generazione Story Record 9:16 in corso...', 'info');
  const dropdown = document.getElementById(`record-share-dropdown-${recordId}`);
  if (dropdown) dropdown.classList.add('hidden');

  try {
    const canvas = await renderRecordStoryCanvas(record);
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Errore durante la creazione della Story", 'error');
        return;
      }
      const filename = `${LEAGUE.filePrefix}_record_story_${recordId}_${Date.now()}.png`;
      downloadBlob(blob, filename);
    }, 'image/png');
  } catch (err) {
    console.error('Record Story export failed:', err);
    showToast('Impossibile esportare la Story del record', 'error');
  }
}

/**
 * Renders and downloads high-definition 9:16 vertical Story for the Top Primati Summary Poster
 */
export async function exportRecordsSummaryStoryHD(): Promise<void> {
  showToast('Generazione Story Top Primati 9:16 in corso...', 'info');
  const dropdown = document.getElementById('poster-share-dropdown-menu');
  if (dropdown) dropdown.classList.add('hidden');

  try {
    const canvas = await renderRecordsSummaryStoryCanvas();
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Errore durante la creazione della Story", 'error');
        return;
      }
      const filename = `${LEAGUE.filePrefix}_top_primati_story_${Date.now()}.png`;
      downloadBlob(blob, filename);
    }, 'image/png');
  } catch (err) {
    console.error('Records Summary Story export failed:', err);
    showToast('Impossibile esportare la Story dei primati', 'error');
  }
}
