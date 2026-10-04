import { state } from '@/state';
import { showToast } from '@/ui';
import { renderBoard } from '@/components/board/tableBoard';

/**
 * Direct file download via anchor tag (bypasses OS Share Sheet completely)
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('Scheda scaricata in HD!', 'success');
}

/**
 * Copies a PNG blob directly to the system clipboard
 */
export async function copyBlobToClipboard(blob: Blob, fallbackFilename = 'insalatlas_scheda.png'): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      showToast('✅ Immagine copiata negli appunti! Incollala su WhatsApp con Cmd+V / Incolla', 'success');
      return true;
    }
    throw new Error('ClipboardItem non supportato dal browser');
  } catch (err) {
    console.warn('Scrittura negli appunti fallita, avvio download diretto:', err);
    downloadBlob(blob, fallbackFilename);
    return false;
  }
}

/**
 * Legacy compatibility wrapper: prefers downloadBlob
 */
export async function shareOrDownloadBlob(blob: Blob, filename: string): Promise<void> {
  downloadBlob(blob, filename);
}

/**
 * Renders an exact off-screen clone of the profile modal card into a high-res canvas.
 * Solves viewport clipping, max-height scrolling cuts, and font metric overlaps.
 */
export async function renderProfileModalCanvas(card: HTMLElement): Promise<HTMLCanvasElement> {
  const clone = card.cloneNode(true) as HTMLElement;
  clone.id = 'manager-profile-card-export-clone';

  // 1. Determine natural width of the card as rendered on screen (default max-w-xl is 576px)
  const cardRect = card.getBoundingClientRect();
  const naturalWidth = Math.round(cardRect.width) || card.offsetWidth || 576;
  const targetWidth = Math.max(naturalWidth, 540);

  // 2. Remove interactive UI controls (close button, footer action buttons, share dropdown)
  clone.querySelector('#profile-modal-close-btn')?.remove();
  clone.querySelector('#profile-modal-footer-actions')?.remove();
  clone.querySelector('#profile-modal-watermark')?.remove();
  clone.querySelector('#share-dropdown-menu')?.remove();

  // 3. Add balanced, elegant closing footer with InsalAtlas • Palmarès Ufficiale (no links/URLs)
  const footer = document.createElement('div');
  footer.className = 'flex items-center justify-center gap-2 pt-3.5 mt-2 border-t text-xs font-bold tracking-wider uppercase opacity-70';
  footer.style.borderColor = 'var(--table-border)';
  footer.style.color = 'var(--text-muted)';
  footer.innerHTML = `
    <img src="favicon-64x64.png" alt="InsalAtlas" class="w-4 h-4 object-contain inline-block">
    <span>InsalAtlas • Palmarès Ufficiale</span>
  `;
  clone.appendChild(footer);

  // 4. Ensure clear vertical spacing so Montserrat font never overlaps badge
  const nameEl = clone.querySelector('#profile-name') as HTMLElement | null;
  if (nameEl) {
    nameEl.style.lineHeight = '1.35';
    nameEl.style.marginBottom = '6px';
    nameEl.style.display = 'block';
  }
  const badgeEl = clone.querySelector('#profile-years-badge') as HTMLElement | null;
  if (badgeEl) {
    badgeEl.style.display = 'inline-block';
    badgeEl.style.marginTop = '0';
  }

  // 5. Obtain computed background and theme colors
  const computedBg = window.getComputedStyle(card).backgroundColor || '#0f172a';

  // 6. Position clone off-screen at full natural height and exact width with zero clipping
  clone.style.position = 'fixed';
  clone.style.left = '0';
  clone.style.top = '0';
  clone.style.zIndex = '-9999';
  clone.style.width = `${targetWidth}px`;
  clone.style.maxWidth = `${targetWidth}px`;
  clone.style.height = 'auto';
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.boxShadow = 'none';
  clone.style.pointerEvents = 'none';
  clone.style.visibility = 'visible';
  clone.style.opacity = '1';

  document.body.appendChild(clone);

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const html2canvas = (await import('html2canvas')).default;
    const fullHeight = Math.ceil(clone.scrollHeight || clone.offsetHeight || 600);

    const canvas = await html2canvas(clone, {
      scale: 2.2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: computedBg,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: targetWidth,
      height: fullHeight,
      windowWidth: targetWidth,
      windowHeight: fullHeight
    });

    return canvas;
  } finally {
    clone.remove();
  }
}

/**
 * Renders #palmares-export-wrapper to a high-resolution PNG image and triggers download
 */
export async function exportGraphicHD(): Promise<void> {
  const wrapper = document.getElementById('palmares-export-wrapper');
  if (!wrapper) return;

  showToast('Generazione immagine HD in corso...', 'info');

  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  let exportBg = '#090d16';
  if (state.currentTheme === 'gala') exportBg = '#090d16';
  if (state.currentTheme === 'seriea') exportBg = '#020b1c';
  if (state.currentTheme === 'gazzetta') exportBg = '#fce7ec';
  if (state.currentTheme === 'studio') exportBg = '#f1f5f9';

  const prevScrollX = window.scrollX;
  const prevScrollY = window.scrollY;
  window.scrollTo(0, 0);

  const prevDisplayMode = state.displayMode;
  let modeTemporarilySwitched = false;

  if (prevDisplayMode !== 'multiple') {
    state.displayMode = 'multiple';
    renderBoard();
    modeTemporarilySwitched = true;
  }

  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(wrapper, {
      scale: 2.2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: exportBg,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.max(document.documentElement.scrollWidth, 1380)
    });

    const link = document.createElement('a');
    link.download = `Palmares_Fantacalcio_${new Date().getFullYear()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Grafica HD scaricata con successo!', 'success');
  } catch (err) {
    console.error(err);
    showToast("Errore durante l'esportazione.", 'error');
  } finally {
    if (modeTemporarilySwitched) {
      state.displayMode = prevDisplayMode;
      renderBoard();
    }
    window.scrollTo(prevScrollX, prevScrollY);
  }
}
