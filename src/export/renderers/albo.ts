import { state } from '@/state';
import { showToast } from '@/ui';
import { renderNodeToCanvas, copyBlobToClipboard } from './core';

/**
 * Prepares and renders the full desktop Albo d'Oro wrapper into a high-res canvas.
 */
export async function renderAlboCanvas(customWrapper?: HTMLElement): Promise<HTMLCanvasElement> {
  const wrapper = customWrapper || document.getElementById('palmares-export-wrapper');
  if (!wrapper) {
    throw new Error('Elemento palmares-export-wrapper non trovato');
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
  clone.querySelector('#albo-add-manager-row')?.remove();
  clone.querySelector('#main-view-tabs')?.remove();
  clone.querySelector('#main-tab-seasons-content')?.remove();
  clone.querySelector('#main-tab-records-content')?.remove();
  clone.querySelector('#albo-toolbar')?.remove();
  clone.querySelectorAll('button').forEach(btn => btn.remove());

  // Ensure Albo tab content is always visible in export
  const alboContent = clone.querySelector('#main-tab-albo-content') as HTMLElement | null;
  if (alboContent) {
    alboContent.classList.remove('hidden');
    alboContent.style.display = 'block';
  }

  // Reveal classic subtitle caption on the export clone
  const captionEl = clone.querySelector('#title-league-caption') as HTMLElement | null;
  if (captionEl) {
    captionEl.classList.remove('hidden');
    captionEl.style.display = 'block';
  }

  // 4. Force desktop column CSS variables on the clone
  clone.style.setProperty('--col-manager', '280px');
  clone.style.setProperty('--col-championship', '270px');
  clone.style.setProperty('--col-spoon', '90px');
  clone.style.setProperty('--col-cup', '150px');
  clone.style.setProperty('--col-supercup', '120px');
  clone.style.setProperty('--col-mundialito', '120px');
  clone.style.setProperty('--col-cartonato', '220px');

  // 5. Ensure desktop 6-column layout for top summary cards (including Banner Cartonato)
  const summaryGrid = clone.querySelector('.grid.grid-cols-2') as HTMLElement | null;
  if (summaryGrid) {
    summaryGrid.style.display = 'grid';
    summaryGrid.style.gridTemplateColumns = 'repeat(6, minmax(0, 1fr))';
    summaryGrid.style.gap = '12px';
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

  // 7. Fix header row: remove sticky, ensure unclipped text and proper padding across all columns
  const headerRow = clone.querySelector('.albo-grid-row') as HTMLElement | null;
  if (headerRow) {
    headerRow.style.paddingTop = '12px';
    headerRow.style.paddingBottom = '12px';
    headerRow.style.overflow = 'visible';
  }

  // De-truncate and unclip all header cells (prevents vertical font clipping in SVG foreignObject)
  clone.querySelectorAll('.albo-grid-row > div').forEach(th => {
    const el = th as HTMLElement;
    el.classList.remove('truncate', 'sticky');
    el.style.position = 'static';
    el.style.overflow = 'visible';
    el.style.lineHeight = '1.35';
    el.style.fontSize = '12px';
    el.style.whiteSpace = 'nowrap';
    el.style.boxShadow = 'none';
  });

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

  return renderNodeToCanvas(clone, targetWidth, exportBg);
}

let isExportingHD = false;

/**
 * Renders #palmares-export-wrapper to a high-resolution PNG image and triggers download.
 * Uses an off-screen desktop clone (~1380px) rendered with html-to-image
 * to prevent mobile column squishing, sticky header displacement, and momentary visual flash.
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

  try {
    const canvas = await renderAlboCanvas(wrapper);
    const link = document.createElement('a');
    link.download = `Palmares_Fantacalcio_${new Date().getFullYear()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Grafica HD scaricata con successo!', 'success');
  } catch (err) {
    console.error(err);
    showToast("Errore durante l'esportazione.", 'error');
  } finally {
    isExportingHD = false;
  }
}

/**
 * Copies the high-resolution Albo d'Oro graphic directly to system clipboard
 */
export async function copyAlboToClipboard(): Promise<boolean> {
  if (isExportingHD) {
    showToast('Esportazione già in corso, attendere...', 'info');
    return false;
  }

  const wrapper = document.getElementById('palmares-export-wrapper');
  if (!wrapper) return false;

  isExportingHD = true;
  showToast('Copia immagine Albo d\'Oro in corso...', 'info');

  try {
    const canvas = await renderAlboCanvas(wrapper);
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast("Errore durante la creazione dell'immagine", 'error');
          resolve(false);
          return;
        }
        const filename = `Palmares_Fantacalcio_${new Date().getFullYear()}.png`;
        const success = await copyBlobToClipboard(blob, filename);
        resolve(success);
      }, 'image/png');
    });
  } catch (err) {
    console.error(err);
    showToast("Impossibile copiare l'immagine dell'Albo", 'error');
    return false;
  } finally {
    isExportingHD = false;
  }
}
