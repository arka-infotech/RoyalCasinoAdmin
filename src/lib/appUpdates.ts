export interface DesktopManifest {
  version: string;
  packageUrl?: string;
  packageName?: string;
  url?: string;
  build?: number;
  sha256?: string;
  notes?: string;
}

export interface MobileManifest {
  versionName: string;
  versionCode?: number;
  apkUrl: string;
  apkFileName?: string;
  sha256?: string;
  force?: boolean;
  title?: string;
  message?: string;
}

const UPDATES_API_PREFIX = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/app-updates`;

const MOBILE_MANIFEST_RELATIVE =
  process.env.NEXT_PUBLIC_MOBILE_UPDATE_MANIFEST?.trim() || "latest.json";

export const DESKTOP_MANIFEST_URL = `${UPDATES_API_PREFIX}/desktop/latest.json`;

export const MOBILE_MANIFEST_URL = `${UPDATES_API_PREFIX}/mobile/${MOBILE_MANIFEST_RELATIVE}`;

function extractUpdatesRelativePath(
  assetUrl: string,
  platform: "desktop" | "mobile",
): string {
  const normalized = assetUrl.split("?")[0]!.replace(/\\/g, "/");

  const markers = [
    `/api/app-updates/${platform}/`,
    `/api/updates/${platform}/`,
  ];

  for (const marker of markers) {
    const idx = normalized.indexOf(marker);
    if (idx !== -1) {
      const relative = normalized.slice(idx + marker.length);
      if (relative) return decodeURIComponent(relative);
    }
  }

  const filename = normalized.split("/").pop();
  if (filename) return filename;

  throw new Error(`No ${platform} asset path in manifest`);
}

export function resolveDesktopDownloadUrl(manifest: DesktopManifest): string {
  if (manifest.packageName) {
    return `${UPDATES_API_PREFIX}/desktop/${manifest.packageName}`;
  }

  if (manifest.packageUrl) {
    const relativePath = extractUpdatesRelativePath(manifest.packageUrl, "desktop");
    return `${UPDATES_API_PREFIX}/desktop/${relativePath}`;
  }

  if (manifest.url) {
    const relativePath = extractUpdatesRelativePath(manifest.url, "desktop");
    return `${UPDATES_API_PREFIX}/desktop/${relativePath}`;
  }

  throw new Error("No download URL in desktop manifest");
}

export function resolveMobileDownloadUrl(manifest: MobileManifest): string {
  if (manifest.apkFileName?.trim()) {
    return `${UPDATES_API_PREFIX}/mobile/${manifest.apkFileName.trim()}`;
  }

  const relativePath = extractUpdatesRelativePath(manifest.apkUrl, "mobile");
  return `${UPDATES_API_PREFIX}/mobile/${relativePath}`;
}
