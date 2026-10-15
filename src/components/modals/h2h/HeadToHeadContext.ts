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
