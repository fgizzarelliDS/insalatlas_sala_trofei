import { state } from '@/state';
import { showToast } from '@/ui';
import { ALBO_COLUMNS, getActiveCompetitions, getCompetitionDef } from '@/config';
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

  // 4. Compute dynamic column template and widths based on enabled ALBO_COLUMNS
  let sumColWidths = 280; // manager base width
  clone.style.setProperty('--col-manager', '280px');

  for (const comp of getActiveCompetitions()) {
    const width = comp.grid.desktopWidthPx || 120;
    sumColWidths += width;
    clone.style.setProperty(`--col-${comp.id}`, `${width}px`);
  }

  const columnWeights: Record<string, string> = {
    manager: 'minmax(240px, 1.5fr)',
    championship: 'minmax(220px, 1.4fr)',
    cup: 'minmax(140px, 0.9fr)',
    supercup: 'minmax(130px, 0.8fr)',
    mundialito: 'minmax(130px, 0.8fr)',
    spoon: 'minmax(70px, 0.5fr)',
    cartonato: 'minmax(160px, 1.2fr)'
  };
  const dynamicColsTemplate = ALBO_COLUMNS.map(c => {
    if (c.key === 'manager') return 'minmax(240px, 1.5fr)';
    return columnWeights[c.key] || getCompetitionDef(c.key)?.grid.desktopTrack || 'minmax(120px, 1fr)';
  }).join(' ');

  clone.style.setProperty('--albo-cols', dynamicColsTemplate);

  // Scalable canvas width: max(1380, sum of column widths + safe padding)
  const targetWidth = Math.max(1380, sumColWidths + 80);

  // 5. Ensure dynamic column layout for top summary cards (adapts cleanly to active cards)
  const summaryGrid = clone.querySelector('.grid.grid-cols-2') as HTMLElement | null;
  if (summaryGrid) {
    const visibleCards = Array.from(summaryGrid.children).filter(
      c => (c as HTMLElement).style.display !== 'none' && !c.classList.contains('hidden')
    ).length;
    summaryGrid.style.display = 'grid';
    summaryGrid.style.gridTemplateColumns = `repeat(${visibleCards || 4}, minmax(0, 1fr))`;
    summaryGrid.style.gap = '12px';
  }

  // 6. Ensure table scroll container and inner wrapper expand to full desktop width without scroll/cutoffs
  const scrollContainer = clone.querySelector('#table-scroll-container') as HTMLElement | null;
  if (scrollContainer) {
    scrollContainer.style.overflow = 'visible';
    scrollContainer.style.overflowX = 'visible';
    scrollContainer.style.width = '100%';
    scrollContainer.style.maxWidth = 'none';
  }
  const innerWrap = scrollContainer?.firstElementChild as HTMLElement | null;
  if (innerWrap) {
    innerWrap.classList.remove('w-max');
    innerWrap.style.minWidth = '100%';
    innerWrap.style.width = '100%';
    innerWrap.style.maxWidth = 'none';
    innerWrap.style.overflow = 'visible';
  }

  const tableWrap = clone.querySelector('.albo-table-wrap') as HTMLElement | null;
  if (tableWrap) {
    tableWrap.style.width = '100%';
    tableWrap.style.maxWidth = 'none';
  }

  // 7. Fix header row: remove sticky, apply dynamicColsTemplate inline to beat mobile @media queries
  const headerRow = clone.querySelector('.albo-grid-row') as HTMLElement | null;
  if (headerRow) {
    headerRow.style.paddingTop = '12px';
    headerRow.style.paddingBottom = '12px';
    headerRow.style.overflow = 'visible';
    headerRow.style.width = '100%';
    headerRow.style.maxWidth = 'none';
    headerRow.style.minWidth = '100%';
    headerRow.style.boxSizing = 'border-box';
    headerRow.style.gridTemplateColumns = dynamicColsTemplate;
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

  // 8. Fix shelf rows: remove sticky, unclip manager name and apply dynamicColsTemplate inline
  const shelfRows = clone.querySelectorAll('.table-shelf-row');
  shelfRows.forEach(row => {
    const rowEl = row as HTMLElement;
    rowEl.style.minHeight = '56px';
    rowEl.style.overflow = 'visible';
    rowEl.style.width = '100%';
    rowEl.style.maxWidth = 'none';
    rowEl.style.minWidth = '100%';
    rowEl.style.boxSizing = 'border-box';
    rowEl.style.gridTemplateColumns = dynamicColsTemplate;

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
