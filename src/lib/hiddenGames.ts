/** Incomplete games hidden from catalog, assignment, and every admin list. */
export const HIDDEN_GAME_IDS = ["crash", "aviator", "royal_rummy"] as const;

const HIDDEN_ID_SET = new Set<string>(HIDDEN_GAME_IDS);
const HIDDEN_NAME_RE = /\b(crash|aviator|royal[\s_-]?rummy)\b/i;

export function isHiddenGameId(gameId: string | null | undefined): boolean {
  if (!gameId) return false;
  return HIDDEN_ID_SET.has(gameId.trim().toLowerCase());
}

export function isHiddenGame(game: {
  id?: string | null;
  gameId?: string | null;
  displayName?: string | null;
}): boolean {
  if (isHiddenGameId(game.id) || isHiddenGameId(game.gameId)) return true;
  const name = game.displayName?.trim();
  return Boolean(name && HIDDEN_NAME_RE.test(name));
}

export function withoutHiddenGames<T extends { id?: string | null; gameId?: string | null; displayName?: string | null }>(
  games: T[],
): T[] {
  return games.filter((game) => !isHiddenGame(game));
}

export function withoutHiddenGameIds(gameIds: string[]): string[] {
  return gameIds.filter((id) => !isHiddenGameId(id));
}
