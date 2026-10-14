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
  const targetWidth = Math.max(naturalWidth, 600);

  // 2. Remove interactive UI controls (close buttons, footer action buttons, share dropdown, tab switchers)
  clone.querySelectorAll('button').forEach(btn => {
    // Keep internal toggles/buttons visually clean if needed, or remove controls
    const onclickAttr = btn.getAttribute('onclick') || '';
    if (
      onclickAttr.includes('closeHeadToHeadModal') ||
      onclickAttr.includes('toggleH2HShareDropdown') ||
      onclickAttr.includes('setH2HTab') ||
      onclickAttr.includes('setH2HVisualMode') ||
      btn.id.includes('share') ||
      btn.id.includes('close')
    ) {
      btn.remove();
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
    heroCardsRow.classList.remove('mt-3', 'pt-3', 'border-t');
    heroCardsRow.style.marginTop = '0';
    heroCardsRow.style.paddingTop = '0';
    heroCardsRow.style.borderTop = 'none';
  }

  // Ensure contender names have plenty of vertical room and never get clipped in html2canvas
  clone.querySelectorAll('.h2h-contender-name').forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.lineHeight = '1.35';
    htmlEl.style.marginTop = '4px';
    htmlEl.style.marginBottom = '6px';
    htmlEl.style.display = 'block';
    htmlEl.style.overflow = 'visible';
    htmlEl.style.whiteSpace = 'normal';
  });

  // 3. Add balanced, elegant closing footnote INSIDE the scrollable body (so it's framed within the rounded card)
  const scrollableBody = clone.querySelector('.overflow-y-auto') as HTMLElement | null;
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

  // 4. Obtain computed background and theme colors
  const computedBg = window.getComputedStyle(card).backgroundColor || '#0f172a';

  // 5. Build invisible staging container that takes zero space and prevents any layout flash/scroll shift
  const container = document.createElement('div');
  container.id = 'h2h-export-staging-container';
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
    const fullHeight = Math.ceil(clone.scrollHeight || clone.offsetHeight || 700);

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

/**
 * Renders an exact off-screen clone of an individual Hall of Fame Record card into a high-res canvas.
 * Pre-rasterizes logos/crests to avoid blank SVGs in html2canvas, normalizes metric/text alignment,
 * cleans watermark rotation clipping, and integrates a unified InsalAtlas official closing footer.
 */
export async function renderRecordCardCanvas(card: HTMLElement): Promise<HTMLCanvasElement> {
  // 1. Ensure all live images are complete before cloning
  const origImages = Array.from(card.querySelectorAll<HTMLImageElement>('img'));
  if (origImages.length > 0) {
    await Promise.all(
      origImages.map(img => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise<void>(resolve => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(resolve, 500);
        });
      })
    );
  }

  const clone = card.cloneNode(true) as HTMLElement;
  clone.id = 'record-card-export-clone';

  // 2. Pre-rasterize all <img> elements from live card onto off-screen canvases as PNG data URLs
  // This solves the html2canvas blank SVG bug and guarantees CORS-free, synchronous rendering.
  const cloneImages = Array.from(clone.querySelectorAll<HTMLImageElement>('img'));
  for (let i = 0; i < origImages.length; i++) {
    const origImg = origImages[i];
    const cloneImg = cloneImages[i];
    if (!origImg || !cloneImg) continue;

    try {
      const w = origImg.naturalWidth || origImg.clientWidth || 100;
      const h = origImg.naturalHeight || origImg.clientHeight || 100;
      const rasterCanvas = document.createElement('canvas');
      const scaleFactor = 2;
      rasterCanvas.width = Math.max(Math.round(w * scaleFactor), 120);
      rasterCanvas.height = Math.max(Math.round(h * scaleFactor), 120);
      const ctx = rasterCanvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(origImg, 0, 0, rasterCanvas.width, rasterCanvas.height);
        const dataUrl = rasterCanvas.toDataURL('image/png');
        cloneImg.src = dataUrl;
        cloneImg.removeAttribute('onerror');
      }
    } catch (e) {
      console.warn('Unable to rasterize image for card export clone:', origImg.src, e);
    }
  }

  // 3. Determine natural width of the card, ensuring a minimum for sharp layout
  const cardRect = card.getBoundingClientRect();
  const naturalWidth = Math.round(cardRect.width) || card.offsetWidth || 440;
  const targetWidth = Math.max(naturalWidth, 480);

  // 4. Integrate InsalAtlas official branding directly into existing card footer (no duplicate stacked footer)
  const existingFooter = clone.querySelector<HTMLElement>('.record-card-footer');
  const actionsContainer = clone.querySelector<HTMLElement>('.record-card-actions');

  if (actionsContainer && existingFooter) {
    const brandPill = document.createElement('div');
    brandPill.className = 'flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase opacity-80 shrink-0';
    brandPill.style.color = 'var(--text-muted)';
    brandPill.innerHTML = `
      <img src="favicon-64x64.png" alt="InsalAtlas" class="w-3.5 h-3.5 object-contain inline-block rounded-full shadow-xs">
      <span class="font-extrabold tracking-widest text-[10px]" style="color: var(--text-main);">InsalAtlas</span>
      <span class="opacity-40">•</span>
      <span class="text-[9px] tracking-wider" style="color: var(--accent-color);">Record Ufficiale</span>
    `;
    actionsContainer.replaceWith(brandPill);

    existingFooter.style.display = 'flex';
    existingFooter.style.alignItems = 'center';
    existingFooter.style.justifyContent = 'space-between';
    existingFooter.style.gap = '8px';
    existingFooter.style.paddingTop = '10px';
    existingFooter.style.marginTop = '12px';
    existingFooter.style.borderTop = '1px solid var(--table-border)';
  } else {
    clone.querySelectorAll('.record-card-actions, [id^="record-share-dropdown-"]').forEach(el => el.remove());
    const footer = document.createElement('div');
    footer.className = 'flex items-center justify-between gap-2 pt-2.5 mt-3 border-t text-[10px] font-bold tracking-wider uppercase opacity-85';
    footer.style.borderColor = 'var(--table-border)';
    footer.style.color = 'var(--text-muted)';
    footer.innerHTML = `
      <div class="flex items-center gap-1">
        <i class="fa-solid fa-medal text-[9px] text-amber-500"></i>
        <span>Primato Ufficiale</span>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <img src="favicon-64x64.png" alt="InsalAtlas" class="w-3.5 h-3.5 object-contain inline-block rounded-full shadow-xs">
        <span class="font-extrabold tracking-widest text-[10px]" style="color: var(--text-main);">InsalAtlas</span>
      </div>
    `;
    clone.appendChild(footer);
  }

  // Remove any lingering share dropdown popovers
  clone.querySelectorAll('[id^="record-share-dropdown-"]').forEach(el => el.remove());

  // 5. Layout & Anti-Clipping Adjustments for html2canvas
  // Watermark: remove rotate-12 and scale so html2canvas doesn't clip emoji glyphs
  const watermark = clone.querySelector<HTMLElement>('.record-watermark');
  if (watermark) {
    watermark.style.transform = 'none';
    watermark.style.right = '14px';
    watermark.style.top = '12px';
    watermark.style.fontSize = '46px';
    watermark.style.lineHeight = '1';
    watermark.style.opacity = '0.35';
  }

  // Metric row: prevent collision between big hero number, normalized rate, and season badge
  const metricRow = clone.querySelector<HTMLElement>('.record-metric-row');
  if (metricRow) {
    metricRow.style.display = 'flex';
    metricRow.style.alignItems = 'center';
    metricRow.style.flexWrap = 'wrap';
    metricRow.style.gap = '8px';
    metricRow.style.marginBottom = '12px';
    metricRow.style.lineHeight = '1';
  }

  // Manager Names: prevent vertical letter clipping (ascenders / descenders)
  clone.querySelectorAll<HTMLElement>('.manager-record-name').forEach(el => {
    el.style.lineHeight = '1.35';
    el.style.display = 'inline-block';
    el.style.overflow = 'visible';
    el.style.paddingTop = '2px';
    el.style.paddingBottom = '2px';
  });

  // Explicit dimensions on logos to prevent collapsing
  clone.querySelectorAll<HTMLImageElement>('.record-holder-logo').forEach(img => {
    img.style.width = '40px';
    img.style.height = '40px';
    img.style.minWidth = '40px';
    img.style.minHeight = '40px';
    img.style.display = 'block';
    img.style.objectFit = 'contain';
  });

  clone.querySelectorAll<HTMLImageElement>('.runnerup-crest').forEach(img => {
    img.style.width = '16px';
    img.style.height = '16px';
    img.style.minWidth = '16px';
    img.style.minHeight = '16px';
    img.style.display = 'inline-block';
    img.style.verticalAlign = 'middle';
  });

  // 6. Obtain computed background and theme colors
  const computedBg = window.getComputedStyle(card).backgroundColor || '#0f172a';

  // 7. Build invisible staging container that takes zero space and prevents any layout flash/scroll shift
  const container = document.createElement('div');
  container.id = 'record-export-staging-container';
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
    const fullHeight = Math.ceil(clone.scrollHeight || clone.offsetHeight || 500);

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
      onclone: (clonedDoc, clonedEl) => {
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

        // Known html2canvas + Tailwind preflight bug: `img { display: block }` shifts text
        // baselines downward inside pills/badges. Scoped override to the export clone only.
        const fixStyle = clonedDoc.createElement('style');
        fixStyle.textContent = `
          #record-card-export-clone img { display: inline-block !important; }
          #record-card-export-clone .truncate { overflow: visible !important; text-overflow: clip !important; }
        `;
        clonedDoc.head.appendChild(fixStyle);
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
