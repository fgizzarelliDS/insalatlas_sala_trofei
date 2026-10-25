import { ThemeKey, TitlesConfig } from '@/types';
import { state } from '@/state';
import { verifyAdminPassword } from '@/config';
import { saveTitles } from '@/storage';
import { renderBoard } from '@/components/board/tableBoard';

/**
 * Changes active visual theme, adjusts body class, re-renders board and notifies user
 * @param theme - 'gala' | 'seriea' | 'gazzetta' | 'studio'
 */
export function changeTheme(theme: ThemeKey): void {
  state.currentTheme = theme;
  document.body.className = `theme-${theme} antialiased selection:bg-amber-500 selection:text-white min-h-screen pb-16`;
  renderBoard();
  showToast(`Palette impostata su: ${theme.toUpperCase()}`, 'info');
}

import { showToast, type ToastType } from '@/utils/toast';

export { showToast, type ToastType };

/**
 * Visually enables edit mode
 */
export function enableEditMode(): void {
  if (state.isEditMode) return;
  state.isEditMode = true;

  const banner = document.getElementById('edit-helper-banner');
  const btn = document.getElementById('btn-edit-mode');
  const label = document.getElementById('edit-mode-label');

  const editableIds = [
    'title-brand-main',
    'title-brand-highlight',
    'title-brand-sub',
    'title-main-heading',
    'title-sub-heading',
    'title-league-caption',
    'th-col-1',
    'th-col-2',
    'th-col-3',
    'th-col-4',
    'th-col-5',
    'th-col-6',
    'th-col-7'
  ];

  if (banner) banner.classList.remove('hidden');
  if (btn) {
    btn.classList.add('bg-amber-500', 'text-slate-950');
    btn.classList.remove('bg-amber-500/20', 'text-amber-300');
  }
  if (label) label.textContent = 'Termina Modifica';

  editableIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.setAttribute('contenteditable', 'true');
      el.classList.add('editable-active');
      el.title = 'Fai clic per modificare questo testo';
    }
  });

  renderBoard();
  showToast('🔓 Accesso consentito: modalità modifica attiva!', 'success');
}

/**
 * Disables and locks edit mode
 */
export function disableEditMode(): void {
  if (!state.isEditMode) return;
  state.isEditMode = false;

  const banner = document.getElementById('edit-helper-banner');
  const btn = document.getElementById('btn-edit-mode');
  const label = document.getElementById('edit-mode-label');

  const editableIds = [
    'title-brand-main',
    'title-brand-highlight',
    'title-brand-sub',
    'title-main-heading',
    'title-sub-heading',
    'title-league-caption',
    'th-col-1',
    'th-col-2',
    'th-col-3',
    'th-col-4',
    'th-col-5',
    'th-col-6',
    'th-col-7'
  ];

  if (banner) banner.classList.add('hidden');
  if (btn) {
    btn.classList.remove('bg-amber-500', 'text-slate-950');
    btn.classList.add('bg-amber-500/20', 'text-amber-300');
  }
  if (label) label.textContent = 'Modifica Dati & Titoli';

  editableIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.removeAttribute('contenteditable');
      el.classList.remove('editable-active');
      el.removeAttribute('title');
    }
  });

  renderBoard();
  showToast('🔒 Modifiche salvate e bloccate.', 'info');
}

/**
 * Toggles edit mode, requiring admin password when turning on
 */
export async function toggleEditMode(): Promise<void> {
  if (!state.isEditMode) {
    const inputPass = prompt('🔐 Inserisci la Password Amministratore per modificare i dati:');
    if (!inputPass) return;

    const isValid = await verifyAdminPassword(inputPass);
    if (!isValid) {
      showToast('❌ Password errata. Accesso negato.', 'error');
      return;
    }
    enableEditMode();
  } else {
    disableEditMode();
  }
}

/**
 * Persists inline title changes to state and storage on element blur
 * @param element - Edited DOM element with data-title-key
 */
export function handleTitleBlur(element: HTMLElement): void {
  const key = element.dataset.titleKey as keyof TitlesConfig;
  if (!key) return;
  state.titles[key] = (element.textContent || '').trim();
  saveTitles();
  showToast('Titolo aggiornato e salvato!', 'info');
}

export { applyTitlesToDOM } from '@/utils/domTitles';
