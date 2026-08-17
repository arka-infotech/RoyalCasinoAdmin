import { normalizeGameServerBaseUrl } from "@/lib/gameServerBaseUrl";
import { withGameServerBasePath } from "@/lib/gameServerBasePath";

export function getGameServerOrigin(): string | null {
  return normalizeGameServerBaseUrl(
    process.env.APP_UPDATES_SERVER_URL ??
      process.env.LUCKY_GAME_SERVER_URL ??
      process.env.NEXT_PUBLIC_LUCKY_GAME_SERVER_URL ??
      process.env.NEXT_PUBLIC_GAME_SOCKET_URL,
  );
}

export function getGameServerBasePath(): string {
  return (
    process.env.APP_UPDATES_BASE_PATH ??
    process.env.LUCKY_GAME_BASE_PATH ??
    process.env.NEXT_PUBLIC_LUCKY_GAME_BASE_PATH ??
    "/shree-sai"
  );
}

export function buildGameServerUrl(pathname: string): string | null {
  const origin = getGameServerOrigin();
  if (!origin) return null;
  return `${origin}${withGameServerBasePath(pathname, getGameServerBasePath())}`;
}
