import type { Manager, CompetitionRecord } from '@/types';
import { state } from '@/state';

export interface ParsedChampionshipRow {
  rank: number;
  teamName: string;
  coachName?: string;
  points: number;
  matchedManagerId?: string;
}

export interface ParsedFantacalcioData {
  season?: string;
  competitionName?: string;
  leagueUrl?: string;
  rows: ParsedChampionshipRow[];
}

import aliasesData from '../../data/aliases.json';

export const KNOWN_COACH_MAPPINGS: Record<string, string> = aliasesData as Record<string, string>;

/**
 * Normalizes a string for entity matching (lowercase, trimmed, collapsed whitespace)
 */
function norm(str?: string | null): string {
  return (str || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Attempts to match a raw coach handle and team name to an InsalAtlas manager ID
 */
export function matchManagerId(
  coachName?: string,
  teamName?: string,
  managers: Manager[] = state.managers || []
): string | undefined {
  const c = norm(coachName);
  const t = norm(teamName);

  // 1. Match coach handle against data/aliases.json
  if (c && KNOWN_COACH_MAPPINGS[c]) {
    return KNOWN_COACH_MAPPINGS[c];
  }

  // 2. Match by official manager display name
  if (c) {
    const byMgrName = managers.find(m => norm(m.name) === c);
    if (byMgrName) return byMgrName.id;
  }

  // 3. Dynamic team match against historical competition records in state
  if (t && state.competitions) {
    for (const comp of state.competitions) {
      if (!comp.ranking) continue;
      const found = comp.ranking.find(
        r => r.managerId && r.teamName && (norm(r.teamName) === t || t.includes(norm(r.teamName)) || norm(r.teamName).includes(t))
      );
      if (found && found.managerId) {
        return found.managerId;
      }
    }
  }

  // 4. Check if teamName contains any known coach alias from data/aliases.json (e.g. 'Dinamo Paiden')
  if (t) {
    for (const [alias, mId] of Object.entries(KNOWN_COACH_MAPPINGS)) {
      if (alias.length >= 3 && t.includes(alias)) {
        return mId;
      }
    }
  }

  return undefined;
}

/**
 * Computes suggested next chronological season edition (e.g. '2026/27')
 */
export function getSuggestedNextSeason(
  competitions: CompetitionRecord[] = state.competitions || []
): string {
  const years = competitions
    .map(c => {
      const match = (c.season || '').match(/(\d{4})/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(y => y > 0);

  const maxYear = years.length > 0 ? Math.max(...years) : 2025;
  const nextStart = maxYear + 1;
  const nextEnd = String(nextStart + 1).slice(-2);
  return `${nextStart}/${nextEnd}`;
}

/**
 * Extracts latest team used, distinct historical teams, and coach alias for a given manager
 */
export function getManagerHistoricalDefaults(
  managerId: string,
  managers: Manager[] = state.managers || [],
  competitions: CompetitionRecord[] = state.competitions || []
): { latestTeam: string; allTeams: string[]; coach: string } {
  const allTeamsSet = new Set<string>();
  let latestTeam = '';
  let foundCoach = '';

  // Sort competitions chronologically descending
  const sortedComps = [...competitions].sort((a, b) => {
    const yA = parseInt((a.season || '').match(/\d{4}/)?.[0] || '0', 10);
    const yB = parseInt((b.season || '').match(/\d{4}/)?.[0] || '0', 10);
    return yB - yA;
  });

  for (const comp of sortedComps) {
    if (!comp.ranking) continue;
    const item = comp.ranking.find(r => r.managerId === managerId);
    if (item) {
      if (item.teamName && item.teamName.trim()) {
        const t = item.teamName.trim();
        allTeamsSet.add(t);
        if (!latestTeam) latestTeam = t;
      }
      if (item.coach && item.coach.trim() && !foundCoach) {
        foundCoach = item.coach.trim();
      }
    }
  }

  // Fallback coach search in KNOWN_COACH_MAPPINGS
  if (!foundCoach) {
    for (const [coachAlias, mId] of Object.entries(KNOWN_COACH_MAPPINGS)) {
      if (mId === managerId) {
        foundCoach = coachAlias;
        break;
      }
    }
  }

  // Fallback to manager name if no coach found
  if (!foundCoach) {
    const mgr = managers.find(m => m.id === managerId);
    if (mgr) foundCoach = mgr.name;
  }

  return {
    latestTeam,
    allTeams: Array.from(allTeamsSet),
    coach: foundCoach
  };
}

/**
 * Parses raw text copied from Fantacalcio (CSV, TSV, vertical blocks, or regex lines)
 */
export function parseFantacalcioText(
  rawText: string,
  managers: Manager[] = state.managers || []
): ParsedFantacalcioData {
  if (!rawText || !rawText.trim()) {
    return { rows: [] };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let detectedSeason: string | undefined;
  let detectedCompName: string | undefined;
  let detectedLeagueUrl: string | undefined;

  // 1. Check for header metadata in the first 4 lines
  for (let i = 0; i < Math.min(4, lines.length); i++) {
    const line = lines[i];

    // Detect URL
    if (line.includes('leghe.fantacalcio.it')) {
      const urlMatch = line.match(/https?:\/\/leghe\.fantacalcio\.it\/[a-zA-Z0-9_\-]+/);
      if (urlMatch) detectedLeagueUrl = urlMatch[0];
      continue;
    }

    // Detect Tournament / Season from title lines like "Classifica Coppa InsalAtlas LeaguePh 26-27"
    if (/classifica/i.test(line)) {
      detectedCompName = line.replace(/^classifica\s+/i, '').replace(/,+$/, '').trim();

      // Check for two-digit or four-digit season pattern e.g. "26-27" or "2026-2027" or "2026/27"
      const seasonMatch = line.match(/(\d{2,4})[-/](\d{2,4})/);
      if (seasonMatch) {
        let y1 = parseInt(seasonMatch[1], 10);
        let y2 = parseInt(seasonMatch[2], 10);
        if (y1 < 100) y1 += 2000;
        if (y2 >= 100) y2 = y2 % 100;
        const s2 = String(y2).padStart(2, '0');
        detectedSeason = `${y1}/${s2}`;
      }
    }
  }

  const parsedRows: ParsedChampionshipRow[] = [];

  // Helper to test if a string represents an integer or decimal score
  const isScore = (val: string) => /^-?\d+(\.\d+)?$/.test(val.replace(',', '.'));
  const parseScore = (val: string) => parseFloat(val.replace(',', '.')) || 0;

  // Strategy A: Standard CSV / TSV delimited table
  // Look for lines that look like table rows
  for (const line of lines) {
    // Skip known header lines
    if (/^pos\b|classifica|https?:|squadra/i.test(line) && !/^\d+/.test(line)) {
      continue;
    }

    // Check delimiters: comma or tab
    const delimiter = line.includes('\t') ? '\t' : line.includes(',') ? ',' : null;
    if (delimiter) {
      const parts = line.split(delimiter).map(p => p.trim());
      const rankNum = parseInt(parts[0], 10);

      if (!isNaN(rankNum) && rankNum > 0 && parts.length >= 2) {
        const teamName = parts[1];
        if (!teamName) continue;

        let points = 0;
        let coachName: string | undefined;

        // In Fantacalcio CSV: Pos (0), Squadra (1), G (3), V (4), N (5), P (6), Gf (7), Gs (8), Dr (9), Pt (10), Pt Totali (11)
        if (parts.length >= 11 && isScore(parts[10])) {
          points = parseScore(parts[10]);
        } else if (parts.length >= 3 && isScore(parts[parts.length - 1])) {
          // General TSV format where points is the last or penultimate numeric column
          points = parseScore(parts[parts.length - 1]);
          if (parts.length >= 4 && !isScore(parts[2])) {
            coachName = parts[2];
          }
        }

        const matchedManagerId = matchManagerId(coachName, teamName, managers);
        parsedRows.push({
          rank: rankNum,
          teamName,
          coachName,
          points,
          matchedManagerId
        });
      }
    }
  }

  // If Strategy A succeeded, return rows
  if (parsedRows.length >= 2) {
    return {
      season: detectedSeason,
      competitionName: detectedCompName,
      leagueUrl: detectedLeagueUrl,
      rows: parsedRows.sort((a, b) => a.rank - b.rank)
    };
  }

  // Strategy B: Single-line regex formatted lines (e.g., "1. Steven Bradbury FC alfius91 72 pt" or "1 Scalo San Genesio 65")
  for (const line of lines) {
    const lineMatch = line.match(/^(\d+)[\.\s]+([a-zA-Z0-9\s&'\.-]+?)\s+(?:([a-zA-Z0-9_\.-]+)\s+)?(\d+(?:[.,]\d+)?)\s*(?:pt|punti)?$/i);
    if (lineMatch) {
      const rank = parseInt(lineMatch[1], 10);
      const teamName = lineMatch[2].trim();
      const coachName = lineMatch[3] ? lineMatch[3].trim() : undefined;
      const points = parseScore(lineMatch[4]);
      const matchedManagerId = matchManagerId(coachName, teamName, managers);

      parsedRows.push({
        rank,
        teamName,
        coachName,
        points,
        matchedManagerId
      });
    }
  }

  if (parsedRows.length >= 2) {
    return {
      season: detectedSeason,
      competitionName: detectedCompName,
      leagueUrl: detectedLeagueUrl,
      rows: parsedRows.sort((a, b) => a.rank - b.rank)
    };
  }

  // Strategy C: Multi-line vertical cells parsing
  // Cells copied one per line: [1, Team, Points] or [1, Team, Coach, Points]
  let idx = 0;
  while (idx < lines.length) {
    const rankMatch = lines[idx].match(/^(\d+)$/);
    if (rankMatch) {
      const rank = parseInt(rankMatch[1], 10);
      idx++;
      if (idx < lines.length) {
        const teamName = lines[idx++];
        let coachName: string | undefined;
        let points = 0;

        // Next line could be coach or points
        if (idx < lines.length) {
          if (isScore(lines[idx])) {
            points = parseScore(lines[idx++]);
          } else {
            coachName = lines[idx++];
            if (idx < lines.length && isScore(lines[idx])) {
              points = parseScore(lines[idx++]);
            }
          }
        }

        const matchedManagerId = matchManagerId(coachName, teamName, managers);
        parsedRows.push({
          rank,
          teamName,
          coachName,
          points,
          matchedManagerId
        });
        continue;
      }
    }
    idx++;
  }

  return {
    season: detectedSeason,
    competitionName: detectedCompName,
    leagueUrl: detectedLeagueUrl,
    rows: parsedRows.sort((a, b) => a.rank - b.rank)
  };
}

/**
 * Downloads and parses public Fantacalcio league page HTML via CORS proxy
 */
export async function fetchAndParseFantacalcioUrl(
  url: string,
  managers: Manager[] = state.managers || []
): Promise<ParsedFantacalcioData> {
  const cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http')) {
    throw new Error("L'URL deve iniziare con http:// o https://");
  }

  const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(cleanUrl)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Richiesta fallita (HTTP ${res.status}). La lega potrebbe essere privata o non raggiungibile.`);
    }

    const html = await res.text();
    return parseFantacalcioHtml(html, cleanUrl, managers);
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('abort')) {
      throw new Error('Timeout: il proxy non ha risposto entro 12 secondi. Prova a incollare il testo/CSV.');
    }
    throw new Error(`Impossibile scaricare la lega: ${message}`);
  }
}

/**
 * Parses raw HTML string from Fantacalcio league page
 */
export function parseFantacalcioHtml(
  html: string,
  leagueUrl?: string,
  managers: Manager[] = state.managers || []
): ParsedFantacalcioData {
  const rows: ParsedChampionshipRow[] = [];

  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tableRows = doc.querySelectorAll('table tbody tr, .ranking-row, .table tr');

    tableRows.forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('td, th')).map(c => c.textContent?.trim() || '');
      if (cells.length >= 2) {
        const rank = parseInt(cells[0], 10);
        if (!isNaN(rank) && rank > 0) {
          const teamName = cells[1];
          let points = 0;
          let coachName: string | undefined;

          for (let i = cells.length - 1; i >= 2; i--) {
            const val = cells[i].replace(',', '.');
            if (/^-?\d+(\.\d+)?$/.test(val)) {
              points = parseFloat(val);
              break;
            }
          }

          if (cells.length >= 3 && isNaN(parseFloat(cells[2]))) {
            coachName = cells[2];
          }

          const matchedManagerId = matchManagerId(coachName, teamName, managers);
          rows.push({
            rank,
            teamName,
            coachName,
            points,
            matchedManagerId
          });
        }
      }
    });
  } else {
    // Regex parsing fallback for Node.js / Vitest environment
    const trMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    for (const tr of trMatches) {
      const tdMatches = Array.from(tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map(m =>
        m[1].replace(/<[^>]+>/g, '').trim()
      );
      if (tdMatches.length >= 2) {
        const rank = parseInt(tdMatches[0], 10);
        if (!isNaN(rank) && rank > 0) {
          const teamName = tdMatches[1];
          let points = 0;
          let coachName: string | undefined;

          for (let i = tdMatches.length - 1; i >= 2; i--) {
            const val = tdMatches[i].replace(',', '.');
            if (/^-?\d+(\.\d+)?$/.test(val)) {
              points = parseFloat(val);
              break;
            }
          }

          if (tdMatches.length >= 3 && isNaN(parseFloat(tdMatches[2]))) {
            coachName = tdMatches[2];
          }

          const matchedManagerId = matchManagerId(coachName, teamName, managers);
          rows.push({
            rank,
            teamName,
            coachName,
            points,
            matchedManagerId
          });
        }
      }
    }
  }

  return {
    leagueUrl,
    rows: rows.sort((a, b) => a.rank - b.rank)
  };
}
