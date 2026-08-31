"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { apiPath } from "@/lib/apiPath";

type StopMode = "stop" | "start";

export default function StopGamePage() {
  useRequireAdmin();

  const [mode, setMode] = useState<StopMode>("start");
  const [currentStopped, setCurrentStopped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(apiPath("/api/admin/stop-game"), { cache: "no-store" });
        const json = (await res.json()) as { ok?: boolean; stopped?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to load stop-game status");
        }
        if (!mounted) return;
        const stopped = Boolean(json.stopped);
        setCurrentStopped(stopped);
        setMode(stopped ? "start" : "stop");
      } catch (e) {
        if (!mounted) return;
        toast.error(e instanceof Error ? e.message : "Failed to load status");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const stopped = mode === "stop";

    setSubmitting(true);
    try {
      const res = await fetch(apiPath("/api/admin/stop-game"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stopped }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        stopped?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || json.message || "Update failed");
      }

      const nextStopped = Boolean(json.stopped);
      setCurrentStopped(nextStopped);
      setMode(nextStopped ? "start" : "stop");
      toast.success(
        json.message ?? (nextStopped ? "All games stopped." : "All games started."),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-gray-800">
        Stop Game
      </h1>

      {loading ? (
        <div className="mt-8 flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8">
          <div className="flex flex-col items-center gap-6 py-6">
            <p className="text-sm font-semibold text-green-600">All Game Stop</p>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-10">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="gameMode"
                  value="stop"
                  checked={mode === "stop"}
                  onChange={() => setMode("stop")}
                  className="h-4 w-4 accent-indigo-600"
                />
                Stop All Game
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="gameMode"
                  value="start"
                  checked={mode === "start"}
                  onChange={() => setMode("start")}
                  className="h-4 w-4 accent-indigo-600"
                />
                Start All Game
              </label>
            </div>

            <p className="text-xs text-gray-500">
              Current status:{" "}
              <span className={currentStopped ? "font-semibold text-rose-600" : "font-semibold text-green-600"}>
                {currentStopped ? "All games stopped" : "All games running"}
              </span>
            </p>

            <button
              type="submit"
              disabled={submitting || (mode === "stop" && currentStopped) || (mode === "start" && !currentStopped)}
              className="rounded bg-indigo-600 px-8 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Please wait..." : "Submit"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
