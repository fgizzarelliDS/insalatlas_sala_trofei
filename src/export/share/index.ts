import {
  shareTeamMatchesWhatsApp,
  shareTeamMatchesNative,
  copyTeamMatchesLink,
  exportTeamMatchesPNG,
  copyTeamMatchesToClipboard,
  shareRealStandingsWhatsApp,
  shareMeritStandingsWhatsApp,
  shareMeritStandingsNative,
  copyMeritStandingsLink,
  shareStandingsWhatsApp,
  exportStandingsPNG,
  copyStandingsToClipboard
} from './standings';
import {
  shareNextRoundWhatsApp,
  exportNextRoundPNG,
  copyNextRoundToClipboard
} from './nextRound';

export * from './profile';
export * from './h2h';
export * from './records';
export * from './albo';
export * from './standings';
export * from './nextRound';

if (typeof window !== 'undefined') {
  Object.assign(window, {
    shareTeamMatchesWhatsApp,
    shareTeamMatchesNative,
    copyTeamMatchesLink,
    exportTeamMatchesPNG,
    copyTeamMatchesToClipboard,
    shareRealStandingsWhatsApp,
    shareMeritStandingsWhatsApp,
    shareMeritStandingsNative,
    copyMeritStandingsLink,
    shareStandingsWhatsApp,
    exportStandingsPNG,
    copyStandingsToClipboard,
    shareNextRoundWhatsApp,
    exportNextRoundPNG,
    copyNextRoundToClipboard
  });
}
