"use client";

import io from "socket.io-client";
import { withGameServerBasePath } from "@/lib/gameServerBasePath";

// The project uses a Socket.IO client build whose type exports differ by version/bundler.
// Keep this service runtime-focused and avoid coupling to the exported `Socket` type.
let socket: any = null;

export function getLuckySocket(): any {
  if (!socket || !socket.connected) {
    const url = process.env.NEXT_PUBLIC_GAME_SOCKET_URL || "http://localhost:3000";
    const socketPath = withGameServerBasePath(
      "/socket.io",
      process.env.NEXT_PUBLIC_LUCKY_GAME_BASE_PATH,
    );
    socket = io(url, {
      transports: ["websocket"],
      path: socketPath,
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
