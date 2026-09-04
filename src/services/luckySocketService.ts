"use client";

import io from "socket.io-client";
import { getBrowserSocketConfig } from "@/lib/gameServerBaseUrl";

// The project uses a Socket.IO client build whose type exports differ by version/bundler.
// Keep this service runtime-focused and avoid coupling to the exported `Socket` type.
let socket: any = null;

export function getLuckySocket(): any {
  if (!socket || !socket.connected) {
    const { origin, path } = getBrowserSocketConfig();
    socket = io(origin, {
      transports: ["websocket"],
      path,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      console.log("[LuckySocket] Connected:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("[LuckySocket] Disconnected");
    });

    socket.on("connect_error", (err: any) => {
      console.error("[LuckySocket] Connection error:", err.message);
    });
  }
  return socket;
}

export function disconnectLuckySocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function emitReq(en: string, data?: Record<string, unknown>) {
  const s = getLuckySocket();
  s.emit("req", { en, data: data || {} });
}
