/**
 * Node fetch() and socket.io-client need an HTTP(S) origin (e.g. http://localhost:3001).
 * Accepts common mistakes: `localhost:3001`, WebSocket URLs `ws://host:port/...`, or full Socket.IO paths.
 */
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
