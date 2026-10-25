import type { Manager } from '@/types';
import { state } from '@/state';
import { showToast } from '@/ui';
import { calculateManagerScore, formatScore } from '@/score';
import { getManagerArchetype, computeGlobalClutchIndex, getClutchTier } from '@/analytics';
import { LEAGUE } from '@/config';
import {
  renderProfileModalCanvas,
  renderManagerStoryCanvas,
  downloadBlob,
  copyBlobToClipboard
} from '@/export/canvas';

/**
 * Formats rich banter text and direct link for WhatsApp sharing with preview
 */
export function buildWhatsAppShareText(manager: Manager, customBaseUrl?: string): string {
  const score = calculateManagerScore(manager);
  const totalMajor = (manager.gold || 0) + (manager.cup_gold || 0) + (manager.supercup || 0) + (manager.mundialito || 0);
  const efficiency = manager.years > 0 ? parseFloat((totalMajor / manager.years).toFixed(2)) : 0;
  const arch = getManagerArchetype(manager, totalMajor, efficiency);

  const completedYears = manager.history && manager.history.length > 0
    ? manager.history.filter(h => !h.in_progress && h.status !== 'in_progress').length
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

  let baseUrl = LEAGUE.siteUrl;
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

  return `🏆 *${LEAGUE.brand.name} • ${LEAGUE.brand.mainTitle}*\n👤 *${manager.name.toUpperCase()}* (${manager.years} ${manager.years === 1 ? 'Stagione' : 'Stagioni'})\n⭐ *Rating Storico:* ${formatScore(score)} PT\n🏅 *Profilo:* ${arch.tag}\n${clutchLine}\n\n📊 *Bacheca:* ${trophiesStr}\n\n👉 Guarda la scheda e i trofei completi:\n${shareUrl}`;
}

/**
 * Captures the #manager-profile-card element in high definition and downloads PNG directly
 */
export async function exportProfileModalHD(manager: Manager): Promise<void> {
  if (state.selectedManagerId !== manager.id && typeof window !== 'undefined' && window.openProfileModal) {
    window.openProfileModal(manager.id);
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
      const filename = `${LEAGUE.filePrefix}_${manager.id}_${Date.now()}.png`;
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
  if (state.selectedManagerId !== manager.id && typeof window !== 'undefined' && window.openProfileModal) {
    window.openProfileModal(manager.id);
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
        const filename = `${LEAGUE.filePrefix}_${manager.id}_${Date.now()}.png`;
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
 * Renders and downloads high-definition 9:16 vertical Instagram/WhatsApp Story for a manager profile
 */
export async function exportProfileStoryHD(manager: Manager): Promise<void> {
  showToast('Generazione Story 9:16 in corso...', 'info');
  const dropdown = document.getElementById('share-dropdown-menu');
  if (dropdown) dropdown.classList.add('hidden');

  try {
    const canvas = await renderManagerStoryCanvas(manager);
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Errore durante la creazione della Story", 'error');
        return;
      }
      const filename = `${LEAGUE.filePrefix}_story_${manager.id}_${Date.now()}.png`;
      downloadBlob(blob, filename);
    }, 'image/png');
  } catch (err) {
    console.error('Story export failed:', err);
    showToast('Impossibile esportare la Story', 'error');
  }
}
