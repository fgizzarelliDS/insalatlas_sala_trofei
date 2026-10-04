import { state } from '@/state';
import { showToast } from '@/ui';

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

  // 6. Build invisible staging container that takes zero space and prevents any layout flash/scroll shift
  const container = document.createElement('div');
  container.id = 'profile-export-staging-container';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '0';
  container.style.height = '0';
  container.style.overflow = 'hidden';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-99999';

  clone.style.position = 'absolute';
  clone.style.left = '0';
  clone.style.top = '0';
  clone.style.width = `${targetWidth}px`;
  clone.style.maxWidth = `${targetWidth}px`;
  clone.style.height = 'auto';
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.boxShadow = 'none';
  clone.style.pointerEvents = 'none';
  clone.style.visibility = 'visible';
  clone.style.opacity = '1';

  container.appendChild(clone);
  document.body.appendChild(container);

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
      windowHeight: fullHeight,
      onclone: (_clonedDoc, clonedEl) => {
        const staging = clonedEl.parentElement;
        if (staging) {
          staging.style.position = 'static';
          staging.style.width = `${targetWidth}px`;
          staging.style.height = 'auto';
          staging.style.overflow = 'visible';
          staging.style.opacity = '1';
          staging.style.visibility = 'visible';
        }
        clonedEl.style.position = 'static';
        clonedEl.style.opacity = '1';
        clonedEl.style.visibility = 'visible';
      }
    });

    return canvas;
  } finally {
    container.remove();
  }
}

let isExportingHD = false;

/**
 * Renders #palmares-export-wrapper to a high-resolution PNG image and triggers download.
 * Uses an off-screen desktop clone (~1380px) inside an isolated zero-sized staging container
 * to prevent mobile column squishing, sticky header displacement, and momentary visual flash/double page.
 */
export async function exportGraphicHD(): Promise<void> {
  if (isExportingHD) {
    showToast('Esportazione già in corso, attendere...', 'info');
    return;
  }

  const wrapper = document.getElementById('palmares-export-wrapper');
  if (!wrapper) return;

  isExportingHD = true;
  showToast('Generazione immagine HD in corso...', 'info');

  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  // 1. Determine dynamic theme background
  const computedWrapperBg = window.getComputedStyle(wrapper).backgroundColor;
  const exportBg = (computedWrapperBg && computedWrapperBg !== 'rgba(0, 0, 0, 0)' && computedWrapperBg !== 'transparent')
    ? computedWrapperBg
    : (state.currentTheme === 'gazzetta' ? '#fce7ec' : state.currentTheme === 'studio' ? '#f1f5f9' : state.currentTheme === 'seriea' ? '#020b1c' : '#090d16');

  // 2. Clone the wrapper for off-screen desktop rendering
  const clone = wrapper.cloneNode(true) as HTMLElement;
  clone.id = 'palmares-export-clone';

  const targetWidth = 1380;

  // 3. Remove interactive and mobile-only elements
  clone.querySelector('#scroll-hint-pill')?.remove();
  clone.querySelectorAll('button').forEach(btn => btn.remove());

  // 4. Force desktop column CSS variables on the clone
  clone.style.setProperty('--col-manager', '280px');
  clone.style.setProperty('--col-championship', '270px');
  clone.style.setProperty('--col-spoon', '90px');
  clone.style.setProperty('--col-cup', '150px');
  clone.style.setProperty('--col-supercup', '120px');
  clone.style.setProperty('--col-mundialito', '120px');
  clone.style.setProperty('--col-cartonato', '220px');

  // 5. Ensure desktop 5-column layout for top summary cards
  const summaryGrid = clone.querySelector('.grid.grid-cols-2') as HTMLElement | null;
  if (summaryGrid) {
    summaryGrid.style.display = 'grid';
    summaryGrid.style.gridTemplateColumns = 'repeat(5, minmax(0, 1fr))';
    summaryGrid.style.gap = '16px';
  }

  // 6. Ensure table scroll container and inner wrapper expand to full desktop width without scroll/cutoffs
  const scrollContainer = clone.querySelector('#table-scroll-container') as HTMLElement | null;
  if (scrollContainer) {
    scrollContainer.style.overflow = 'visible';
    scrollContainer.style.overflowX = 'visible';
    scrollContainer.style.width = '100%';
  }
  const innerWrap = scrollContainer?.firstElementChild as HTMLElement | null;
  if (innerWrap) {
    innerWrap.style.minWidth = '100%';
    innerWrap.style.width = '100%';
    innerWrap.style.overflow = 'visible';
  }

  // 7. Fix header row: remove sticky, ensure unclipped text and proper padding
  const headerRow = clone.querySelector('.albo-grid-row') as HTMLElement | null;
  if (headerRow) {
    headerRow.style.paddingTop = '12px';
    headerRow.style.paddingBottom = '12px';
    headerRow.style.overflow = 'visible';
  }
  const th1 = clone.querySelector('#th-col-1') as HTMLElement | null;
  if (th1) {
    th1.style.position = 'static';
    th1.style.overflow = 'visible';
    th1.style.boxShadow = 'none';
    th1.style.lineHeight = '1.4';
    th1.style.paddingTop = '8px';
    th1.style.paddingBottom = '8px';
    th1.style.fontSize = '12px';
    th1.classList.remove('truncate', 'sticky');
  }

  // 8. Fix shelf rows: remove sticky, unclip manager name and score stats
  const shelfRows = clone.querySelectorAll('.table-shelf-row');
  shelfRows.forEach(row => {
    const rowEl = row as HTMLElement;
    rowEl.style.minHeight = '56px';
    rowEl.style.overflow = 'visible';

    const col1 = rowEl.firstElementChild as HTMLElement | null;
    if (col1) {
      col1.style.position = 'static';
      col1.style.overflow = 'visible';
      col1.style.boxShadow = 'none';
      col1.style.paddingTop = '8px';
      col1.style.paddingBottom = '8px';
      col1.style.paddingLeft = '16px';
      col1.style.paddingRight = '12px';
      col1.classList.remove('overflow-hidden', 'sticky');

      col1.querySelectorAll('div').forEach(d => {
        d.style.overflow = 'visible';
        d.classList.remove('truncate');
      });
    }
  });

  // 9. Build invisible staging container that takes zero space and prevents any layout flash/scroll shift
  const container = document.createElement('div');
  container.id = 'palmares-export-staging-container';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '0';
  container.style.height = '0';
  container.style.overflow = 'hidden';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-99999';

  clone.style.position = 'absolute';
  clone.style.left = '0';
  clone.style.top = '0';
  clone.style.width = `${targetWidth}px`;
  clone.style.minWidth = `${targetWidth}px`;
  clone.style.maxWidth = `${targetWidth}px`;
  clone.style.height = 'auto';
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.boxShadow = 'none';
  clone.style.pointerEvents = 'none';
  clone.style.visibility = 'visible';
  clone.style.opacity = '1';
  clone.style.backgroundColor = exportBg;

  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    const html2canvas = (await import('html2canvas')).default;
    const fullHeight = Math.ceil(clone.scrollHeight || clone.offsetHeight || 1000);

    const canvas = await html2canvas(clone, {
      scale: 2.2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: exportBg,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: targetWidth,
      height: fullHeight,
      windowWidth: targetWidth,
      windowHeight: fullHeight,
      onclone: (_clonedDoc, clonedEl) => {
        const staging = clonedEl.parentElement;
        if (staging) {
          staging.style.position = 'static';
          staging.style.width = `${targetWidth}px`;
          staging.style.height = 'auto';
          staging.style.overflow = 'visible';
          staging.style.opacity = '1';
          staging.style.visibility = 'visible';
        }
        clonedEl.style.position = 'static';
        clonedEl.style.opacity = '1';
        clonedEl.style.visibility = 'visible';
      }
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
    container.remove();
    isExportingHD = false;
  }
}
