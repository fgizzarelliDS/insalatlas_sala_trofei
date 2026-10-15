import type { TrophyModalKey, CupSubTab } from './TrophyModalTypes';

export interface TrophyHeaderConfig {
  icon: string;
  title: string;
  subtitle: string;
  badgeLabel: string;
}

export function getTrophyHeaderConfig(key: TrophyModalKey, subTab?: CupSubTab): TrophyHeaderConfig {
  switch (key) {
    case 'scudetti':
      return {
        icon: '🥇',
        title: "Albo d'Oro Scudetti",
        subtitle: 'I campioni della Serie Atlas e i podi storici (1°, 2° e 3° posto) anno per anno.',
        badgeLabel: '10 Edizioni Concluse'
      };
    case 'cups':
      return subTab === 'supercoppa'
        ? {
          icon: '⭐',
          title: 'Albo d’Oro Supercoppa',
          subtitle: 'La sfida secca tra i vincitori di Campionato e Coppa: albo e finalisti.',
          badgeLabel: '5 Supercoppe'
        }
        : {
          icon: '🏆',
          title: 'Albo d’Oro Coppa InsalAtlas',
          subtitle: 'Il torneo a eliminazione diretta della lega: campioni e finalisti per ogni stagione.',
          badgeLabel: '10 Coppe Assegnate'
        };
    case 'mundialito':
      return {
        icon: '🌍',
        title: 'Albo d’Oro Mundialito',
        subtitle: 'La competizione globale interleghe: albo d’oro e finalisti di tutte le edizioni.',
        badgeLabel: '3 Edizioni'
      };
    case 'spoons':
      return {
        icon: '🥄',
        title: 'Muro dei Cucchiai di Legno',
        subtitle: 'Gli ultimi posti ufficiali e le stagioni più tormentate nella storia della Serie Atlas.',
        badgeLabel: '10 Cucchiai Assegnati'
      };
    case 'cartonato':
      return {
        icon: '📦',
        title: 'Albo Playout & Banner Cartonato',
        subtitle: 'I coach finiti sul cartellone dei playout e della Coppa dei Perdenti.',
        badgeLabel: '5 Cartonati Assegnati'
      };
    case 'seasons':
    default:
      return {
        icon: '📅',
        title: 'Cronologia Generale delle Stagioni',
        subtitle: 'Riepilogo anno per anno di tutti i trofei e link alle classifiche storiche archiviate.',
        badgeLabel: '11 Stagioni (10+1 in corso)'
      };
  }
}

export function renderTrophyModalShellHTML(
  trophyKey: TrophyModalKey,
  subTab: CupSubTab,
  bodyContentHTML: string
): string {
  const cfg = getTrophyHeaderConfig(trophyKey, subTab);

  const tabsHTML = trophyKey === 'cups' ? `
    <div class="flex items-center gap-1.5 p-1 rounded-xl border mt-3"
      style="background-color: var(--input-bg); border-color: var(--table-border);">
      <button type="button" onclick="window.switchTrophyModalTab && window.switchTrophyModalTab('coppa')"
        class="flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition cursor-pointer ${subTab === 'coppa' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'opacity-70 hover:opacity-100'}"
        style="${subTab === 'coppa' ? 'background-color: var(--accent-color, #f59e0b); color: #020617;' : 'color: var(--text-main);'}">
        <i class="fa-solid fa-trophy mr-1"></i> Coppa di Lega
      </button>
      <button type="button" onclick="window.switchTrophyModalTab && window.switchTrophyModalTab('supercoppa')"
        class="flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition cursor-pointer ${subTab === 'supercoppa' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'opacity-70 hover:opacity-100'}"
        style="${subTab === 'supercoppa' ? 'background-color: var(--accent-color, #f59e0b); color: #020617;' : 'color: var(--text-main);'}">
        <i class="fa-solid fa-star mr-1"></i> Supercoppa
      </button>
    </div>
  ` : '';

  return `
    <div id="trophy-history-modal-backdrop" onclick="window.closeTrophyModal && window.closeTrophyModal()"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[80] flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      
      <div id="trophy-history-dialog" onclick="event.stopPropagation()"
        class="border w-full max-w-2xl min-w-0 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] transition-colors"
        style="background-color: var(--modal-bg); border-color: var(--modal-border); color: var(--modal-text);">
        
        <!-- Header -->
        <div class="p-4 sm:p-5 border-b shrink-0 flex items-start justify-between gap-3"
          style="border-color: var(--table-border);">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-2xl">${cfg.icon}</span>
              <h2 class="text-base sm:text-lg font-black tracking-tight" style="color: var(--text-main);">
                ${cfg.title}
              </h2>
              <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
                ${cfg.badgeLabel}
              </span>
            </div>
            <p class="text-xs mt-1 leading-relaxed opacity-75" style="color: var(--text-muted);">
              ${cfg.subtitle}
            </p>
            ${tabsHTML}
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <!-- Export Dropdown -->
            <div class="relative">
              <button id="btn-trophy-share-dropdown" type="button"
                onclick="window.toggleTrophyShareDropdown && window.toggleTrophyShareDropdown(event)"
                class="px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 hover:scale-105 active:scale-95 cursor-pointer text-amber-500"
                style="background-color: var(--btn-bg); border-color: var(--btn-border);"
                title="Esporta o condividi questo albo">
                <i class="fa-solid fa-camera"></i>
                <span class="hidden sm:inline">Condividi</span>
                <i class="fa-solid fa-chevron-down text-[10px] ml-0.5 opacity-70"></i>
              </button>

              <div id="trophy-share-dropdown-menu"
                class="hidden absolute right-0 top-full mt-1.5 w-60 rounded-2xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md"
                style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--modal-text);">
                <button type="button"
                  onclick="window.exportTrophyModalHD && window.exportTrophyModalHD(); window.closeTrophyShareDropdown && window.closeTrophyShareDropdown();"
                  class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
                  <i class="fa-solid fa-download text-amber-500"></i>
                  <span>Scarica Albo PNG (HD)</span>
                </button>
                <button type="button"
                  onclick="window.copyTrophyModalToClipboard && window.copyTrophyModalToClipboard(); window.closeTrophyShareDropdown && window.closeTrophyShareDropdown();"
                  class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
                  <i class="fa-solid fa-copy text-emerald-500"></i>
                  <span>Copia per WhatsApp (Immagine)</span>
                </button>
                <button type="button"
                  onclick="window.shareTrophyWhatsApp && window.shareTrophyWhatsApp('${trophyKey}', '${subTab}'); window.closeTrophyShareDropdown && window.closeTrophyShareDropdown();"
                  class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
                  <i class="fa-brands fa-whatsapp text-emerald-500"></i>
                  <span>Invia Link WhatsApp (Testo + URL)</span>
                </button>
              </div>
            </div>

            <!-- Close Button -->
            <button type="button" onclick="window.closeTrophyModal && window.closeTrophyModal()"
              class="w-8 h-8 rounded-xl border flex items-center justify-center text-xs opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              style="border-color: var(--table-border); color: var(--text-main);"
              title="Chiudi">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <!-- Scrollable Modal Body -->
        <div class="p-3.5 sm:p-5 overflow-y-auto space-y-3.5 flex-1"
          style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
          ${bodyContentHTML}
        </div>

        <!-- Footer -->
        <div class="px-4 py-3 border-t flex items-center justify-between text-[11px] opacity-75"
          style="border-color: var(--table-border); color: var(--text-muted);">
          <span>💡 Clicca su un allenatore per aprire la sua scheda profilo</span>
          <button type="button" onclick="window.closeTrophyModal && window.closeTrophyModal()"
            class="font-bold hover:underline cursor-pointer" style="color: var(--accent-color);">
            Chiudi
          </button>
        </div>

      </div>
    </div>
  `;
}
