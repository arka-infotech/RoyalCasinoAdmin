"use client";

import io from "socket.io-client";

export type PresencePayload = {
  userId: string;
  username: string;
  role: string;
  uniqueId?: string | null;
  isOnline: boolean;
  lastLogin?: string | null;
  chips?: number;
};

type PresenceListener = (payload: PresencePayload) => void;
type ConnectListener = () => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let socket: any = null;
const listeners = new Set<PresenceListener>();
const connectListeners = new Set<ConnectListener>();
let connecting: Promise<any | null> | null = null;

function getSocketUrl() {
  return process.env.NEXT_PUBLIC_GAME_SOCKET_URL || "http://localhost:3000";
}

async function fetchWsToken(): Promise<string | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth/ws-token`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.token ?? null;
  } catch {
    return null;
  }
}

function subscribePresenceEvents(sock: any) {
  sock.off("res");
  sock.on("res", (msg: { en?: string; data?: PresencePayload }) => {
    if (msg?.en === "PLAYER_PRESENCE" && msg.data) {
      console.info("[PresenceSocket] PLAYER_PRESENCE", msg.data.userId, msg.data.isOnline);
      listeners.forEach((fn) => fn(msg.data!));
    }
  });

  sock.off("connect");
  sock.on("connect", () => {
    console.info("[PresenceSocket] Connected", sock.id);
    sock.emit("req", { en: "ADMIN_PRESENCE_SUBSCRIBE", data: {} });
    connectListeners.forEach((fn) => fn());
  });
}

export async function connectPresenceSocket(): Promise<any | null> {
  if (socket?.connected) return socket;
  if (connecting) return connecting;

  connecting = (async () => {
    const token = await fetchWsToken();
    if (!token) {
      console.warn("[PresenceSocket] No ws token — admin cookie missing?");
      return null;
    }

    if (socket) {
      socket.disconnect();
      socket = null;
    }

    socket = io(getSocketUrl(), {
      transports: ["websocket", "polling"],
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    subscribePresenceEvents(socket);

    socket.on("connect_error", (err: Error) => {
      console.warn("[PresenceSocket] connect_error:", err.message);
    });

    return socket;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

export function subscribePlayerPresence(listener: PresenceListener) {
  listeners.add(listener);
  void connectPresenceSocket();
  return () => {
    listeners.delete(listener);
  };
}

export function onPresenceSocketConnect(listener: ConnectListener) {
  connectListeners.add(listener);
  if (socket?.connected) {
    listener();
  }
  void connectPresenceSocket();
  return () => {
    connectListeners.delete(listener);
  };
}

export function getPresenceSocket() {
  return socket;
}
