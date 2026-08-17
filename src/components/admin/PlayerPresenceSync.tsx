"use client";

import { usePlayerPresenceRealtime } from "@/hooks/usePlayerPresence";

/** Keeps online player lists in sync via backend WebSocket for all admin pages. */
export default function PlayerPresenceSync() {
  usePlayerPresenceRealtime();
  return null;
}
