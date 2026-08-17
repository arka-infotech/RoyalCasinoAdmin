"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { ApiResponse, HierarchyStats, User } from "@/types/user";
import type { PresencePayload } from "./presenceSocketService";
import { bumpPresenceRevision } from "./presenceRevision";

export function patchOnlineUsersCache(queryClient: QueryClient, payload: PresencePayload) {
  queryClient.setQueryData<ApiResponse<{ users: User[] }>>(["users", "online"], (old) => {
    const users = [...(old?.data?.users ?? [])];
    const idx = users.findIndex((u) => u.id === payload.userId);

    if (idx >= 0) {
      users[idx] = {
        ...users[idx],
        is_online: payload.isOnline,
        last_login: payload.lastLogin ?? users[idx].last_login,
        chips: payload.chips ?? users[idx].chips,
      };
    } else if (payload.isOnline) {
      users.push({
        id: payload.userId,
        username: payload.username,
        role: payload.role as User["role"],
        unique_id: payload.uniqueId ?? undefined,
        is_online: true,
        is_blocked: false,
        chips: payload.chips ?? 0,
        credit_balance: 0,
        commission_rate: 0,
        created_at: new Date().toISOString(),
        last_login: payload.lastLogin ?? undefined,
      });
    }

    return { success: true, data: { users } };
  });

  queryClient.setQueryData<ApiResponse<HierarchyStats>>(["users", "stats"], (old) => {
    if (!old?.data) return old;
    const cachedUsers =
      queryClient.getQueryData<ApiResponse<{ users: User[] }>>(["users", "online"])?.data?.users ??
      [];
    const totalOnline = cachedUsers.filter((u) => u.is_online).length;
    return {
      ...old,
      data: {
        ...old.data,
        totalOnline,
      },
    };
  });

  bumpPresenceRevision();
}
