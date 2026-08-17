"use client";

import { useEffect, useState } from "react";
import { getLuckySocket } from "@/services/luckySocketService";

/**
 * Thin hook that exposes the shared lucky-game socket connection state.
 * The underlying socket is a singleton — multiple callers share one connection.
 */
export function useAdminSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getLuckySocket();

    if (socket.connected) setConnected(true);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return { socket: getLuckySocket(), connected };
}
