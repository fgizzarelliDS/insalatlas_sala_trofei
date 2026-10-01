import { describe, it, expect } from 'vitest';
import { calculateManagerScore, formatScore, getSortedManagers } from '@/score';
import { Manager } from '@/types';
import { createTestManager } from './test-utils';

describe('score.ts - Invariants and Formulations', () => {
  const baseManager: Manager = createTestManager({
    id: 'm1',
    name: 'Test Manager',
    years: 5,
    gold: 1,
    silver: 1,
    bronze: 1,
    cup_gold: 1,
    cup_silver: 1,
    supercup: 1,
    mundialito: 1,
    spoon: 1,
    cartonato: 1
  });

  describe('calculateManagerScore', () => {
    it('accurately computes score with official weights and penalties', () => {
      // gold: 1 * 3.0 = 3.0
      // cup_gold: 1 * 2.0 = 2.0
      // supercup: 1 * 1.0 = 1.0
      // mundialito: 1 * 1.0 = 1.0
      // silver: 1 * 0.5 = 0.5
      // cup_silver: 1 * 0.25 = 0.25
      // bronze: 1 * 0.25 = 0.25
      // spoon: 1 * -1.0 = -1.0
      // cartonato: 1 * -2.0 = -2.0
      // Total = 3 + 2 + 1 + 1 + 0.5 + 0.25 + 0.25 - 1 - 2 = 5.0
      const score = calculateManagerScore(baseManager);
      expect(score).toBe(5.0);
    });

    it('handles managers with missing or zero properties without NaN', () => {
      const minimalManager: Manager = createTestManager({
        id: 'm_min',
        name: 'Novice',
        years: 1
      });
      expect(calculateManagerScore(minimalManager)).toBe(0);
    });

    it('accurately reflects negative total ratings from dishonors', () => {
      const unluckyManager: Manager = createTestManager({
        id: 'm_bad',
        name: 'Spoon Specialist',
        years: 2,
        spoon: 3,
        cartonato: 2
      });
      // 3 * -1.0 + 2 * -2.0 = -3.0 - 4.0 = -7.0
      expect(calculateManagerScore(unluckyManager)).toBe(-7.0);
    });
  });

  describe('formatScore', () => {
    it('returns exact integers when there are no decimals', () => {
      expect(formatScore(10)).toBe(10);
      expect(formatScore(0)).toBe(0);
      expect(formatScore(-5)).toBe(-5);
    });

    it('rounds floating point values to 2 decimal places', () => {
      expect(formatScore(7.854)).toBe(7.85);
      expect(formatScore(7.856)).toBe(7.86);
      expect(formatScore(1.3333333)).toBe(1.33);
    });
  });

  describe('getSortedManagers', () => {
    const list: Manager[] = [
      createTestManager({ id: '1', name: 'Zorro', years: 5, gold: 1 }),
      createTestManager({ id: '2', name: 'Alpha', years: 2, gold: 2, cup_gold: 1 }),
      createTestManager({ id: '3', name: 'Beta', years: 8, supercup: 1, spoon: 2 })
    ];

    it('sorts by total trophies descending with tie-breakers', () => {
      const sorted = getSortedManagers(list, 'trophies_desc');
      expect(sorted[0].id).toBe('2'); // 3 trophies
      expect(sorted[1].id).toBe('1'); // 1 trophy
      expect(sorted[2].id).toBe('3'); // 1 trophy, 0 gold
    });

    it('sorts by rating descending', () => {
      const sorted = getSortedManagers(list, 'rating_desc');
      expect(sorted[0].id).toBe('2'); // Highest score
      expect(sorted[sorted.length - 1].id).toBe('3'); // Spoon penalty makes it lowest
    });

    it('sorts alphabetically by name', () => {
      const sorted = getSortedManagers(list, 'name');
      expect(sorted.map(m => m.name)).toEqual(['Alpha', 'Beta', 'Zorro']);
    });

    it('sorts by spoons descending', () => {
      const sorted = getSortedManagers(list, 'spoons_desc');
      expect(sorted[0].id).toBe('3'); // 2 spoons
    });
  });
});
