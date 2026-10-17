import { renderNodeToCanvas } from './core';
import { LEAGUE } from '@/config';

/**
 * Renders an exact off-screen clone of the H2H 1vs1 duel modal card into a high-res canvas.
 * Strips dropdowns, interactive action buttons, and adds league official closing footer.
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
    <img src="favicon-64x64.png" alt="${LEAGUE.brand.name}" class="w-4 h-4 object-contain inline-block rounded-full shadow-sm">
    <span class="font-extrabold tracking-widest text-[11px]" style="color: var(--text-main);">${LEAGUE.brand.name}</span>
    <span class="opacity-40">•</span>
    <span class="text-[10px] tracking-wider" style="color: var(--accent-color);">Head-to-Head Ufficiale</span>
  `;
  targetParent.appendChild(footer);

  const computedBg = window.getComputedStyle(card).backgroundColor || '#0f172a';
  return renderNodeToCanvas(clone, targetWidth, computedBg);
}

/**
 * Renders an exact off-screen clone of the Tavolo dei Rivali multi-manager modal card into a high-res canvas.
 * Strips dropdowns, interactive action buttons, and adds league official closing footer.
 */
export async function renderMultiManagerCanvas(card: HTMLElement): Promise<HTMLCanvasElement> {
  const clone = card.cloneNode(true) as HTMLElement;
  clone.id = 'multi-manager-card-export-clone';

  const cardRect = card.getBoundingClientRect();
  const naturalWidth = Math.round(cardRect.width) || card.offsetWidth || 760;
  const targetWidth = Math.max(naturalWidth, 780);

  // 1. Remove top-right header action group (close button + matrix switcher)
  clone.querySelector('.flex.items-center.gap-2.self-end')?.remove();
  clone.querySelectorAll('.flex.items-center.p-0\\.5').forEach(el => el.remove());

  // 2. Remove interactive buttons
  clone.querySelectorAll('button').forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick') || '';
    if (
      onclickAttr.includes('closeHeadToHeadModal') ||
      onclickAttr.includes('toggleH2HShareDropdown') ||
      onclickAttr.includes('setH2HTab') ||
      onclickAttr.includes('addNextMultiManager') ||
      onclickAttr.includes('removeMultiManager') ||
      onclickAttr.includes('setMultiTournamentMode') ||
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

  // Replace select dropdowns in manager selector cards with static text
  clone.querySelectorAll('select').forEach(sel => {
    const selectedOption = sel.options[sel.selectedIndex];
    const text = selectedOption ? selectedOption.text.split('(')[0].trim() : '';
    const span = document.createElement('div');
    span.className = 'font-bold text-xs truncate py-1 text-center';
    span.textContent = text;
    sel.parentNode?.replaceChild(span, sel);
  });

  // Expand modal content and body to natural full height
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

  // Add closing footnote
  const targetParent = scrollableBody || clone;
  const footer = document.createElement('div');
  footer.className = 'flex items-center justify-center gap-2 py-4 mt-3 border-t text-xs font-bold tracking-wider uppercase opacity-85';
  footer.style.borderColor = 'var(--table-border)';
  footer.style.color = 'var(--text-muted)';
  footer.innerHTML = `
    <img src="favicon-64x64.png" alt="${LEAGUE.brand.name}" class="w-4 h-4 object-contain inline-block rounded-full shadow-sm">
    <span class="font-extrabold tracking-widest text-[11px]" style="color: var(--text-main);">${LEAGUE.brand.name}</span>
    <span class="opacity-40">•</span>
    <span class="text-[10px] tracking-wider" style="color: var(--accent-color);">Tavolo dei Rivali Ufficiale</span>
  `;
  targetParent.appendChild(footer);

  const computedBg = window.getComputedStyle(card).backgroundColor || '#0f172a';
  return renderNodeToCanvas(clone, targetWidth, computedBg);
}
