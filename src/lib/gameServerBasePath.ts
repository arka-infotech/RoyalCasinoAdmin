/**
 * Optional URL prefix used by reverse proxy (e.g. "/sai-lucky").
 * Normalizes common inputs and returns empty string when no prefix is set.
 */
export function normalizeGameServerBasePath(raw: string | undefined | null): string {
  if (raw == null || typeof raw !== "string") return "";
  let s = raw.trim();
  if (!s) return "";

  if (/^https?:\/\//i.test(s)) {
    try {
      s = new URL(s).pathname;
    } catch {
      return "";
    }
  }

  if (!s.startsWith("/")) s = `/${s}`;
  s = s.replace(/\/+$/, "");

  // Accept accidental endpoint values and collapse to the shared base path.
  s = s.replace(/\/socket\.io$/i, "");
  s = s.replace(/\/api$/i, "");

  return s === "/" ? "" : s;
}

export function withGameServerBasePath(pathname: string, basePathRaw: string | undefined | null): string {
  const basePath = normalizeGameServerBasePath(basePathRaw);
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${basePath}${path}`;
}
