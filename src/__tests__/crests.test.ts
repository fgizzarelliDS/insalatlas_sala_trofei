import { describe, it, expect } from 'vitest';
import {
  CREST_IDS,
  CRESTS_CATALOG,
  normalizeTeamName,
  hashTeamName,
  getTeamFallbackCrest,
  isCustomLogo,
  resolveTeamLogo,
  CUSTOM_CREST_OVERRIDES
} from '@/crests';

describe('Vector Team Crest Fallback Engine', () => {
  describe('Catalog Integrity', () => {
    it('has exactly 20 unique crest IDs in catalog', () => {
      expect(CREST_IDS.length).toBe(20);
      const unique = new Set(CREST_IDS);
      expect(unique.size).toBe(20);
    });

    it('has metadata and valid SVG file paths for every crest ID', () => {
      CREST_IDS.forEach(id => {
        const meta = CRESTS_CATALOG[id];
        expect(meta).toBeDefined();
        expect(meta.id).toBe(id);
        expect(meta.name.length).toBeGreaterThan(0);
        expect(meta.era.length).toBeGreaterThan(0);
        expect(meta.file).toBe(`assets/crests/${id}.svg`);
      });
    });
  });

  describe('normalizeTeamName', () => {
    it('handles null, undefined and empty inputs', () => {
      expect(normalizeTeamName(null)).toBe('');
      expect(normalizeTeamName(undefined)).toBe('');
      expect(normalizeTeamName('')).toBe('');
      expect(normalizeTeamName('   ')).toBe('');
    });

    it('normalizes casing and collapses internal whitespace', () => {
      expect(normalizeTeamName('Steven Bradbury FC')).toBe('stevenbradburyfc');
      expect(normalizeTeamName('  CarloMonte   FC  ')).toBe('carlomontefc');
      expect(normalizeTeamName('A.C. PICCHIA')).toBe('a.c.picchia');
    });
  });

  describe('hashTeamName (DJB2)', () => {
    it('returns 0 for empty or null inputs', () => {
      expect(hashTeamName(null)).toBe(0);
      expect(hashTeamName(undefined)).toBe(0);
      expect(hashTeamName('')).toBe(0);
    });

    it('is strictly deterministic and non-negative', () => {
      const h1 = hashTeamName('Steven Bradbury FC');
      const h2 = hashTeamName('Steven Bradbury FC');
      expect(h1).toBe(h2);
      expect(h1).toBeGreaterThan(0);
    });

    it('produces identical hashes regardless of spacing and letter case', () => {
      expect(hashTeamName('Steven Bradbury FC')).toBe(hashTeamName('stevenbradburyfc'));
      expect(hashTeamName('CarloMonte FC')).toBe(hashTeamName('  carlomonte fc  '));
    });

    it('hashes different team names to well-distributed values', () => {
      const hA = hashTeamName('Steven Bradbury FC');
      const hB = hashTeamName('CarloMonte FC');
      const hC = hashTeamName('Dinamo Losca');
      expect(hA).not.toBe(hB);
      expect(hB).not.toBe(hC);
    });
  });

  describe('isCustomLogo', () => {
    it('returns false for absent, null, or empty string values', () => {
      expect(isCustomLogo(undefined)).toBe(false);
      expect(isCustomLogo(null)).toBe(false);
      expect(isCustomLogo('')).toBe(false);
      expect(isCustomLogo('   ')).toBe(false);
      expect(isCustomLogo('null')).toBe(false);
      expect(isCustomLogo('undefined')).toBe(false);
    });

    it('returns false for generic Fantacalcio default placeholders', () => {
      expect(isCustomLogo('assets/teams/no_logo.png')).toBe(false);
      expect(isCustomLogo('assets/teams/no_logo1.png')).toBe(false);
      expect(isCustomLogo('assets/teams/no_logo12.png')).toBe(false);
      expect(isCustomLogo('https://cdn.fantacalcio.it/no_logo27.png')).toBe(false);
      expect(isCustomLogo('default_crest.png')).toBe(false);
    });

    it('returns true for authentic user-uploaded custom logos', () => {
      expect(isCustomLogo('assets/teams/2543640_02914103.png')).toBe(true);
      expect(isCustomLogo('assets/teams/07031677-83c5-41e0-8a9a-4396648e1311.png')).toBe(true);
      expect(isCustomLogo('https://leghe.fantacalcio.it/uploads/team_badge.png')).toBe(true);
    });
  });

  describe('resolveTeamLogo & getTeamFallbackCrest', () => {
    it('returns the authentic custom logo when one is present', () => {
      const custom = 'assets/teams/2543640_02914103.png';
      expect(resolveTeamLogo('Steven Bradbury FC', custom)).toBe(custom);
    });

    it('returns deterministic vector SVG crest when logo is null or empty', () => {
      const fallback = getTeamFallbackCrest('Steven Bradbury FC');
      expect(fallback).toMatch(/^assets\/crests\/[a-z_]+\.svg$/);
      const resolved = resolveTeamLogo('Steven Bradbury FC', null);
      expect(resolved).toBe(fallback);
      // Resolving again for same team produces the exact same file
      expect(resolveTeamLogo('Steven Bradbury FC', undefined)).toBe(resolved);
    });

    it('replaces generic Fantacalcio no_logo placeholders with deterministic SVG crest', () => {
      const resolvedPlaceholder = resolveTeamLogo('CarloMonte FC', 'assets/teams/no_logo14.png');
      expect(resolvedPlaceholder).toMatch(/^assets\/crests\/[a-z_]+\.svg$/);
      expect(resolvedPlaceholder).not.toContain('no_logo');

      const resolvedClean = resolveTeamLogo('CarloMonte FC', null);
      expect(resolvedPlaceholder).toBe(resolvedClean);
    });

    it('respects manual overrides if configured in CUSTOM_CREST_OVERRIDES', () => {
      CUSTOM_CREST_OVERRIDES['customoverridefc'] = 'golden_griffin';
      expect(resolveTeamLogo('Custom Override FC', null)).toBe('assets/crests/golden_griffin.svg');
      delete CUSTOM_CREST_OVERRIDES['customoverridefc'];
    });
  });
});
