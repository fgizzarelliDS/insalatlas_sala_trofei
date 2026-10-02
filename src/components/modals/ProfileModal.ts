import { state } from '@/state';
import { calculateManagerScore } from '@/score';
import { populateProfileModalDOM } from './ProfileModalTemplate';
import {
  shareViaWhatsApp,
  exportProfileModalHD,
  copyProfileModalToClipboard
} from '@/export';

/**
 * Opens read-only manager profile modal displaying career honors and trophy shelf
 * @param id - Manager unique ID
 */
export function openProfileModal(id: string): void {
  const m = state.managers.find(item => item.id === id);
  if (!m) return;
  state.selectedManagerId = id;

  const totalMajor = (m.gold || 0) + (m.cup_gold || 0) + (m.supercup || 0) + (m.mundialito || 0);
  const score = calculateManagerScore(m);
  const successRate = m.years > 0 ? Math.round((totalMajor / m.years) * 100) : 0;

  populateProfileModalDOM(m, score, totalMajor, successRate);

  const modal = document.getElementById('manager-profile-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  // Synchronize browser URL query param with ?manager=<id>
  if (typeof window !== 'undefined' && window.history && window.location) {
    const url = new URL(window.location.href);
    url.searchParams.set('manager', id);
    window.history.replaceState({ managerId: id }, '', url.toString());
  }
}

/**
 * Closes manager profile modal and cleans URL
 */
export function closeProfileModal(): void {
  closeShareDropdown();
  const modal = document.getElementById('manager-profile-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  state.selectedManagerId = null;

  // Clear query param from browser URL
  if (typeof window !== 'undefined' && window.history && window.location) {
    const url = new URL(window.location.href);
    if (url.searchParams.has('manager')) {
      url.searchParams.delete('manager');
      window.history.replaceState({}, '', url.toString());
    }
  }
}

/**
 * Toggles the export / share dropdown menu inside the profile modal
 */
export function toggleShareDropdown(e?: Event): void {
  if (e) {
    e.stopPropagation();
  }
  const dropdown = document.getElementById('share-dropdown-menu');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
}

/**
 * Closes the export / share dropdown menu inside the profile modal
 */
export function closeShareDropdown(): void {
  const dropdown = document.getElementById('share-dropdown-menu');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    dropdown.classList.add('hidden');
  }
}

/**
 * Triggers HD Profile Modal export for currently opened profile
 */
export async function exportCurrentProfileModalHD(): Promise<void> {
  if (!state.selectedManagerId) return;
  const manager = state.managers.find(m => m.id === state.selectedManagerId);
  if (manager) {
    await exportProfileModalHD(manager);
  }
}

/**
 * Copies HD Profile Modal image directly to clipboard for currently opened profile
 */
export async function copyCurrentProfileModalToClipboard(): Promise<void> {
  if (!state.selectedManagerId) return;
  const manager = state.managers.find(m => m.id === state.selectedManagerId);
  if (manager) {
    await copyProfileModalToClipboard(manager);
  }
}

/**
 * Backward-compatibility alias for exportCurrentProfileModalHD
 */
export async function exportCurrentManagerCard(): Promise<void> {
  await exportCurrentProfileModalHD();
}

/**
 * Triggers direct WhatsApp share for currently opened profile
 */
export function shareCurrentManagerWhatsApp(): void {
  if (!state.selectedManagerId) return;
  const manager = state.managers.find(m => m.id === state.selectedManagerId);
  if (manager) {
    shareViaWhatsApp(manager);
  }
}

/**
 * Backward-compatibility alias for copyCurrentProfileModalToClipboard
 */
export async function copyCurrentManagerCardToClipboard(): Promise<void> {
  await copyCurrentProfileModalToClipboard();
}
