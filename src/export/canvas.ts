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
 * Generic high-resolution canvas renderer using native browser SVG foreignObject (html-to-image).
 * - Avoids html2canvas text baseline shifts, font dropping, and image rasterization glitches.
 * - Inlines Google Fonts (Montserrat, Inter) and Font Awesome 6 icons automatically.
 * - Executes an off-screen warm-up pass for Safari/iOS image decode reliability.
 */
async function renderNodeToCanvas(
  element: HTMLElement,
  targetWidth: number,
  backgroundColor: string,
  pixelRatio = 2.2
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
  container.id = 'insalatlas-export-staging-container';
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = `${targetWidth}px`;
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-99999';

  element.style.width = `${targetWidth}px`;
  element.style.maxWidth = `${targetWidth}px`;
  element.style.height = 'auto';
  element.style.maxHeight = 'none';
  element.style.overflow = 'visible';
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

    const opts = {
      pixelRatio,
      backgroundColor,
      width: targetWidth,
      cacheBust: true,
      fontEmbedCSS,
      style: { margin: '0', transform: 'none' }
    };

    // Warm-up pass for image decoders (Safari/iOS)
    await toCanvas(element, opts);
    const canvas = await toCanvas(element, opts);
    return canvas;
  } finally {
    container.remove();
  }
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

  // 2. Remove interactive UI controls (close button, footer action buttons, share dropdown, tabs, career content)
  clone.querySelector('#profile-modal-close-btn')?.remove();
  clone.querySelector('#profile-modal-footer-actions')?.remove();
  clone.querySelector('#profile-modal-watermark')?.remove();
  clone.querySelector('#share-dropdown-menu')?.remove();
  clone.querySelector('#profile-modal-tabs')?.remove();
  clone.querySelector('#profile-tab-career-content')?.remove();
  clone.querySelectorAll('.competition-drawer').forEach(el => el.remove());

  // Ensure Tab 1 (Bacheca & Palmarès) is always active and visible in exported card
  const palmaresContent = clone.querySelector('#profile-tab-palmares-content') as HTMLElement | null;
  if (palmaresContent) {
    palmaresContent.classList.remove('hidden');
    palmaresContent.style.display = 'block';
  }

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

  const computedBg = window.getComputedStyle(card).backgroundColor || '#0f172a';
  return renderNodeToCanvas(clone, targetWidth, computedBg);
}

/**
 * Renders an exact off-screen clone of the H2H 1vs1 duel modal card into a high-res canvas.
 * Strips dropdowns, interactive action buttons, and adds InsalAtlas official closing footer.
 */
export async function renderH2HDuelCanvas(card: HTMLElement): Promise<HTMLCanvasElement> {
  const clone = card.cloneNode(true) as HTMLElement;
  clone.id = 'h2h-duel-card-export-clone';

  // 1. Determine natural width of the card (default max-w-2xl is 672px)
  const cardRect = card.getBoundingClientRect();
  const naturalWidth = Math.round(cardRect.width) || card.offsetWidth || 672;
  const targetWidth = Math.max(naturalWidth, 680);

  // 2. Remove interactive UI controls
  // Remove the top-right header action group (close button + matrix switcher)
  clone.querySelector('.flex.items-center.gap-2.self-end')?.remove();

  // Remove interactive segmented control wrappers (sub-tabs, radar vs bars) to prevent ghost empty circles
  clone.querySelectorAll('.flex.items-center.p-0\\.5').forEach(el => el.remove());

  // Remove interactive buttons (share buttons, dropdowns, close, toggles, chronology accordion)
  clone.querySelectorAll('button').forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick') || '';
    if (
      onclickAttr.includes('closeHeadToHeadModal') ||
      onclickAttr.includes('toggleH2HShareDropdown') ||
      onclickAttr.includes('setH2HTab') ||
      onclickAttr.includes('setH2HVisualMode') ||
      onclickAttr.includes('toggleH2HChronology') ||
      btn.id.includes('share') ||
      btn.id.includes('close')
    ) {
      if (onclickAttr.includes('toggleH2HChronology')) {
        btn.closest('.text-center')?.remove();
      } else {
        btn.remove();
      }
    }
  });

  clone.querySelector('#btn-h2h-share-dropdown')?.closest('.relative')?.remove();
  clone.querySelector('#h2h-share-dropdown-menu')?.remove();

  // Remove the footer bar completely
  const footerBar = clone.querySelector('.border-t.px-4.sm\\:px-6.py-3');
  if (footerBar) footerBar.remove();

  // Remove interactive dropdown selectors row completely for the export card
  clone.querySelector('#h2h-hero-dropdown-selectors')?.remove();
  const heroCardsRow = clone.querySelector('#h2h-hero-cards-row') as HTMLElement | null;
  if (heroCardsRow) {
    heroCardsRow.classList.remove('mt-3', 'pt-3', 'border-t', 'items-center');
    heroCardsRow.classList.add('items-stretch');
    heroCardsRow.style.marginTop = '0';
    heroCardsRow.style.paddingTop = '0';
    heroCardsRow.style.borderTop = 'none';
    heroCardsRow.style.alignItems = 'stretch';
  }

  // Ensure hero contender cards have equal height and unclipped badges
  clone.querySelectorAll('#h2h-hero-cards-row .col-span-5').forEach(cardEl => {
    const el = cardEl as HTMLElement;
    el.classList.remove('h-full');
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.justifyContent = 'space-between';
    el.style.alignItems = 'center';
    el.style.minHeight = '154px';
    el.style.height = 'auto';
    el.style.overflow = 'visible';
  });

  // Resolve theme colors for contender A and B from card computed style
  const computedCardStyle = window.getComputedStyle(card);
  const colorA = computedCardStyle.getPropertyValue('--h2h-contender-a').trim() || '#be123c';
  const colorB = computedCardStyle.getPropertyValue('--h2h-contender-b').trim() || '#0284c7';

  clone.style.setProperty('--h2h-contender-a', colorA);
  clone.style.setProperty('--h2h-contender-b', colorB);

  // In SVG elements, CSS variables inside presentation attributes (fill="var(...)")
  // are not resolved in foreignObject data URL rendering and fall back to black (#000000).
  // Surgically replace them with the concrete hex/rgb colors:
  clone.querySelectorAll('polygon, circle, line, path').forEach(svgEl => {
    ['fill', 'stroke'].forEach(attr => {
      const val = svgEl.getAttribute(attr);
      if (val && val.includes('--h2h-contender-a')) {
        svgEl.setAttribute(attr, colorA);
        (svgEl as SVGElement).style.setProperty(attr, colorA, 'important');
      } else if (val && val.includes('--h2h-contender-b')) {
        svgEl.setAttribute(attr, colorB);
        (svgEl as SVGElement).style.setProperty(attr, colorB, 'important');
      }
    });
  });

  // Ensure contender names have plenty of room
  clone.querySelectorAll('.h2h-contender-name').forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.lineHeight = '1.35';
    htmlEl.style.marginTop = '4px';
    htmlEl.style.marginBottom = '6px';
    htmlEl.style.display = 'block';
    htmlEl.style.overflow = 'visible';
    htmlEl.style.whiteSpace = 'normal';
  });

  // Expand modal content and body to natural full height (eliminate vertical scrollbar and cutoffs)
  clone.style.height = 'auto';
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';

  const modalContent = clone.querySelector('#head-to-head-modal-content') as HTMLElement | null;
  if (modalContent) {
    modalContent.style.height = 'auto';
    modalContent.style.maxHeight = 'none';
    modalContent.style.overflow = 'visible';
  }

  const scrollableBody = clone.querySelector('.overflow-y-auto') as HTMLElement | null;
  if (scrollableBody) {
    scrollableBody.classList.remove('overflow-y-auto', 'flex-1');
    scrollableBody.style.overflow = 'visible';
    scrollableBody.style.height = 'auto';
    scrollableBody.style.maxHeight = 'none';
    scrollableBody.style.scrollbarWidth = 'none';
  }

  // 3. Add balanced, elegant closing footnote INSIDE the scrollable body
  const targetParent = scrollableBody || clone;

  const footer = document.createElement('div');
  footer.className = 'flex items-center justify-center gap-2 py-4 mt-3 border-t text-xs font-bold tracking-wider uppercase opacity-85';
  footer.style.borderColor = 'var(--table-border)';
  footer.style.color = 'var(--text-muted)';
  footer.innerHTML = `
    <img src="favicon-64x64.png" alt="InsalAtlas" class="w-4 h-4 object-contain inline-block rounded-full shadow-sm">
    <span class="font-extrabold tracking-widest text-[11px]" style="color: var(--text-main);">InsalAtlas</span>
    <span class="opacity-40">•</span>
    <span class="text-[10px] tracking-wider" style="color: var(--accent-color);">Head-to-Head Ufficiale</span>
  `;
  targetParent.appendChild(footer);

  const computedBg = window.getComputedStyle(card).backgroundColor || '#0f172a';
  return renderNodeToCanvas(clone, targetWidth, computedBg);
}

/**
 * Renders an exact off-screen clone of an individual Hall of Fame Record card into a high-res canvas.
 * Uses html-to-image (SVG foreignObject): the browser's own layout engine renders the card, so
 * pills, badges, crests and text are pixel-identical to the on-screen card (no html2canvas offsets).
 * Integrates a unified InsalAtlas official closing footer in place of the share actions.
 */
export async function renderRecordCardCanvas(card: HTMLElement): Promise<HTMLCanvasElement> {
  const clone = card.cloneNode(true) as HTMLElement;
  clone.id = 'record-card-export-clone';

  // 1. Determine natural width of the card, ensuring a minimum for sharp layout
  const cardRect = card.getBoundingClientRect();
  const naturalWidth = Math.round(cardRect.width) || card.offsetWidth || 440;
  const targetWidth = Math.max(naturalWidth, 480);

  // 2. Replace share actions inside the existing footer with InsalAtlas branding (single footer)
  const actionsContainer = clone.querySelector<HTMLElement>('.record-card-actions');
  if (actionsContainer) {
    const brandPill = document.createElement('div');
    brandPill.className = 'flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase opacity-80 shrink-0';
    brandPill.style.color = 'var(--text-muted)';
    brandPill.innerHTML = `
      <img src="favicon-64x64.png" alt="InsalAtlas" class="w-3.5 h-3.5 object-contain inline-block rounded-full">
      <span class="font-extrabold tracking-widest text-[10px]" style="color: var(--text-main);">InsalAtlas</span>
      <span class="opacity-40">•</span>
      <span class="text-[9px] tracking-wider" style="color: var(--accent-color);">Record Ufficiale</span>
    `;
    actionsContainer.replaceWith(brandPill);
  }
  clone.querySelectorAll('[id^="record-share-dropdown-"]').forEach(el => el.remove());

  const computedBg = window.getComputedStyle(card).backgroundColor || '#0f172a';
  return renderNodeToCanvas(clone, targetWidth, computedBg);
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

    const canvas = await renderNodeToCanvas(clone, targetWidth, exportBg);
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
