import { state } from '@/state';
import { showToast } from '@/ui';
import type { Manager, TradingCardBadge } from '@/types';
import { calculateManagerScore, formatScore } from '@/score';
import { renderTrophySVG, renderCoachBanner } from '@/trophies';
import { getManagerArchetype, computeTailRiskProfile } from '@/analytics';

/**
 * Computes dynamic merit and behavioral badges for a manager's trading card
 */
export function computeTradingCardBadges(manager: Manager): TradingCardBadge[] {
  const badges: TradingCardBadge[] = [];

  const totalMajor = (manager.gold || 0) + (manager.cup_gold || 0) + (manager.supercup || 0) + (manager.mundialito || 0);
  const efficiency = manager.years > 0 ? parseFloat((totalMajor / manager.years).toFixed(2)) : 0;

  // 1. Behavioral Archetype
  const arch = getManagerArchetype(manager, totalMajor, efficiency);
  badges.push({
    label: `Profilo: ${arch.tag}`,
    icon: arch.icon,
    customStyle: `background: ${arch.color}25; color: ${arch.color}; border: 1px solid ${arch.color}60;`
  });

  // 2. Net Tail Risk (NTI) Polarity
  const risk = computeTailRiskProfile(manager);
  badges.push({
    label: `Rischio: ${risk.label}`,
    icon: risk.icon,
    customStyle: `background: ${risk.color}25; color: ${risk.color}; border: 1px solid ${risk.color}60;`
  });

  // 3. Historical Merit Badges
  if (manager.years >= 6) {
    badges.push({
      label: 'Veterano della Lega',
      icon: 'fa-shield-halved',
      color: 'bg-indigo-900/60 text-indigo-300 border-indigo-700/60'
    });
  }
  if (totalMajor >= 4) {
    badges.push({
      label: 'Re dei Titoli',
      icon: 'fa-crown',
      color: 'bg-amber-900/60 text-amber-300 border-amber-600/60'
    });
  }
  if ((manager.gold || 0) >= 1 && (manager.cup_gold || 0) >= 1) {
    badges.push({
      label: 'Double Winner',
      icon: 'fa-star',
      color: 'bg-yellow-900/60 text-yellow-300 border-yellow-600/60'
    });
  }
  if ((manager.cartonato || 0) >= 2) {
    badges.push({
      label: 'Incubo Playout',
      icon: 'fa-skull-crossbones',
      color: 'bg-rose-950/70 text-rose-300 border-rose-700/60'
    });
  }
  if ((manager.spoon || 0) >= 2) {
    badges.push({
      label: 'Collezionista Cucchiai',
      icon: 'fa-utensils',
      color: 'bg-amber-950/80 text-amber-500 border-amber-800/60'
    });
  }

  return badges;
}

/**
 * Extracts initials from manager name for card avatar
 */
export function getManagerInitials(name: string): string {
  const parts = name.split(/[ &+/,-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Builds HTML template for 9:16 high-resolution Trading Card
 */
export function buildTradingCardHTML(manager: Manager): string {
  const score = calculateManagerScore(manager);
  const initials = getManagerInitials(manager.name);
  const badges = computeTradingCardBadges(manager);

  const coaches = manager.coach_banners || manager.cartonato_coaches || [];
  const cartonatiCount = manager.cartonato || 0;

  let bannersMarkup = '';
  if (coaches.length > 0) {
    bannersMarkup = coaches.map(c => renderCoachBanner(c)).join('');
  } else if (cartonatiCount > 0) {
    bannersMarkup = Array(cartonatiCount).fill(0).map(() => renderCoachBanner('CARTONATO')).join('');
  } else {
    bannersMarkup = '<span class="text-xs opacity-40 italic">Nessun cartonato in bacheca</span>';
  }

  const badgesMarkup = badges.map(b => {
    const styleAttr = b.customStyle ? `style="${b.customStyle}"` : '';
    const classAttr = b.color ? b.color : 'bg-white/10 border-white/20 text-slate-200';
    return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold border ${classAttr}" ${styleAttr}><i class="fa-solid ${b.icon}"></i> ${b.label}</span>`;
  }).join('');

  return `
    <div class="trading-card">
      <!-- Card Top Header -->
      <div class="flex items-center justify-between border-b pb-3" style="border-color: var(--table-border);">
        <div class="flex items-center gap-3">
          <img src="favicon-64x64.png" alt="InsalAtlas" class="w-10 h-10 object-contain drop-shadow" />
          <div>
            <span class="block text-xs uppercase font-black tracking-widest" style="color: var(--accent-color, #eab308);">InsalAtlas Lega</span>
            <span class="block text-[11px] opacity-70">Scheda Ufficiale Palmarès</span>
          </div>
        </div>
        <div class="text-right">
          <span class="inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border"
                style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-main);">
            ${manager.years} ${manager.years === 1 ? 'Edizione' : 'Edizioni'}
          </span>
        </div>
      </div>

      <!-- Hero Section: Avatar, Name & Overall Rating -->
      <div class="text-center my-3">
        <div class="w-24 h-24 mx-auto rounded-full flex items-center justify-center shadow-2xl mb-2.5 border-2"
             style="background: radial-gradient(circle, var(--accent-color) 0%, transparent 80%), rgba(255,255,255,0.05); border-color: var(--accent-color);">
          <span class="text-3xl font-black tracking-wider" style="color: var(--text-main);">${initials}</span>
        </div>
        <h2 class="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2 leading-none" style="color: var(--text-main);">
          ${manager.name.toUpperCase()}
        </h2>
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-md font-extrabold text-lg"
             style="background: var(--table-surface); border-color: var(--accent-color); color: var(--accent-color);">
          <i class="fa-solid fa-star text-sm"></i>
          <span>${formatScore(score)} PT</span>
        </div>
      </div>

      <!-- Badges Pills -->
      <div class="flex items-center justify-center flex-wrap gap-1.5 my-2">
        ${badgesMarkup}
      </div>

      <!-- 6 Trophy Stat Boxes (2 columns x 3 rows) -->
      <div class="grid grid-cols-2 gap-2.5 my-2 flex-grow">
        <!-- Scudetti -->
        <div class="trading-card-stat-box p-3 flex items-center gap-3">
          <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center">
            ${renderTrophySVG('gold_cup')}
          </div>
          <div>
            <span class="block text-2xl font-black leading-none">${manager.gold || 0}</span>
            <span class="text-[11px] uppercase font-bold opacity-70">Scudetti</span>
          </div>
        </div>

        <!-- Coppe di Lega -->
        <div class="trading-card-stat-box p-3 flex items-center gap-3">
          <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center">
            ${renderTrophySVG('coppa_gold')}
          </div>
          <div>
            <span class="block text-2xl font-black leading-none">${manager.cup_gold || 0}</span>
            <span class="text-[11px] uppercase font-bold opacity-70">Coppe Lega</span>
          </div>
        </div>

        <!-- Supercoppe -->
        <div class="trading-card-stat-box p-3 flex items-center gap-3">
          <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center">
            ${renderTrophySVG('supercup')}
          </div>
          <div>
            <span class="block text-2xl font-black leading-none">${manager.supercup || 0}</span>
            <span class="text-[11px] uppercase font-bold opacity-70">Supercoppe</span>
          </div>
        </div>

        <!-- Mundialito -->
        <div class="trading-card-stat-box p-3 flex items-center gap-3">
          <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center">
            ${renderTrophySVG('mundialito')}
          </div>
          <div>
            <span class="block text-2xl font-black leading-none">${manager.mundialito || 0}</span>
            <span class="text-[11px] uppercase font-bold opacity-70">Mundialito</span>
          </div>
        </div>

        <!-- Cucchiai di Legno -->
        <div class="trading-card-stat-box p-3 flex items-center gap-3">
          <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center">
            ${renderTrophySVG('wooden_spoon')}
          </div>
          <div>
            <span class="block text-2xl font-black leading-none text-amber-500">${manager.spoon || 0}</span>
            <span class="text-[11px] uppercase font-bold opacity-70">Cucchiai Legno</span>
          </div>
        </div>

        <!-- Cartonati Playout -->
        <div class="trading-card-stat-box p-3 flex items-center gap-3">
          <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center">
            <i class="fa-solid fa-skull-crossbones text-rose-400 text-2xl"></i>
          </div>
          <div>
            <span class="block text-2xl font-black leading-none text-rose-400">${manager.cartonato || 0}</span>
            <span class="text-[11px] uppercase font-bold opacity-70">Cartonati</span>
          </div>
        </div>
      </div>

      <!-- Playout Coach Banners Strip -->
      <div class="my-2 p-3 trading-card-stat-box">
        <span class="block text-[10px] uppercase font-extrabold tracking-wider opacity-60 mb-2">Bacheca Allenatori Cartonato</span>
        <div class="flex items-center flex-wrap gap-1.5">${bannersMarkup}</div>
      </div>

      <!-- Card Footer -->
      <div class="border-t pt-2.5 flex items-center justify-between text-[11px] opacity-50 font-mono" style="border-color: var(--table-border);">
        <span>fgizzarellids.github.io/insalatlas_sala_trofei</span>
        <span>Scheda Ufficiale ${new Date().getFullYear()}</span>
      </div>
    </div>
  `;
}

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
async function renderProfileModalCanvas(card: HTMLElement): Promise<HTMLCanvasElement> {
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
 * Captures the #manager-profile-card element in high definition and downloads PNG directly
 */
export async function exportProfileModalHD(manager: Manager): Promise<void> {
  if (state.selectedManagerId !== manager.id && typeof window !== 'undefined' && (window as unknown as { openProfileModal?: (id: string) => void }).openProfileModal) {
    (window as unknown as { openProfileModal: (id: string) => void }).openProfileModal(manager.id);
  }

  const card = document.getElementById('manager-profile-card');
  if (!card) {
    showToast('Impossibile trovare la scheda del profilo', 'error');
    return;
  }

  showToast('Generazione scheda HD in corso...', 'info');

  const dropdown = document.getElementById('share-dropdown-menu');
  if (dropdown) dropdown.classList.add('hidden');

  try {
    const canvas = await renderProfileModalCanvas(card);
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Errore durante la creazione dell'immagine", 'error');
        return;
      }
      const filename = `insalatlas_${manager.id}_${Date.now()}.png`;
      downloadBlob(blob, filename);
    }, 'image/png');
  } catch (err) {
    console.error('Modal export failed:', err);
    showToast('Impossibile esportare la scheda', 'error');
  }
}

/**
 * Captures the #manager-profile-card element in high definition and copies PNG to clipboard
 */
export async function copyProfileModalToClipboard(manager: Manager): Promise<boolean> {
  if (state.selectedManagerId !== manager.id && typeof window !== 'undefined' && (window as unknown as { openProfileModal?: (id: string) => void }).openProfileModal) {
    (window as unknown as { openProfileModal: (id: string) => void }).openProfileModal(manager.id);
  }

  const card = document.getElementById('manager-profile-card');
  if (!card) {
    showToast('Impossibile trovare la scheda del profilo', 'error');
    return false;
  }

  showToast('Copia immagine in corso...', 'info');

  const dropdown = document.getElementById('share-dropdown-menu');
  if (dropdown) dropdown.classList.add('hidden');

  try {
    const canvas = await renderProfileModalCanvas(card);
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast("Errore durante la creazione dell'immagine", 'error');
          resolve(false);
          return;
        }
        const filename = `insalatlas_${manager.id}_${Date.now()}.png`;
        const success = await copyBlobToClipboard(blob, filename);
        resolve(success);
      }, 'image/png');
    });
  } catch (err) {
    console.error('Modal copy failed:', err);
    showToast('Impossibile copiare la scheda', 'error');
    return false;
  }
}

/**
 * Generates and downloads a 9:16 high-resolution Trading Card for a manager (fallback)
 */
export async function exportManagerCardHD(manager: Manager): Promise<void> {
  await exportProfileModalHD(manager);
}

/**
 * Looks up manager by ID and triggers Modal Card export
 */
export async function exportManagerCardById(managerId: string): Promise<void> {
  const manager = state.managers.find(m => m.id === managerId);
  if (!manager) {
    showToast('Allenatore non trovato', 'error');
    return;
  }
  await exportProfileModalHD(manager);
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
    window.scrollTo(prevScrollX, prevScrollY);
  }
}

/**
 * Formats rich banter text and direct link for WhatsApp sharing with preview
 */
export function buildWhatsAppShareText(manager: Manager, customBaseUrl?: string): string {
  const score = calculateManagerScore(manager);
  const totalMajor = (manager.gold || 0) + (manager.cup_gold || 0) + (manager.supercup || 0) + (manager.mundialito || 0);
  const efficiency = manager.years > 0 ? parseFloat((totalMajor / manager.years).toFixed(2)) : 0;
  const arch = getManagerArchetype(manager, totalMajor, efficiency);

  const trophiesList: string[] = [];
  if (manager.gold) trophiesList.push(`🥇 ${manager.gold} ${manager.gold === 1 ? 'Scudetto' : 'Scudetti'}`);
  if (manager.cup_gold) trophiesList.push(`🏆 ${manager.cup_gold} ${manager.cup_gold === 1 ? 'Coppa Lega' : 'Coppe Lega'}`);
  if (manager.supercup) trophiesList.push(`⭐ ${manager.supercup} ${manager.supercup === 1 ? 'Supercoppa' : 'Supercoppe'}`);
  if (manager.mundialito) trophiesList.push(`🌍 ${manager.mundialito} Mundialito`);
  if (manager.spoon) trophiesList.push(`🥄 ${manager.spoon} ${manager.spoon === 1 ? 'Cucchiaio' : 'Cucchiai'}`);
  if (manager.cartonato) trophiesList.push(`⚠️ ${manager.cartonato} ${manager.cartonato === 1 ? 'Cartonato' : 'Cartonati'}`);

  const trophiesStr = trophiesList.length > 0 ? trophiesList.join(' • ') : 'Nessun trofeo';

  let baseUrl = 'https://fgizzarellids.github.io/insalatlas_sala_trofei/';
  if (customBaseUrl) {
    baseUrl = customBaseUrl;
  } else if (typeof window !== 'undefined' && window.location && window.location.origin) {
    // Force public production URL on localhost so WhatsApp crawler can access and unfurl the rich preview image
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      baseUrl = `${window.location.origin}${window.location.pathname}`;
    }
  }

  const shareUrl = `${baseUrl}?manager=${encodeURIComponent(manager.id)}`;

  return `🏆 *InsalAtlas • Scheda Palmarès*\n👤 *${manager.name.toUpperCase()}* (${manager.years} ${manager.years === 1 ? 'Stagione' : 'Stagioni'})\n⭐ *Rating Storico:* ${formatScore(score)} PT\n🏅 *Profilo:* ${arch.tag}\n\n📊 *Bacheca:* ${trophiesStr}\n\n👉 Guarda la scheda e i trofei completi:\n${shareUrl}`;
}

/**
 * Copies the high-resolution Profile Modal card directly to the system clipboard
 * so users can simply Cmd+V / Paste it into WhatsApp, Telegram, or any chat
 */
export async function copyManagerCardToClipboard(manager: Manager): Promise<boolean> {
  return copyProfileModalToClipboard(manager);
}

/**
 * Copies profile modal image to clipboard by manager ID
 */
export async function copyManagerCardById(managerId: string): Promise<void> {
  const manager = state.managers.find(m => m.id === managerId);
  if (!manager) {
    showToast('Allenatore non trovato', 'error');
    return;
  }
  await copyProfileModalToClipboard(manager);
}

/**
 * Opens WhatsApp directly with pre-filled message and preview link
 */
export function shareViaWhatsApp(manager: Manager): void {
  const text = buildWhatsAppShareText(manager);
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
  showToast('Apertura WhatsApp in corso...', 'info');
}

/**
 * Triggers WhatsApp share for manager by ID
 */
export function shareManagerWhatsAppById(managerId: string): void {
  const manager = state.managers.find(m => m.id === managerId);
  if (!manager) {
    showToast('Allenatore non trovato', 'error');
    return;
  }
  shareViaWhatsApp(manager);
}
