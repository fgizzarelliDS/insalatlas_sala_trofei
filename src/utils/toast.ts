import { escapeHtml } from './dom';

export type ToastType = 'info' | 'success' | 'error';

const TOAST_ICONS: Record<ToastType, string> = {
  success: 'fa-solid fa-circle-check text-emerald-400',
  error: 'fa-solid fa-circle-exclamation text-red-400',
  info: 'fa-solid fa-circle-info text-amber-400'
};

const TOAST_COLORS: Record<ToastType, string> = {
  success: 'bg-emerald-600 text-white border-emerald-400',
  error: 'bg-red-600 text-white border-red-400',
  info: 'bg-slate-900 text-amber-300 border-amber-500/50'
};

/**
 * Injects animated alert notification into #toast-box with auto-dismiss after 3200ms
 * @param msg - Message text (escaped automatically to prevent HTML injection)
 * @param type - Severity level ('info' | 'success' | 'error')
 */
export function showToast(msg: string, type: ToastType = 'info'): void {
  const box = document.getElementById('toast-box');
  if (!box) return;

  const toast = document.createElement('div');
  const iconClass = TOAST_ICONS[type] || TOAST_ICONS.info;
  const colorClass = TOAST_COLORS[type] || TOAST_COLORS.info;

  toast.className = `px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold border transition-all duration-300 transform translate-y-3 opacity-0 flex items-center gap-2.5 ${colorClass}`;
  toast.innerHTML = `<i class="${iconClass}"></i> <span>${escapeHtml(msg)}</span>`;

  box.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-3', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-3');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
