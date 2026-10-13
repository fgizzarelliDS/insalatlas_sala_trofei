import { describe, it, expect } from 'vitest';
import {
  computeDisasterMass,
  computeFeastMass,
  computeSmoothedFF,
  computeNetTailSkew,
  getNTIPolarity,
  computeTailRiskProfile,
  getManagerArchetype,
  computeLeagueConcentration,
  computeSmoothedKillerInstinct,
  computeSmoothedConversionRate,
  computeGlobalClutchIndex,
  getClutchTier
} from '@/analytics';
import { Manager } from '@/types';
import { createTestManager } from './test-utils';

describe('analytics.ts - Econometric and Analytical Invariants', () => {
  describe('Tail Mass Computations', () => {
    it('computes disaster mass with spoon (1.0) and cartonato (0.75)', () => {
      expect(computeDisasterMass(0, 0)).toBe(0);
      expect(computeDisasterMass(2, 0)).toBe(2.0);
      expect(computeDisasterMass(0, 2)).toBe(1.5);
      expect(computeDisasterMass(1, 1)).toBe(1.75);
    });

    it('computes feast mass with gold (1.0) and cup gold (0.5)', () => {
      expect(computeFeastMass(0, 0)).toBe(0);
      expect(computeFeastMass(3, 0)).toBe(3.0);
      expect(computeFeastMass(0, 2)).toBe(1.0);
      expect(computeFeastMass(2, 1)).toBe(2.5);
    });
  });

  describe('Empirical Bayes Smoothed Feast-or-Famine', () => {
    it('shrinks small-sample estimates towards the prior', () => {
      // 1 year, 0 tail mass: (0 + 1.0 * 0.3) / (1 + 1) = 0.3 / 2 = 0.15
      const smoothedSmall = computeSmoothedFF(0, 1, 1.0, 0.30);
      expect(smoothedSmall).toBe(0.15);

      // 10 years, 0 tail mass: (0 + 0.3) / 11 = 0.027... -> 0.03
      const smoothedLarge = computeSmoothedFF(0, 10, 1.0, 0.30);
      expect(smoothedLarge).toBe(0.03);
    });

    it('converges to empirical sample rate when sample size is large', () => {
      // 20 years, 10 tail mass: (10 + 0.3) / 21 = 0.4904... -> 0.49
      const smoothed = computeSmoothedFF(10, 20, 1.0, 0.30);
      expect(smoothed).toBe(0.49);
    });
  });

  describe('Regularized Net Tail Skew (NTS)', () => {
    it('returns 0 when total tail mass is 0', () => {
      expect(computeNetTailSkew(0, 0)).toBe(0);
    });

    it('bounds skew smoothly with prior M=1.0 on small samples', () => {
      // Feast 1, Disaster 0: (1 - 0) / (1 + 1.0) = 1 / 2.0 = 0.50
      expect(computeNetTailSkew(1, 0, 1.0)).toBe(0.50);

      // Feast 0, Disaster 1: (0 - 1) / (1 + 1.0) = -1 / 2.0 = -0.50
      expect(computeNetTailSkew(0, 1, 1.0)).toBe(-0.50);
    });

    it('approaches +1 and -1 when tail events dominate heavily', () => {
      // Feast 20, Disaster 0: (20) / (20 + 1.0) = 20 / 21.0 = 0.95
      expect(computeNetTailSkew(20, 0, 1.0)).toBe(0.95);
    });
  });

  describe('NTI Polarity Classification', () => {
    it('classifies Cannibale Assoluto for NTI >= 0.30', () => {
      const pol = getNTIPolarity(0.35);
      expect(pol.label).toBe('Cannibale Assoluto');
      expect(pol.icon).toBe('fa-bolt');
    });

    it('classifies Attaccante Efficace for 0.08 <= NTI < 0.30', () => {
      const pol = getNTIPolarity(0.15);
      expect(pol.label).toBe('Attaccante Efficace');
      expect(pol.icon).toBe('fa-crosshairs');
    });

    it('classifies Neutro / Bilanciato for -0.08 < NTI < 0.08', () => {
      const polZero = getNTIPolarity(0.00);
      expect(polZero.label).toBe('Neutro / Bilanciato');

      const polSlightPos = getNTIPolarity(0.05);
      expect(polSlightPos.label).toBe('Neutro / Bilanciato');

      const polSlightNeg = getNTIPolarity(-0.05);
      expect(polSlightNeg.label).toBe('Neutro / Bilanciato');
    });

    it('classifies Vulnerabile for -0.30 < NTI <= -0.08', () => {
      const pol = getNTIPolarity(-0.15);
      expect(pol.label).toBe('Vulnerabile');
      expect(pol.icon).toBe('fa-shield-halved');
    });

    it('classifies Bersaglio Mobile for NTI <= -0.30', () => {
      const pol = getNTIPolarity(-0.35);
      expect(pol.label).toBe('Bersaglio Mobile');
      expect(pol.icon).toBe('fa-bullseye');
    });
  });

  describe('computeTailRiskProfile', () => {
    it('produces cohesive risk profile for manager', () => {
      const m: Manager = createTestManager({
        id: 'm1',
        name: 'Cannibal',
        years: 4,
        gold: 3,
        cup_gold: 1,
        spoon: 0,
        cartonato: 0
      });
      const profile = computeTailRiskProfile(m, 0.30);
      expect(profile.feastMass).toBe(3.5); // 3*1 + 1*0.5
      expect(profile.disasterMass).toBe(0);
      expect(profile.totalTailMass).toBe(3.5);
      expect(profile.rawFF).toBe(0.88); // 3.5 / 4 = 0.875 -> 0.88
      expect(profile.smoothedFF).toBe(0.76); // (3.5 + 0.3) / 5 = 3.8 / 5 = 0.76
      expect(profile.nts).toBe(0.78); // 3.5 / (3.5 + 1.0) = 3.5 / 4.5 = 0.78
      expect(profile.nti).toBe(0.59); // 0.76 * 0.78 = 0.5928 -> 0.59
      expect(profile.label).toBe('Cannibale Assoluto');
    });
  });

  describe('Manager Archetypes Decision Waterfall', () => {
    it('identifies Dominatore Dinastico (high prestige & high efficiency)', () => {
      const m: Manager = createTestManager({
        id: 'dynast',
        name: 'Dynast',
        years: 5,
        gold: 3,
        cup_gold: 2,
        supercup: 1,
        mundialito: 1
      });
      // Prestige = 3*3 + 2*1.5 + 1*0.75 + 1*0.5 = 9 + 3 + 0.75 + 0.5 = 13.25 >= 10
      // Efficiency >= 0.40
      const arch = getManagerArchetype(m);
      expect(arch.tag).toBe('Dominatore Dinastico');
    });

    it('identifies Vittima Sacrificale (dishonors >= 3)', () => {
      const m: Manager = createTestManager({
        id: 'victim',
        name: 'Victim',
        years: 4,
        spoon: 2,
        cartonato: 1
      });
      const arch = getManagerArchetype(m);
      expect(arch.tag).toBe('Vittima Sacrificale');
    });

    it('identifies Vittima Sacrificale when dishonors >= 2 and zero trophies', () => {
      const m: Manager = createTestManager({
        id: 'victim2',
        name: 'Zero Trophies Victim',
        years: 4,
        spoon: 2,
        cartonato: 0
      });
      const arch = getManagerArchetype(m);
      expect(arch.tag).toBe('Vittima Sacrificale');
    });

    it('identifies Cannibale del Podio (podium rate >= 50% and killer instinct >= 60%)', () => {
      const m: Manager = createTestManager({
        id: 'cannibal',
        name: 'Podium Beast',
        years: 4,
        gold: 2,
        silver: 1,
        bronze: 0,
        spoon: 0,
        cartonato: 0
      });
      // Podiums = 3, PodiumRate = 3/4 = 75%, KillerInstinct = 2/3 = 66.7%
      const arch = getManagerArchetype(m);
      expect(arch.tag).toBe('Cannibale del Podio');
    });

    it('identifies Cinico Chirurgico (finals played >= 2 and conversion rate >= 70%)', () => {
      const m: Manager = createTestManager({
        id: 'clinical',
        name: 'Clinical',
        years: 10,
        cup_gold: 1,
        supercup: 1,
        cup_silver: 0,
        supercup_silver: 0,
        spoon: 0,
        cartonato: 0
      });
      // Cup finals won = 2, finals played = 2, conversion = 100%
      const arch = getManagerArchetype(m);
      expect(arch.tag).toBe('Cinico Chirurgico');
    });

    it('identifies Il Grande Piazzato (podiums >= 3 and killer instinct <= 25%)', () => {
      const m: Manager = createTestManager({
        id: 'placed',
        name: 'Perennial Third',
        years: 5,
        gold: 0,
        silver: 1,
        bronze: 2
      });
      // Podiums = 3, Killer Instinct = 0 / 3 = 0%
      const arch = getManagerArchetype(m);
      expect(arch.tag).toBe('Il Grande Piazzato');
    });

    it('identifies Eterno Secondo (silvers >= 2 and conversion <= 35%)', () => {
      const m: Manager = createTestManager({
        id: 'second',
        name: 'Poulidor',
        years: 6,
        gold: 0,
        cup_gold: 0,
        silver: 2,
        cup_silver: 1
      });
      // Silvers = 3 >= 2, Conversion = 0%
      const arch = getManagerArchetype(m);
      expect(arch.tag).toBe('Eterno Secondo');
    });

    it('identifies All-or-Nothing (smoothed FF >= 0.45, gold/cup >= 1, dishonors >= 1)', () => {
      const m: Manager = createTestManager({
        id: 'wild',
        name: 'Gambler',
        years: 3,
        gold: 1,
        spoon: 1
      });
      // Tail mass = 1 (gold) + 1 (spoon) = 2
      // Smoothed FF = (2 + 0.6) / (3 + 2) = 2.6 / 5 = 0.52 >= 0.45
      const arch = getManagerArchetype(m);
      expect(arch.tag).toBe('All-or-Nothing');
    });

    it('identifies Grinder Metodico (podium rate >= 30%, 0 dishonors, years >= 3)', () => {
      const m: Manager = createTestManager({
        id: 'grinder',
        name: 'Worker',
        years: 5,
        silver: 1,
        bronze: 1,
        spoon: 0,
        cartonato: 0
      });
      // Podiums = 2, Rate = 2/5 = 40% >= 30%, 0 dishonors, years 5 >= 3
      const arch = getManagerArchetype(m);
      expect(arch.tag).toBe('Grinder Metodico');
    });

    it('falls back to Partecipante by default', () => {
      const m: Manager = createTestManager({
        id: 'mid',
        name: 'Ordinary',
        years: 2,
        bronze: 0,
        silver: 0,
        gold: 0
      });
      const arch = getManagerArchetype(m);
      expect(arch.tag).toBe('Partecipante');
    });
  });

  describe('computeLeagueConcentration', () => {
    it('safely handles empty league without NaN or crash', () => {
      const res = computeLeagueConcentration([]);
      expect(res.totalTrophies).toBe(0);
      expect(res.totalPrestige).toBe(0);
      expect(res.giniTrophies).toBe(0);
      expect(res.giniPrestige).toBe(0);
      expect(res.giniRating).toBe(0);
      expect(res.hhi).toBe(0);
      expect(res.relativeEntropy).toBe(0);
      expect(res.tierTitle).toBe('Dati Insufficienti');
    });

    it('calculates perfect parity (Gini = 0, H_rel = 1) when trophies are evenly split', () => {
      const equalManagers: Manager[] = [
        createTestManager({ id: '1', name: 'A', years: 5, gold: 1, cup_gold: 1 }),
        createTestManager({ id: '2', name: 'B', years: 5, gold: 1, cup_gold: 1 }),
        createTestManager({ id: '3', name: 'C', years: 5, gold: 1, cup_gold: 1 }),
        createTestManager({ id: '4', name: 'D', years: 5, gold: 1, cup_gold: 1 })
      ];

      const res = computeLeagueConcentration(equalManagers);
      expect(res.totalTrophies).toBe(8);
      expect(res.giniTrophies).toBe(0);
      expect(res.giniPrestige).toBe(0);
      expect(res.relativeEntropy).toBe(1.00); // Maximum entropy on uniform distribution
      expect(res.cr3Pct).toBe(75.0); // 3 out of 4 is 75%
      expect(res.hhi).toBe(2500); // 4 * (25^2) = 2500
    });

    it('calculates extreme monopoly when one manager holds all major silverware', () => {
      const monopolyManagers: Manager[] = [
        createTestManager({ id: '1', name: 'Emperor', years: 10, gold: 10, cup_gold: 5, supercup: 2 }),
        createTestManager({ id: '2', name: 'Plebeian 1', years: 10, spoon: 2 }),
        createTestManager({ id: '3', name: 'Plebeian 2', years: 10, spoon: 1 }),
        createTestManager({ id: '4', name: 'Plebeian 3', years: 10 })
      ];

      const res = computeLeagueConcentration(monopolyManagers);
      expect(res.cr3Pct).toBe(100);
      expect(res.cr3PrestigePct).toBe(100);
      expect(res.hhi).toBe(10000); // 100^2 = 10,000 (Pure Monopoly)
      expect(res.hhiPrestige).toBe(10000);
      expect(res.relativeEntropy).toBe(0); // Zero entropy: concentrated in 1 manager
      expect(res.giniTrophies).toBe(0.75); // (4-1)/4 = 0.75 for 1 holding all in N=4
      expect(res.giniPrestige).toBe(0.75);
      expect(res.tierTitle).toBe('Feudalesimo Assoluto');
    });

    it('computes dishonor shares accurately with CR3 Dishonors', () => {
      const managers: Manager[] = [
        createTestManager({ id: '1', name: 'A', years: 5, spoon: 3, cartonato: 1 }), // 4
        createTestManager({ id: '2', name: 'B', years: 5, spoon: 1, cartonato: 1 }), // 2
        createTestManager({ id: '3', name: 'C', years: 5, spoon: 0, cartonato: 2 }), // 2
        createTestManager({ id: '4', name: 'D', years: 5, spoon: 0, cartonato: 0 })  // 0
      ];
      // Total dishonors = 4 + 2 + 2 = 8
      // CR3 Dishonors = (4 + 2 + 2) / 8 = 100%
      const res = computeLeagueConcentration(managers);
      expect(res.totalDishonors).toBe(8);
      expect(res.cr3DishonorPct).toBe(100);
      expect(res.dishonorShares[0].name).toBe('A');
      expect(res.dishonorShares[0].count).toBe(4);
      expect(res.dishonorShares[0].sharePct).toBe(50.0);
    });

    it('correctly shifts negative scores for Gini Rating without math domain error', () => {
      const managersWithNegativeRatings: Manager[] = [
        createTestManager({ id: '1', name: 'Top', years: 5, gold: 5 }), // High positive score
        createTestManager({ id: '2', name: 'Middle', years: 5, silver: 1 }), // Low positive score
        createTestManager({ id: '3', name: 'Bottom', years: 5, spoon: 5 }) // Negative score
      ];
      const res = computeLeagueConcentration(managersWithNegativeRatings);
      expect(res.giniRating).toBeGreaterThanOrEqual(0);
      expect(res.giniRating).toBeLessThanOrEqual(1);
    });

    it('accurately computes pure cup finals conversion rate including Supercoppa for Alfo (6 won / 7 played = 85.7%)', () => {
      const alfo: Manager = createTestManager({
        id: 'm_alfo',
        name: 'Alfo',
        years: 10,
        gold: 1,
        silver: 3,
        cup_gold: 3,
        cup_silver: 0,
        supercup: 3,
        supercup_silver: 1
      });
      // finalsWon = 3 (cup_gold) + 3 (supercup) = 6
      // finalsPlayed = 6 + 0 (cup_silver) + 1 (supercup_silver) = 7
      // conversionRatePct = (6 / 7) * 100 = 85.7%
      const res = computeLeagueConcentration([alfo]);
      const profile = res.profiles[0];
      expect(profile.finalsWon).toBe(6);
      expect(profile.finalsPlayed).toBe(7);
      expect(profile.conversionRatePct).toBe(85.7);
    });

    it('handles zero finals played safely with conversionRatePct 0', () => {
      const m: Manager = createTestManager({
        id: 'zero',
        name: 'NoFinals',
        years: 3
      });
      const res = computeLeagueConcentration([m]);
      const profile = res.profiles[0];
      expect(profile.finalsWon).toBe(0);
      expect(profile.finalsPlayed).toBe(0);
      expect(profile.conversionRatePct).toBe(0);
    });

    it('uses completed seasons (excluding in-progress seasons) as denominator for efficiency and podium rate', () => {
      const veteranWithActiveSeason: Manager = createTestManager({
        id: 'm_vet',
        name: 'Veteran',
        years: 11, // In raw data, years might say 11 (including active season)
        gold: 2,
        silver: 1,
        bronze: 1,
        cup_gold: 1,
        history: [
          ...Array.from({ length: 10 }, (_, i) => ({
            season: `201${i}/1${i + 1}`,
            team: 'Team V',
            rank: 3,
            points: 50,
            achievements: []
          })),
          // 11th season is in-progress:
          {
            season: '2026/27',
            team: 'Team V',
            rank: 2,
            points: 6,
            achievements: [],
            in_progress: true
          }
        ]
      });

      const res = computeLeagueConcentration([veteranWithActiveSeason]);
      const profile = res.profiles[0];

      // Total trophies: 2 gold + 1 cup_gold = 3 trophies
      // Denominator must be 10 completed years, NOT 11!
      // Efficiency = 3 / 10 = 0.30 (instead of 3 / 11 = 0.27)
      expect(profile.years).toBe(10);
      expect(profile.efficiency).toBe(0.30);
      // Podiums: 2 + 1 + 1 = 4
      // Podium rate = (4 / 10) * 100 = 40.0% (instead of 4 / 11 = 36.4%)
      expect(profile.podiumRatePct).toBe(40.0);
    });

    it('safely handles a rookie manager active only in an in-progress season with 0 completed years', () => {
      const rookie: Manager = createTestManager({
        id: 'm_rookie',
        name: 'Rookie',
        years: 1,
        history: [
          {
            season: '2026/27',
            team: 'Team R',
            rank: 8,
            points: 0,
            achievements: [],
            in_progress: true
          }
        ]
      });

      const res = computeLeagueConcentration([rookie]);
      const profile = res.profiles[0];

      expect(profile.years).toBe(0);
      expect(profile.efficiency).toBe(0);
      expect(profile.prestigeEfficiency).toBe(0);
      expect(profile.podiumRatePct).toBe(0);
      expect(profile.trophies).toBe(0);
      expect(profile.globalClutchIndex).toBe(0);
      expect(profile.clutchTier).toBe('Debuttante');
      expect(profile.clutchIcon).toBe('🌱');
    });
  });

  describe('Global Clutch Index (GCI)', () => {
    it('computes Bayesian smoothed Killer Instinct with K=1.0 and prior 0.33', () => {
      // 0 gold, 0 podiums: (0 + 1 * 0.33) / (0 + 1) = 0.33
      expect(computeSmoothedKillerInstinct(0, 0)).toBeCloseTo(0.33, 4);

      // 7 gold, 11 podiums: (7 + 0.33) / 12 = 7.33 / 12 = 0.61083...
      expect(computeSmoothedKillerInstinct(7, 11)).toBeCloseTo(0.61083, 4);

      // 0 gold, 4 podiums (choker podiums): (0 + 0.33) / 5 = 0.066
      expect(computeSmoothedKillerInstinct(0, 4)).toBeCloseTo(0.066, 3);
    });

    it('computes Bayesian smoothed Conversion Rate with K=1.0 and prior 0.50', () => {
      // 0 won, 0 played: (0 + 1 * 0.50) / 1 = 0.50
      expect(computeSmoothedConversionRate(0, 0)).toBeCloseTo(0.50, 4);

      // 3 won, 4 played: (3 + 0.50) / 5 = 3.5 / 5 = 0.70
      expect(computeSmoothedConversionRate(3, 4)).toBeCloseTo(0.70, 4);

      // 0 won, 3 played: (0 + 0.50) / 4 = 0.125
      expect(computeSmoothedConversionRate(0, 3)).toBeCloseTo(0.125, 4);
    });

    it('computes Global Clutch Index combining 70% League and 30% Cups with K=1.0', () => {
      // Vannico stats in UI table: 3 gold, 4 podiums, 2 finals won, 3 finals played, 9 completed years
      // KI_bayes = 3.33 / 5 = 0.666
      // CR_bayes = 2.50 / 4 = 0.625
      // GCI = (0.70 * 0.666 + 0.30 * 0.625) * 100 = (0.4662 + 0.1875) * 100 = 65.37 -> 65.4%
      const gciVannico = computeGlobalClutchIndex(3, 4, 2, 3, 9);
      expect(gciVannico).toBe(65.4);

      // Rookie with 0 completed years -> must be strictly 0.0
      const gciRookie = computeGlobalClutchIndex(0, 0, 0, 0, 0);
      expect(gciRookie).toBe(0.0);
    });

    it('correctly maps GCI and completed years to clutch tiers', () => {
      expect(getClutchTier(0.0, 0)).toEqual({
        tier: 'Debuttante',
        label: 'Debuttante',
        icon: '🌱',
        color: '#94a3b8'
      });

      expect(getClutchTier(72.0, 10)).toEqual({
        tier: 'Glaciale',
        label: 'Glaciale',
        icon: '❄️',
        color: '#0ea5e9'
      });

      expect(getClutchTier(61.2, 10)).toEqual({
        tier: 'Cinico',
        label: 'Cinico',
        icon: '🏹',
        color: '#34d399'
      });

      expect(getClutchTier(49.3, 10)).toEqual({
        tier: 'Equilibrato',
        label: 'Equilibrato',
        icon: '⚖️',
        color: '#06b6d4'
      });

      expect(getClutchTier(30.0, 10)).toEqual({
        tier: 'Incerto',
        label: 'Incerto',
        icon: '😶‍🌫️',
        color: '#f59e0b'
      });

      expect(getClutchTier(21.7, 10)).toEqual({
        tier: 'Choker',
        label: 'Choker',
        icon: '🥶',
        color: '#ef4444'
      });
    });

    it('integrates GCI fields into computeLeagueConcentration profiles', () => {
      const veteran = createTestManager({
        id: 'm_top',
        name: 'TopClutch',
        years: 10,
        gold: 7,
        silver: 3,
        bronze: 1, // 11 podiums
        cup_gold: 3,
        cup_silver: 1 // 4 finals played, 3 won
      });

      const res = computeLeagueConcentration([veteran]);
      const p = res.profiles[0];
      // KI_bayes = (7 + 0.33) / 12 = 0.610833
      // CR_bayes = (3 + 0.50) / 5 = 0.70
      // GCI = (0.70 * 0.610833 + 0.30 * 0.70) * 100 = 63.8%
      expect(p.globalClutchIndex).toBe(63.8);
      expect(p.clutchTier).toBe('Cinico');
      expect(p.clutchLabel).toBe('Cinico');
      expect(p.clutchIcon).toBe('🏹');
      expect(p.clutchColor).toBe('#34d399');
    });
  });
});


