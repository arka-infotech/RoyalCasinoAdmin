/** Prefix a path with NEXT_PUBLIC_BASE_PATH (e.g. /royal-casino) for client fetch calls. */
export function apiPath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
