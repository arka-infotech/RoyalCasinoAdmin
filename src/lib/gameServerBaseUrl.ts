/**
 * Node fetch() and socket.io-client need an HTTP(S) origin (e.g. http://localhost:3001).
 * Accepts common mistakes: `localhost:3001`, WebSocket URLs `ws://host:port/...`, or full Socket.IO paths.
 */
import { withGameServerBasePath } from "@/lib/gameServerBasePath";

export function normalizeGameServerBaseUrl(
  raw: string | undefined | null,
): string | null {
  if (raw == null || typeof raw !== "string") return null;
  let s = raw.trim();
  if (!s) return null;

  if (/^wss:\/\//i.test(s)) {
    s = "https://" + s.slice(6);
  } else if (/^ws:\/\//i.test(s)) {
    s = "http://" + s.slice(5);
  }

  if (!/^https?:\/\//i.test(s)) {
    s = `http://${s}`;
  }

  try {
    const u = new URL(s);
    return u.origin;
  } catch {
    return null;
  }
}

/** Browser Socket.IO origin + engine path. `/api` in the URL or BASE_PATH becomes `/api/socket.io`. */
export function getBrowserSocketConfig(): { origin: string; path: string } {
  const raw =
    process.env.NEXT_PUBLIC_GAME_SOCKET_URL ||
    process.env.NEXT_PUBLIC_LUCKY_GAME_SERVER_URL ||
    "http://localhost:3037";

  let origin = "http://localhost:3037";
  let prefix = process.env.NEXT_PUBLIC_LUCKY_GAME_BASE_PATH || "";

  try {
    let s = raw.trim();
    if (/^wss:\/\//i.test(s)) s = "https://" + s.slice(6);
    else if (/^ws:\/\//i.test(s)) s = "http://" + s.slice(5);
    if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
    const u = new URL(s);
    origin = u.origin;
    if (u.pathname && u.pathname !== "/") {
      prefix = u.pathname;
    }
  } catch {
    // keep defaults
  }

  return {
    origin,
    path: withGameServerBasePath("/socket.io", prefix),
  };
}
