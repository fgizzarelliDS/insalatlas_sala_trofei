import { renderNodeToCanvas } from './core';

/**
 * Renders an exact off-screen clone of the Trophy Roll of Honor modal dialog into a high-res canvas.
 * Expands scrollable lists to ensure all editions are captured, strips interactive buttons and dropdowns,
 * and attaches an elegant official InsalAtlas footer.
 */
export async function renderTrophyModalCanvas(dialog: HTMLElement): Promise<HTMLCanvasElement> {
  const clone = dialog.cloneNode(true) as HTMLElement;
  clone.id = 'trophy-modal-export-clone';

  // 1. Natural width (max-w-2xl is 672px)
  const dialogRect = dialog.getBoundingClientRect();
  const naturalWidth = Math.round(dialogRect.width) || dialog.offsetWidth || 672;
  const targetWidth = Math.max(naturalWidth, 640);

  // 2. Remove interactive UI controls (close button, share dropdown)
  clone.querySelector('#trophy-share-dropdown-menu')?.remove();
  clone.querySelector('#btn-trophy-share-dropdown')?.closest('.relative')?.remove();
  clone.querySelectorAll('button').forEach(btn => {
    const onclick = btn.getAttribute('onclick') || '';
    if (
      onclick.includes('closeTrophyModal') ||
      onclick.includes('toggleTrophyShareDropdown') ||
      onclick.includes('shareTrophyWhatsApp') ||
      btn.title === 'Chiudi'
    ) {
      btn.remove();
    }
  });

  // 3. Remove height constraints & scrolling on modal body so ALL editions are rendered
  clone.classList.remove('max-h-[90vh]', 'overflow-y-auto');
  clone.style.maxHeight = 'none';
  clone.style.height = 'auto';

  const bodyEl = clone.querySelector('.overflow-y-auto') as HTMLElement | null;
  if (bodyEl) {
    bodyEl.classList.remove('overflow-y-auto');
    bodyEl.style.overflow = 'visible';
    bodyEl.style.maxHeight = 'none';
    bodyEl.style.height = 'auto';
  }

  // 4. Replace footer with clean InsalAtlas watermark badge
  const footerEl = clone.querySelector('.border-t.flex.items-center.justify-between') as HTMLElement | null;
  if (footerEl) {
    footerEl.innerHTML = `
      <div class="flex items-center justify-center gap-2 w-full py-1 text-xs font-bold tracking-wider uppercase opacity-70"
        style="color: var(--text-muted);">
        <img src="favicon-64x64.png" alt="InsalAtlas" class="w-4 h-4 object-contain inline-block">
        <span>InsalAtlas • Albo d'Oro Ufficiale</span>
      </div>
    `;
  }

  const computedBg = (typeof window !== 'undefined' ? window.getComputedStyle(dialog).backgroundColor : '') || '#0f172a';
  return renderNodeToCanvas(clone, targetWidth, computedBg);
}
