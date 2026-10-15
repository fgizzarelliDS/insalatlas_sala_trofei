import type { Manager } from '@/types';
import type { LeagueRecord } from '@/analytics/records';
import { state } from '@/state';
import { showToast } from '@/ui';
import { calculateManagerScore, formatScore } from '@/score';
import { getManagerArchetype, computeGlobalClutchIndex, getClutchTier } from '@/analytics';
import { computeAllLeagueRecords } from '@/analytics/records';
import {
  renderProfileModalCanvas,
  renderH2HDuelCanvas,
  renderRecordCardCanvas,
  renderHallOfFamePosterCanvas,
  downloadBlob,
  copyBlobToClipboard
} from './canvas';

/**
 * Formats rich banter text and direct link for WhatsApp sharing with preview
 */
export function buildWhatsAppShareText(manager: Manager, customBaseUrl?: string): string {
  const score = calculateManagerScore(manager);
  const totalMajor = (manager.gold || 0) + (manager.cup_gold || 0) + (manager.supercup || 0) + (manager.mundialito || 0);
  const efficiency = manager.years > 0 ? parseFloat((totalMajor / manager.years).toFixed(2)) : 0;
  const arch = getManagerArchetype(manager, totalMajor, efficiency);

  const completedYears = manager.history && manager.history.length > 0
    ? manager.history.filter(h => !h.in_progress && (h as any).status !== 'in_progress').length
    : (manager.years || 0);
  const podiums = (manager.gold || 0) + (manager.silver || 0) + (manager.bronze || 0);
  const finalsWon = (manager.cup_gold || 0) + (manager.supercup || 0);
  const finalsPlayed = finalsWon + (manager.cup_silver || 0) + (manager.supercup_silver || 0);
  const gci = computeGlobalClutchIndex(manager.gold || 0, podiums, finalsWon, finalsPlayed, completedYears);
  const clutch = getClutchTier(gci, completedYears);
  const clutchLine = `${clutch.icon} *Freddezza:* ${clutch.label}`;

  const trophiesList: string[] = [];
  if (manager.gold) trophiesList.push(`🥇 ${manager.gold} ${manager.gold === 1 ? 'Scudetto' : 'Scudetti'}`);
  if (manager.cup_gold) trophiesList.push(`🏆 ${manager.cup_gold} ${manager.cup_gold === 1 ? 'Coppa Lega' : 'Coppe Lega'}`);
  if (manager.supercup) trophiesList.push(`⭐ ${manager.supercup} ${manager.supercup === 1 ? 'Supercoppa' : 'Supercoppe'}`);
  if (manager.mundialito) trophiesList.push(`🌍 ${manager.mundialito} Mundialito`);
  if (manager.spoon) trophiesList.push(`🥄 ${manager.spoon} ${manager.spoon === 1 ? 'Cucchiaio' : 'Cucchiai'}`);
  if (manager.cartonato) trophiesList.push(`⚠️ ${manager.cartonato} ${manager.cartonato === 1 ? 'Cartonato' : 'Cartonati'}`);

  const trophiesStr = trophiesList.length > 0 ? trophiesList.join(' • ') : 'Nessun trofeo';

  let baseUrl = 'https://fgizzarellids.github.io/insalatlas_sala_trofei/';
  if (customBaseUrl) {
    baseUrl = customBaseUrl;
  } else if (typeof window !== 'undefined' && window.location && window.location.origin) {
    // Force public production URL on localhost so WhatsApp crawler can access and unfurl the rich preview image
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      baseUrl = `${window.location.origin}${window.location.pathname}`;
    }
  }

  const shareUrl = `${baseUrl}?manager=${encodeURIComponent(manager.id)}`;

  return `🏆 *InsalAtlas • Scheda Palmarès*\n👤 *${manager.name.toUpperCase()}* (${manager.years} ${manager.years === 1 ? 'Stagione' : 'Stagioni'})\n⭐ *Rating Storico:* ${formatScore(score)} PT\n🏅 *Profilo:* ${arch.tag}\n${clutchLine}\n\n📊 *Bacheca:* ${trophiesStr}\n\n👉 Guarda la scheda e i trofei completi:\n${shareUrl}`;
}

/**
 * Captures the #manager-profile-card element in high definition and downloads PNG directly
 */
export async function exportProfileModalHD(manager: Manager): Promise<void> {
  if (state.selectedManagerId !== manager.id && typeof window !== 'undefined' && (window as unknown as { openProfileModal?: (id: string) => void }).openProfileModal) {
    (window as unknown as { openProfileModal: (id: string) => void }).openProfileModal(manager.id);
  }

  const card = document.getElementById('manager-profile-card');
  if (!card) {
    showToast('Impossibile trovare la scheda del profilo', 'error');
    return;
  }

  showToast('Generazione scheda HD in corso...', 'info');

  const dropdown = document.getElementById('share-dropdown-menu');
  if (dropdown) dropdown.classList.add('hidden');

  try {
    const canvas = await renderProfileModalCanvas(card);
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Errore durante la creazione dell'immagine", 'error');
        return;
      }
      const filename = `insalatlas_${manager.id}_${Date.now()}.png`;
      downloadBlob(blob, filename);
    }, 'image/png');
  } catch (err) {
    console.error('Modal export failed:', err);
    showToast('Impossibile esportare la scheda', 'error');
  }
}

/**
 * Captures the #manager-profile-card element in high definition and copies PNG to clipboard
 */
export async function copyProfileModalToClipboard(manager: Manager): Promise<boolean> {
  if (state.selectedManagerId !== manager.id && typeof window !== 'undefined' && (window as unknown as { openProfileModal?: (id: string) => void }).openProfileModal) {
    (window as unknown as { openProfileModal: (id: string) => void }).openProfileModal(manager.id);
  }

  const card = document.getElementById('manager-profile-card');
  if (!card) {
    showToast('Impossibile trovare la scheda del profilo', 'error');
    return false;
  }

  showToast('Copia immagine in corso...', 'info');

  const dropdown = document.getElementById('share-dropdown-menu');
  if (dropdown) dropdown.classList.add('hidden');

  try {
    const canvas = await renderProfileModalCanvas(card);
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast("Errore durante la creazione dell'immagine", 'error');
          resolve(false);
          return;
        }
        const filename = `insalatlas_${manager.id}_${Date.now()}.png`;
        const success = await copyBlobToClipboard(blob, filename);
        resolve(success);
      }, 'image/png');
    });
  } catch (err) {
    console.error('Modal copy failed:', err);
    showToast('Impossibile copiare la scheda', 'error');
    return false;
  }
}

/**
 * Generates and downloads a 9:16 high-resolution Trading Card for a manager (fallback)
 */
export async function exportManagerCardHD(manager: Manager): Promise<void> {
  await exportProfileModalHD(manager);
}

/**
 * Looks up manager by ID and triggers Modal Card export
 */
export async function exportManagerCardById(managerId: string): Promise<void> {
  const manager = state.managers.find(m => m.id === managerId);
  if (!manager) {
    showToast('Allenatore non trovato', 'error');
    return;
  }
  await exportProfileModalHD(manager);
}

/**
 * Copies the high-resolution Profile Modal card directly to the system clipboard
 * so users can simply Cmd+V / Paste it into WhatsApp, Telegram, or any chat
 */
export async function copyManagerCardToClipboard(manager: Manager): Promise<boolean> {
  return copyProfileModalToClipboard(manager);
}

/**
 * Copies profile modal image to clipboard by manager ID
 */
export async function copyManagerCardById(managerId: string): Promise<void> {
  const manager = state.managers.find(m => m.id === managerId);
  if (!manager) {
    showToast('Allenatore non trovato', 'error');
    return;
  }
  await copyProfileModalToClipboard(manager);
}

/**
 * Opens WhatsApp directly with pre-filled message and preview link
 */
export function shareViaWhatsApp(manager: Manager): void {
  const text = buildWhatsAppShareText(manager);
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
  showToast('Apertura WhatsApp in corso...', 'info');
}

/**
 * Triggers WhatsApp share for manager by ID
 */
export function shareManagerWhatsAppById(managerId: string): void {
  const manager = state.managers.find(m => m.id === managerId);
  if (!manager) {
    showToast('Allenatore non trovato', 'error');
    return;
  }
  shareViaWhatsApp(manager);
}

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
      const filename = `insalatlas_h2h_${managerA.id}_vs_${managerB.id}_${Date.now()}.png`;
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
        const filename = `insalatlas_h2h_${managerA.id}_vs_${managerB.id}_${Date.now()}.png`;
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
      const filename = `insalatlas_record_${recordId}_${Date.now()}.png`;
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
        const filename = `insalatlas_record_${recordId}_${Date.now()}.png`;
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
  let baseUrl = 'https://fgizzarellids.github.io/insalatlas_sala_trofei/';
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
    `🏆 *InsalAtlas • Record & Primati Storici*`,
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
      const filename = `InsalAtlas_Poster_Hall_Of_Fame_${Date.now()}.png`;
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
        const filename = `InsalAtlas_Poster_Hall_Of_Fame_${Date.now()}.png`;
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
  let baseUrl = 'https://fgizzarellids.github.io/insalatlas_sala_trofei/';
  if (customBaseUrl) {
    baseUrl = customBaseUrl;
  } else if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      baseUrl = `${window.location.origin}${window.location.pathname}`;
    }
  }
  const shareUrl = `${baseUrl}?tab=records`;

  const allRecords = computeAllLeagueRecords(state.managers, state.competitions);
  const count = allRecords.length > 0 ? allRecords.length : 25;

  return `🏆 *InsalAtlas • Hall of Fame Ufficiale (2016-2026)*
📜 *I ${count} RECORD & PRIMATI ALL-TIME DELLA SERIE ATLAS*

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
 * Formats rich banter text and direct link for sharing the Albo d'Oro ranking on WhatsApp
 */
export function buildAlboWhatsAppShareText(customBaseUrl?: string): string {
  let baseUrl = 'https://fgizzarellids.github.io/insalatlas_sala_trofei/';
  if (customBaseUrl) {
    baseUrl = customBaseUrl;
  } else if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      baseUrl = `${window.location.origin}${window.location.pathname}`;
    }
  }
  const shareUrl = `${baseUrl}?tab=albo`;

  // Sort managers by trophies then gold
  const sorted = [...state.managers].sort((a, b) => {
    const totalA = (a.gold || 0) + (a.cup_gold || 0) + (a.supercup || 0) + (a.mundialito || 0);
    const totalB = (b.gold || 0) + (b.cup_gold || 0) + (b.supercup || 0) + (b.mundialito || 0);
    if (totalB !== totalA) return totalB - totalA;
    return (b.gold || 0) - (a.gold || 0);
  });

  const top3 = sorted.slice(0, 3).map((m, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
    const trophies = (m.gold || 0) + (m.cup_gold || 0) + (m.supercup || 0) + (m.mundialito || 0);
    return `${medal} *${m.name}*: ${trophies} Titoli (${m.gold || 0} Scudetti)`;
  }).join('\n');

  return `🏆 *InsalAtlas • Albo d'Oro & Sala Trofei (2016-2026)*
📜 *CLASSIFICA STORICA DEI PIÙ TITOLATI*

${top3}

📊 10 Campionati • 18 Fantallenatori • Albo d'Oro Ufficiale

👉 Esplora la bacheca completa e le stagioni storiche:
${shareUrl}`;
}

/**
 * Opens WhatsApp directly with pre-filled message and direct link to the Albo d'Oro
 */
export function shareAlboWhatsApp(): void {
  const text = buildAlboWhatsAppShareText();
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  if (typeof window !== 'undefined') {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }
  showToast('Apertura WhatsApp in corso...', 'info');
}

/**
 * Triggers high-resolution Albo d'Oro export PNG download
 */
export async function exportAlboHD(): Promise<void> {
  const { exportGraphicHD } = await import('./canvas');
  await exportGraphicHD();
}


