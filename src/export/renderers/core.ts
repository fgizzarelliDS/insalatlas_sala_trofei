import { showToast } from '@/utils/toast';
import { LEAGUE } from '@/config';

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
  // Delay revoke to prevent iOS Safari cancelling the pending download task
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  showToast('Scheda scaricata in HD!', 'success');
}

/**
 * Copies a PNG blob directly to the system clipboard
 */
export async function copyBlobToClipboard(blob: Blob, fallbackFilename = `${LEAGUE.filePrefix}_scheda.png`): Promise<boolean> {
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
 * Generic high-resolution canvas renderer using native browser SVG foreignObject (html-to-image).
 * - Avoids html2canvas text baseline shifts, font dropping, and image rasterization glitches.
 * - Inlines Google Fonts (Montserrat, Inter) and Font Awesome 6 icons automatically.
 * - Executes an off-screen warm-up pass for Safari/iOS image decode reliability.
 */
export async function renderNodeToCanvas(
  element: HTMLElement,
  targetWidth: number,
  backgroundColor: string,
  pixelRatio = 2.2,
  targetHeight?: number
): Promise<HTMLCanvasElement> {
  // 1. Ensure all live images inside element are fully loaded
  const origImages = Array.from(element.querySelectorAll<HTMLImageElement>('img'));
  if (origImages.length > 0) {
    await Promise.all(
      origImages.map(img => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise<void>(resolve => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
          setTimeout(resolve, 800);
        });
      })
    );
  }

  // 2. Stage off-screen container invisible to user
  const container = document.createElement('div');
  container.id = 'league-export-staging-container';
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = `${targetWidth}px`;
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-99999';

  element.style.width = `${targetWidth}px`;
  element.style.maxWidth = `${targetWidth}px`;
  if (targetHeight) {
    element.style.height = `${targetHeight}px`;
    element.style.maxHeight = `${targetHeight}px`;
    element.style.minHeight = `${targetHeight}px`;
    element.style.overflow = 'hidden';
  } else {
    element.style.height = 'auto';
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';
  }
  element.style.margin = '0';
  element.style.boxShadow = 'none';

  // Ensure any scrollable modal sub-containers expand fully and do not render scrollbars
  element.querySelectorAll<HTMLElement>('.overflow-y-auto, .overflow-y-scroll, [class*="max-h-"]').forEach(el => {
    el.classList.remove('overflow-y-auto', 'overflow-y-scroll');
    el.style.overflow = 'visible';
    el.style.maxHeight = 'none';
    el.style.height = 'auto';
  });

  container.appendChild(element);
  document.body.appendChild(container);

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const { toCanvas, getFontEmbedCSS } = await import('html-to-image');

    let fontEmbedCSS: string | undefined;
    try {
      fontEmbedCSS = await getFontEmbedCSS(element);
    } catch (e) {
      console.warn('Font embedding notice:', e);
    }

    const opts: Record<string, unknown> = {
      pixelRatio,
      backgroundColor,
      width: targetWidth,
      cacheBust: true,
      fontEmbedCSS,
      style: { margin: '0', transform: 'none' }
    };
    if (targetHeight) {
      opts.height = targetHeight;
    }

    // Warm-up pass for image decoders (Safari/iOS)
    await toCanvas(element, opts);
    const canvas = await toCanvas(element, opts);
    return canvas;
  } finally {
    container.remove();
  }
}
