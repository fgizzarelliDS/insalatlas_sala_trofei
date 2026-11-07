/**
 * src/components/modals/matchup/MatchupContenders.ts
 * Contenders selectors and face-off archetype cards for Matchup modal
 */

import type { Manager } from '@/types';
import type { TacticalProfile } from '@/analytics/tactical/types';
import { escapeHtml } from '@/utils/dom';

/**
 * Extracts initials for manager avatar
 */
export function getInitials(name: string): string {
  const parts = name.split(/[ &+/,-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Renders the contender selectors (dropdowns) and archetype cards
 */
export function renderMatchupContendersHTML(
  managerA: Manager,
  managerB: Manager,
  allManagers: Manager[],
  profileA: TacticalProfile,
  profileB: TacticalProfile
): string {
  const initialsA = getInitials(managerA.name);
  const initialsB = getInitials(managerB.name);

  // Dropdown options
  const optionsA = allManagers
    .map(
      m =>
        `<option value="${m.id}" ${m.id === managerA.id ? 'selected' : ''} ${m.id === managerB.id ? 'disabled' : ''}>${escapeHtml(m.name)}</option>`
    )
    .join('');

  const optionsB = allManagers
    .map(
      m =>
        `<option value="${m.id}" ${m.id === managerB.id ? 'selected' : ''} ${m.id === managerA.id ? 'disabled' : ''}>${escapeHtml(m.name)}</option>`
    )
    .join('');

  return `
    <div class="p-3 rounded-2xl border" style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div id="matchup-hero-dropdown-selectors" class="grid grid-cols-2 gap-3 items-center">
        <!-- Select A -->
        <div class="min-w-0">
          <label class="block text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5" style="color: var(--h2h-contender-a, #f59e0b);">
            <span class="w-2 h-2 rounded-full inline-block" style="background-color: var(--h2h-contender-a, #f59e0b);"></span>
            Mister A
          </label>
          <select onchange="window.changeMatchupManagerA && window.changeMatchupManagerA(this.value)"
            class="w-full text-xs font-bold rounded-xl px-2.5 py-2 border focus:outline-none cursor-pointer truncate shadow-sm transition"
            style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
            ${optionsA}
          </select>
        </div>

        <!-- Select B -->
        <div class="min-w-0">
          <label class="block text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-end gap-1.5" style="color: var(--h2h-contender-b, #06b6d4);">
            Mister B
            <span class="w-2 h-2 rounded-full inline-block" style="background-color: var(--h2h-contender-b, #06b6d4);"></span>
          </label>
          <select onchange="window.changeMatchupManagerB && window.changeMatchupManagerB(this.value)"
            class="w-full text-xs font-bold rounded-xl px-2.5 py-2 border focus:outline-none cursor-pointer truncate text-right shadow-sm transition"
            style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
            ${optionsB}
          </select>
        </div>
      </div>

      <!-- Contender Face-off Cards -->
      <div id="matchup-hero-cards-row" class="grid grid-cols-11 gap-1 items-stretch mt-3 pt-3 border-t" style="border-color: var(--table-border);">
        <!-- Contender A Card -->
        <div class="col-span-5 text-center p-3 rounded-xl border flex flex-col items-center justify-between min-w-0"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <div class="flex flex-col items-center w-full">
            <div class="w-11 h-11 mx-auto rounded-full flex items-center justify-center font-black text-sm border-2 mb-1 shadow"
                 style="background: radial-gradient(circle, var(--h2h-contender-a, #f59e0b) 0%, transparent 80%), rgba(255,255,255,0.05); border-color: var(--h2h-contender-a, #f59e0b); color: var(--text-main);">
              ${initialsA}
            </div>
            <h3 class="font-sport font-black text-sm uppercase px-1 my-1 truncate max-w-full" style="color: var(--text-main);">
              ${escapeHtml(managerA.name)}
            </h3>
          </div>
          <div class="flex flex-col items-center justify-center gap-1 mt-1 w-full min-w-0">
            <span class="inline-flex items-center justify-center text-[10px] font-black px-2 py-0.5 rounded-full border text-center leading-tight break-words max-w-full"
                  style="background: ${profileA.archetype.color}18; color: ${profileA.archetype.color}; border-color: ${profileA.archetype.color}40;">
              <i class="fa-solid ${profileA.archetype.icon} text-[9px] mr-1 shrink-0"></i><span>${escapeHtml(profileA.archetype.title)}</span>
            </span>
            <span class="text-[9px] font-bold opacity-75 text-center leading-tight break-words max-w-full block" style="color: var(--text-muted);">
              ${escapeHtml(profileA.archetype.trait)}
            </span>
          </div>
        </div>

        <!-- VS Emblem -->
        <div class="col-span-1 text-center font-sport font-black text-sm italic tracking-widest opacity-60 drop-shadow flex items-center justify-center" style="color: var(--accent-color);">
          VS
        </div>

        <!-- Contender B Card -->
        <div class="col-span-5 text-center p-3 rounded-xl border flex flex-col items-center justify-between min-w-0"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <div class="flex flex-col items-center w-full">
            <div class="w-11 h-11 mx-auto rounded-full flex items-center justify-center font-black text-sm border-2 mb-1 shadow"
                 style="background: radial-gradient(circle, var(--h2h-contender-b, #06b6d4) 0%, transparent 80%), rgba(255,255,255,0.05); border-color: var(--h2h-contender-b, #06b6d4); color: var(--text-main);">
              ${initialsB}
            </div>
            <h3 class="font-sport font-black text-sm uppercase px-1 my-1 truncate max-w-full" style="color: var(--text-main);">
              ${escapeHtml(managerB.name)}
            </h3>
          </div>
          <div class="flex flex-col items-center justify-center gap-1 mt-1 w-full min-w-0">
            <span class="inline-flex items-center justify-center text-[10px] font-black px-2 py-0.5 rounded-full border text-center leading-tight break-words max-w-full"
                  style="background: ${profileB.archetype.color}18; color: ${profileB.archetype.color}; border-color: ${profileB.archetype.color}40;">
              <i class="fa-solid ${profileB.archetype.icon} text-[9px] mr-1 shrink-0"></i><span>${escapeHtml(profileB.archetype.title)}</span>
            </span>
            <span class="text-[9px] font-bold opacity-75 text-center leading-tight break-words max-w-full block" style="color: var(--text-muted);">
              ${escapeHtml(profileB.archetype.trait)}
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
}
