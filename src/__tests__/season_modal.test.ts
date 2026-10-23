import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  renderSeasonModalContent,
  renderChampionshipRowsHTML,
  buildManagerSelectOptions
} from '@/components/modals/season/SeasonModalTemplate';
import {
  openSeasonModal,
  closeSeasonModal,
  handleManagerSelectChange,
  changeSeasonTeamCount,
  toggleSeasonSection,
  saveSeason
} from '@/components/modals/season/SeasonModalController';
import { state } from '@/state';
import type { Manager, CompetitionRecord } from '@/types';
import dataJson from '../../public/data.json';

// Minimal mock DOM element
class MockDOMElement {
  id: string;
  tagName: string;
  value: string = '';
  innerHTML: string = '';
  textContent: string = '';
  type: string = 'text';
  classList = {
    classes: new Set<string>(),
    add: (...cls: string[]) => cls.forEach(c => this.classList.classes.add(c)),
    remove: (...cls: string[]) => cls.forEach(c => this.classList.classes.delete(c)),
    toggle: (c: string) => {
      if (this.classList.classes.has(c)) {
        this.classList.classes.delete(c);
        return false;
      }
      this.classList.classes.add(c);
      return true;
    },
    contains: (c: string) => this.classList.classes.has(c)
  };
  options: { value: string; textContent: string }[] = [];
  children: MockDOMElement[] = [];

  constructor(id: string, tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
  }

  querySelectorAll(_sel: string) {
    return this.children;
  }

  appendChild(child: MockDOMElement) {
    this.children.push(child);
    this.options.push({ value: child.value, textContent: child.textContent });
  }
}

describe('Season Creation Modal & Controller', () => {
  const elements = new Map<string, MockDOMElement>();

  function registerMock(id: string, tagName = 'div'): MockDOMElement {
    const el = new MockDOMElement(id, tagName);
    elements.set(id, el);
    return el;
  }

  beforeEach(() => {
    // Reset state from dataJson clone
    state.managers = JSON.parse(JSON.stringify(dataJson.leagueData)) as Manager[];
    state.competitions = JSON.parse(JSON.stringify(dataJson.competitions)) as CompetitionRecord[];
    state.isEditMode = true;

    // Reset DOM mock map
    elements.clear();

    // Setup global window and document mocks
    if (typeof globalThis.window === 'undefined') {
      (globalThis as any).window = {};
    }
    (globalThis as any).localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    (globalThis as any).document = {
      getElementById: (id: string) => elements.get(id) || null,
      createElement: (tag: string) => new MockDOMElement('', tag)
    };
  });

  describe('SeasonModalTemplate', () => {
    it('builds manager select options including all managers and marks selected option', () => {
      const selectedId = state.managers[0]?.id || 'm_test';
      const secondId = state.managers[1]?.id || 'm_test2';
      const optionsHtml = buildManagerSelectOptions(selectedId, '-- Test Placeholder --');
      expect(optionsHtml).toContain('<option value="">-- Test Placeholder --</option>');
      expect(optionsHtml).toContain(`value="${selectedId}" selected`);
      expect(optionsHtml).toContain(`value="${secondId}"`);
    });

    it('renders championship rows HTML for 8 teams with 1st, 2nd, 3rd and wooden spoon', () => {
      const html = renderChampionshipRowsHTML(8);
      expect(html).toContain('🥇 1°');
      expect(html).toContain('🥈 2°');
      expect(html).toContain('🥉 3°');
      expect(html).toContain('🥄 8°');
      expect(html).toContain('id="season-team-1"');
      expect(html).toContain('id="season-team-8"');
      expect(html).not.toContain('id="season-team-9"');
    });

    it('renders championship rows HTML for 12 teams with wooden spoon on 12th position', () => {
      const html = renderChampionshipRowsHTML(12);
      expect(html).toContain('🥇 1°');
      expect(html).toContain('🥄 12°');
      expect(html).toContain('id="season-team-12"');
    });

    it('renders the complete season modal form markup', () => {
      const modalContent = renderSeasonModalContent(10);
      expect(modalContent).toContain('id="season-creation-form"');
      expect(modalContent).toContain('id="season-field-year"');
      expect(modalContent).toContain('id="season-field-comp-name"');
      expect(modalContent).toContain('id="season-fanta-paste"');
      expect(modalContent).toContain('id="season-cup-gold"');
      expect(modalContent).toContain('id="season-supercup-gold"');
      expect(modalContent).toContain('id="season-mundialito-gold"');
      expect(modalContent).toContain('id="season-cartonato-winner"');
    });
  });

  describe('SeasonModalController UI Actions', () => {
    it('opens and closes the season modal', async () => {
      const modalEl = registerMock('season-modal');
      const contentEl = registerMock('season-modal-content');

      modalEl.classList.add('hidden');
      await openSeasonModal();

      expect(modalEl.classList.contains('hidden')).toBe(false);
      expect(modalEl.classList.contains('flex')).toBe(true);
      expect(contentEl.innerHTML).toContain('season-creation-form');

      closeSeasonModal();
      expect(modalEl.classList.contains('hidden')).toBe(true);
      expect(modalEl.classList.contains('flex')).toBe(false);
    });

    it('auto-fills team name and coach when handleManagerSelectChange is called', () => {
      const teamInput = registerMock('season-team-1', 'input');
      const coachInput = registerMock('season-coach-1', 'input');
      const datalistEl = registerMock('season-team-list-1');
      const selectEl = registerMock('season-manager-1', 'select');
      selectEl.classList.add('border-amber-500');

      const targetManager = state.managers[0];
      handleManagerSelectChange(1, targetManager.id);

      expect(teamInput.value).toBeTruthy();
      expect(coachInput.value).toBeTruthy();
      expect(datalistEl.innerHTML).toContain('option value=');
      expect(selectEl.classList.contains('border-amber-500')).toBe(false);
    });

    it('updates standings table rows when changing season team count', () => {
      const tbody = registerMock('season-standings-tbody');
      changeSeasonTeamCount('10');
      expect(tbody.innerHTML).toContain('id="season-team-10"');
      expect(tbody.innerHTML).not.toContain('id="season-team-11"');
    });

    it('toggles collapsible section and rotates chevron', () => {
      const sectionContent = registerMock('my-section-content');
      const sectionChevron = registerMock('my-section-chevron');

      sectionContent.classList.add('hidden');
      toggleSeasonSection('my-section');

      expect(sectionContent.classList.contains('hidden')).toBe(false);
      expect(sectionChevron.classList.contains('rotate-180')).toBe(true);

      toggleSeasonSection('my-section');
      expect(sectionContent.classList.contains('hidden')).toBe(true);
      expect(sectionChevron.classList.contains('rotate-180')).toBe(false);
    });
  });

  describe('SeasonModalController saveSeason', () => {
    it('validates year format and rejects invalid season strings', () => {
      registerMock('season-field-year', 'input').value = '2026-27'; // Invalid format (should be YYYY/YY)
      registerMock('season-field-comp-name', 'input').value = 'Serie Atlas 2026-27';
      registerMock('season-field-team-count', 'select').value = '8';

      const event = { preventDefault: vi.fn() } as unknown as Event;
      const initialCompCount = state.competitions.length;

      saveSeason(event);
      expect(event.preventDefault).toHaveBeenCalled();
      // No competition should be added
      expect(state.competitions.length).toBe(initialCompCount);
    });

    it('correctly creates a new season, awards trophies, increments distinct years, and handles playout', () => {
      const modalEl = registerMock('season-modal');
      registerMock('season-field-year', 'input').value = '2027/28';
      registerMock('season-field-comp-name', 'input').value = 'Serie Atlas 2027-2028';
      registerMock('season-field-team-count', 'select').value = '8';

      // Setup 8 teams using whatever managers exist in state
      const mgrIds = state.managers.slice(0, 8).map(m => m.id);
      
      // Snapshot baseline stats for 1st, 2nd, 3rd, 8th
      const m1Before = state.managers.find(m => m.id === mgrIds[0])!;
      const m1GoldBefore = m1Before.gold || 0;
      const m1YearsBefore = m1Before.years || 1;

      const m2Before = state.managers.find(m => m.id === mgrIds[1])!;
      const m2SilverBefore = m2Before.silver || 0;

      const m3Before = state.managers.find(m => m.id === mgrIds[2])!;
      const m3BronzeBefore = m3Before.bronze || 0;

      const m8Before = state.managers.find(m => m.id === mgrIds[7])!;
      const m8SpoonBefore = m8Before.spoon || 0;

      for (let i = 1; i <= 8; i++) {
        registerMock(`season-team-${i}`, 'input').value = `Team ${i}`;
        registerMock(`season-coach-${i}`, 'input').value = `Coach ${i}`;
        registerMock(`season-manager-${i}`, 'select').value = mgrIds[i - 1];
        registerMock(`season-points-${i}`, 'input').value = `${70 - i * 3}`;
      }

      // Secondary cups
      registerMock('season-cup-gold', 'select').value = mgrIds[0];
      registerMock('season-cup-silver', 'select').value = mgrIds[2];
      registerMock('season-supercup-gold', 'select').value = '';
      registerMock('season-supercup-silver', 'select').value = '';
      registerMock('season-mundialito-gold', 'select').value = '';
      registerMock('season-mundialito-silver', 'select').value = '';
      registerMock('season-cartonato-winner', 'select').value = mgrIds[7];
      registerMock('season-cartonato-coach', 'input').value = 'MAZZARRI';

      const event = { preventDefault: vi.fn() } as unknown as Event;
      saveSeason(event);

      // Verify Championship was created and prepended
      const champ = state.competitions.find(c => c.season === '2027/28' && c.category === 'Campionato');
      expect(champ).toBeDefined();
      expect(champ?.name).toBe('Serie Atlas 2027-2028');
      expect(champ?.ranking.length).toBe(8);
      expect(champ?.ranking[0].managerId).toBe(mgrIds[0]);
      expect(champ?.ranking[0].rank).toBe(1);

      // Verify Coppa was created
      const coppa = state.competitions.find(c => c.season === '2027/28' && c.category === 'Coppa');
      expect(coppa).toBeDefined();
      expect(coppa?.ranking[0].managerId).toBe(mgrIds[0]);
      expect(coppa?.ranking[1].managerId).toBe(mgrIds[2]);

      // Verify Playout was created
      const playout = state.competitions.find(c => c.season === '2027/28' && c.category === 'Playout');
      expect(playout).toBeDefined();
      expect(playout?.ranking[0].managerId).toBe(mgrIds[7]);

      // Verify Manager trophies & years
      const m1After = state.managers.find(m => m.id === mgrIds[0])!;
      expect(m1After.gold).toBe(m1GoldBefore + 1);
      expect(m1After.years).toBe(m1YearsBefore + 1);
      expect(m1After.cup_gold).toBeGreaterThanOrEqual(1);

      const m2After = state.managers.find(m => m.id === mgrIds[1])!;
      expect(m2After.silver).toBe(m2SilverBefore + 1);

      const m3After = state.managers.find(m => m.id === mgrIds[2])!;
      expect(m3After.bronze).toBe(m3BronzeBefore + 1);

      const m8After = state.managers.find(m => m.id === mgrIds[7])!;
      expect(m8After.spoon).toBe(m8SpoonBefore + 1);
      expect(m8After.cartonato).toBeGreaterThanOrEqual(1);
      expect(m8After.cartonato_coaches).toContain('MAZZARRI');

      // Verify modal was closed
      expect(modalEl.classList.contains('hidden')).toBe(true);
    });

    it('cleans up and rolls back previous awards when overwriting an existing season', () => {
      // Re-saving the same season should not double-count years or gold trophies
      const m1 = state.managers[0]!;
      const goldCount = m1.gold || 0;
      const yearsCount = m1.years || 1;

      // Mock confirmation dialog returning true
      (globalThis as any).confirm = vi.fn(() => true);

      const event = { preventDefault: vi.fn() } as unknown as Event;
      saveSeason(event);

      const m1AfterOverwrite = state.managers.find(m => m.id === m1.id)!;
      // Gold and years should remain exactly the same as after 1st save, NOT +2
      expect(m1AfterOverwrite.gold).toBe(goldCount);
      expect(m1AfterOverwrite.years).toBe(yearsCount);
    });

    it('does NOT award trophies or spoons when saving with in_progress = true', () => {
      registerMock('season-modal');
      registerMock('season-field-year', 'input').value = '2028/29';
      registerMock('season-field-comp-name', 'input').value = 'Serie Atlas 2028-2029';
      registerMock('season-field-team-count', 'select').value = '8';

      const inProgressEl = registerMock('season-field-in-progress', 'input');
      (inProgressEl as unknown as HTMLInputElement).checked = true;

      const mgrIds = state.managers.slice(0, 8).map(m => m.id);
      const m1Before = state.managers.find(m => m.id === mgrIds[0])!;
      const m1GoldBefore = m1Before.gold || 0;
      const m1YearsBefore = m1Before.years || 1;

      const m8Before = state.managers.find(m => m.id === mgrIds[7])!;
      const m8SpoonBefore = m8Before.spoon || 0;

      for (let i = 1; i <= 8; i++) {
        registerMock(`season-team-${i}`, 'input').value = `Team ${i}`;
        registerMock(`season-coach-${i}`, 'input').value = `Coach ${i}`;
        registerMock(`season-manager-${i}`, 'select').value = mgrIds[i - 1];
        registerMock(`season-points-${i}`, 'input').value = '0';
      }

      // Secondary cup inputs filled (should not award honors when in_progress)
      registerMock('season-cup-gold', 'select').value = mgrIds[0];
      registerMock('season-cup-silver', 'select').value = mgrIds[2];
      registerMock('season-supercup-gold', 'select').value = '';
      registerMock('season-supercup-silver', 'select').value = '';
      registerMock('season-mundialito-gold', 'select').value = '';
      registerMock('season-mundialito-silver', 'select').value = '';
      registerMock('season-cartonato-winner', 'select').value = '';
      registerMock('season-cartonato-coach', 'input').value = '';

      const event = { preventDefault: vi.fn() } as unknown as Event;
      saveSeason(event);

      const champ = state.competitions.find(c => c.season === '2028/29' && c.category === 'Campionato');
      expect(champ).toBeDefined();
      expect(champ?.in_progress).toBe(true);
      expect(champ?.status).toBe('in_progress');

      const m1After = state.managers.find(m => m.id === mgrIds[0])!;
      // Gold and cup honors should NOT be incremented
      expect(m1After.gold).toBe(m1GoldBefore);
      // Years played IS incremented (participating active season)
      expect(m1After.years).toBe(m1YearsBefore + 1);

      const m8After = state.managers.find(m => m.id === mgrIds[7])!;
      expect(m8After.spoon).toBe(m8SpoonBefore);

      // Verify history item has in_progress flag and empty achievements
      const historyEntry = m1After.history?.find(h => h.season === '2028/29');
      expect(historyEntry).toBeDefined();
      expect(historyEntry?.in_progress).toBe(true);
      expect(historyEntry?.achievements).toEqual([]);
    });
  });
});
