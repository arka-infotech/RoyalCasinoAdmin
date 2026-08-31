/** NEXT_PUBLIC_BASE_PATH at build time (e.g. /royal-casino). Empty string when served at domain root. */
export function getBasePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!raw || raw === "/") return "";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

/**
 * Normalize request pathname for routing checks.
 * Next.js usually strips basePath in middleware, but nginx may forward the full
 * external path (/royal-casino/login). Strip the prefix so public-route checks work.
 */
export function stripBasePath(pathname: string): string {
  const base = getBasePath();
  if (!base) return pathname || "/";
  if (pathname === base) return "/";
  if (pathname.startsWith(`${base}/`)) {
    const rest = pathname.slice(base.length);
    return rest || "/";
  }
  return pathname || "/";
}
