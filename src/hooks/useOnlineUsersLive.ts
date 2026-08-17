"use client";

import { useSyncExternalStore } from "react";
import { useOnlineUsers } from "@/hooks/useUsers";
import {
  getPresenceRevision,
  subscribePresenceRevision,
} from "@/services/presenceRevision";
import type { User } from "@/types/user";

/** Online users query; re-renders when PlayerPresenceSync patches the cache. */
export function useOnlineUsersLive() {
  const query = useOnlineUsers();
  const revision = useSyncExternalStore(subscribePresenceRevision, getPresenceRevision, getPresenceRevision);

  void revision;

  return {
    ...query,
    users: (query.data?.data?.users ?? []) as User[],
  };
}
