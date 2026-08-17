"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { patchOnlineUsersCache } from "@/services/presenceCache";
import {
  connectPresenceSocket,
  onPresenceSocketConnect,
  subscribePlayerPresence,
} from "@/services/presenceSocketService";

/** Real-time player online/offline updates from RoyalCasinoBackend WebSocket. */
export function usePlayerPresenceRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const unsubPresence = subscribePlayerPresence((payload) => {
      patchOnlineUsersCache(qc, payload);
    });

    const unsubConnect = onPresenceSocketConnect(() => {
      void qc.invalidateQueries({ queryKey: ["users", "online"] });
      void qc.invalidateQueries({ queryKey: ["users", "stats"] });
    });

    void connectPresenceSocket();

    return () => {
      unsubPresence();
      unsubConnect();
    };
  }, [qc]);
}
