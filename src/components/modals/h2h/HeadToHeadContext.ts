/**
 * Context saved when navigating from an active H2H duel to a manager profile
 */
export interface H2HReturnContext {
  managerIdA: string;
  managerIdB: string;
}

let h2hReturnContext: H2HReturnContext | null = null;

export function getH2HReturnContext(): H2HReturnContext | null {
  return h2hReturnContext;
}

export function setH2HReturnContext(context: H2HReturnContext | null): void {
  h2hReturnContext = context;
}

export function clearH2HReturnContext(): void {
  h2hReturnContext = null;
}

/**
 * Context saved when navigating from a manager profile to an active H2H duel
 */
export interface ProfileReturnContext {
  managerId: string;
}

let profileReturnContext: ProfileReturnContext | null = null;

export function getProfileReturnContext(): ProfileReturnContext | null {
  return profileReturnContext;
}

export function setProfileReturnContext(context: ProfileReturnContext | null): void {
  profileReturnContext = context;
}

export function clearProfileReturnContext(): void {
  profileReturnContext = null;
}
