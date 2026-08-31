/** Prefix a path with NEXT_PUBLIC_BASE_PATH (e.g. /royal-casino) for client fetch calls. */
import { getBasePath } from './basePath';

export function apiPath(path: string): string {
  const base = getBasePath();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
