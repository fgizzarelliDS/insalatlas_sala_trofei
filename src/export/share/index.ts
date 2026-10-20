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

export * from './profile';
export * from './h2h';
export * from './records';
export * from './albo';
export * from './standings';

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
    copyStandingsToClipboard
  });
}
