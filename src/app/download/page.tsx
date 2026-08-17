"use client";

import { useEffect, useState } from "react";
import {
  Monitor,
  Smartphone,
  Download,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  DESKTOP_MANIFEST_URL,
  MOBILE_MANIFEST_URL,
  resolveDesktopDownloadUrl,
  resolveMobileDownloadUrl,
  type DesktopManifest,
  type MobileManifest,
} from "@/lib/appUpdates";

type Platform = "desktop" | "mobile";

interface PlatformState {
  version: string | null;
  loading: boolean;
  error: string | null;
  downloading: boolean;
}

const initial: PlatformState = {
  version: null,
  loading: true,
  error: null,
  downloading: false,
};

const APP_TITLE = "Shree Sai"

function fetchManifest(url: string) {
  const bust = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
  return fetch(bust, { cache: "no-store" });
}

export default function DownloadPage() {
  const [desktop, setDesktop] = useState<PlatformState>(initial);
  const [mobile, setMobile] = useState<PlatformState>(initial);

  useEffect(() => {
    async function fetchVersions() {
      try {
        const res = await fetchManifest(DESKTOP_MANIFEST_URL);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data: DesktopManifest = await res.json();
        setDesktop((s) => ({ ...s, version: data.version, loading: false }));
      } catch {
        setDesktop((s) => ({
          ...s,
          loading: false,
          error: "Could not load version info",
        }));
      }

      try {
        const res = await fetchManifest(MOBILE_MANIFEST_URL);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data: MobileManifest = await res.json();
        setMobile((s) => ({
          ...s,
          version: data.versionName,
          loading: false,
        }));
      } catch {
        setMobile((s) => ({
          ...s,
          loading: false,
          error: "Could not load version info",
        }));
      }
    }

    fetchVersions();
  }, []);

  async function handleDownload(platform: Platform) {
    const setState = platform === "desktop" ? setDesktop : setMobile;

    setState((s) => ({ ...s, downloading: true, error: null }));
    try {
      if (platform === "desktop") {
        const res = await fetchManifest(DESKTOP_MANIFEST_URL);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data: DesktopManifest = await res.json();
        window.location.href = resolveDesktopDownloadUrl(data);
      } else {
        const res = await fetchManifest(MOBILE_MANIFEST_URL);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data: MobileManifest = await res.json();
        window.location.href = resolveMobileDownloadUrl(data);
      }
    } catch {
      setState((s) => ({
        ...s,
        error: "Download failed. Please try again.",
      }));
    } finally {
      setState((s) => ({ ...s, downloading: false }));
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{APP_TITLE}</h1>
          <p className="text-slate-500 mt-2">
            Download the latest version for your device
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <DownloadCard
            icon={<Monitor className="h-8 w-8" />}
            label="Computer"
            sublabel="Windows (.zip package)"
            state={desktop}
            onDownload={() => handleDownload("desktop")}
          />
          <DownloadCard
            icon={<Smartphone className="h-8 w-8" />}
            label="Mobile"
            sublabel="Android (.apk)"
            state={mobile}
            onDownload={() => handleDownload("mobile")}
          />
        </div>
      </div>
    </main>
  );
}

interface CardProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  state: PlatformState;
  onDownload: () => void;
}

function DownloadCard({
  icon,
  label,
  sublabel,
  state,
  onDownload,
}: CardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-center gap-5">
      <div className="shrink-0 text-slate-600">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-lg">{label}</p>
        <p className="text-slate-500 text-sm">{sublabel}</p>
        {state.loading && (
          <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading version…
          </p>
        )}
        {!state.loading && state.version && (
          <p className="text-slate-400 text-xs mt-1">
            Version {state.version}
          </p>
        )}
        {state.error && (
          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {state.error}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDownload}
        disabled={state.downloading || state.loading}
        className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state.downloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Download
      </button>
    </div>
  );
}
