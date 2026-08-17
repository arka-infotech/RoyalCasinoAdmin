import apiClient from "./apiClient";
import type { User, HierarchyStats, HierarchyOption, ApiResponse } from "@/types/user";
import type { CreateUserFormData, EditUserFormData } from "@/validators/auth.validator";

type UpdateUserPayload = Partial<EditUserFormData> & { parentId?: string; isBlocked?: boolean };

export const userService = {
  async getUsers(params?: Record<string, string | number>) {
    const res = await apiClient.get<ApiResponse<{ users: User[]; total: number }>>("/api/users", { params });
    return res.data;
  },

  async getUserById(id: string) {
    const res = await apiClient.get<ApiResponse<{ user: User }>>(`/api/users/${id}`);
    return res.data;
  },

  async createUser(data: CreateUserFormData) {
    const res = await apiClient.post<ApiResponse<{ user: User }>>("/api/users", data);
    return res.data;
  },

  async updateUser(id: string, data: UpdateUserPayload) {
    const res = await apiClient.put<ApiResponse<{ user: User }>>(`/api/users/${id}`, data);
    return res.data;
  },

  async deleteUser(id: string) {
    const res = await apiClient.delete<ApiResponse<void>>(`/api/users/${id}`);
    return res.data;
  },

  async blockUser(id: string) {
    const res = await apiClient.post<ApiResponse<{ user: User }>>(`/api/users/${id}/block`);
    return res.data;
  },

  async unblockUser(id: string) {
    const res = await apiClient.post<ApiResponse<{ user: User }>>(`/api/users/${id}/unblock`);
    return res.data;
  },

  async adjustChips(
    id: string,
    amount: number,
    type: "add" | "subtract" | "set",
    adminPassword: string
  ) {
    const res = await apiClient.post<ApiResponse<{ user: User }>>(`/api/users/${id}/adjust-chips`, {
      amount,
      type,
      adminPassword,
    });
    return res.data;
  },

  async transferCredit(id: string, toUserId: string, amount: number) {
    const res = await apiClient.post<ApiResponse<void>>(`/api/users/${id}/transfer-credit`, { toUserId, amount });
    return res.data;
  },

  async getStats() {
    const res = await apiClient.get<ApiResponse<HierarchyStats>>("/api/users/stats");
    return res.data;
  },

  async getOnlineUsers() {
    const res = await apiClient.get<ApiResponse<{ users: User[] }>>("/api/users/online");
    return res.data;
  },

  async getHierarchy(params?: { super_distributor_id?: string; distributor_id?: string }) {
    const res = await apiClient.get<ApiResponse<{ superDistributors?: HierarchyOption[]; distributors?: HierarchyOption[]; retailers?: HierarchyOption[] }>>("/api/users/hierarchy", { params });
    return res.data;
  },

  async getSuperDistributorsForDropdown() {
    const res = await apiClient.get<ApiResponse<{ superDistributors: HierarchyOption[] }>>("/api/users/hierarchy");
    return res.data;
  },

  async getDistributorsUnderSD(superDistributorId: string) {
    const res = await apiClient.get<ApiResponse<{ distributors: HierarchyOption[] }>>(
      "/api/users/hierarchy",
      { params: { super_distributor_id: superDistributorId } }
    );
    return res.data;
  },

  async getGameCatalog() {
    const res = await apiClient.get<ApiResponse<{ games: { id: string; displayName: string; category?: string }[] }>>(
      "/api/games/catalog"
    );
    return res.data;
  },

  async getUserGames(userId: string) {
    const res = await apiClient.get<
      ApiResponse<{
        games: {
          gameId: string;
          displayName: string;
          category: string | null;
          enabled: boolean;
          minBet: number;
          maxBet: number;
        }[];
      }>
    >(`/api/users/${userId}/games`);
    return res.data;
  },

  async setUserGames(userId: string, gameIds: string[], enabled: boolean) {
    const res = await apiClient.put<ApiResponse<{ games: unknown[] }>>(`/api/users/${userId}/games`, {
      gameIds,
      enabled,
    });
    return res.data;
  },

  /** Enable selected games and disable the rest from the user's catalog view. */
  async syncUserGameAccess(userId: string, enabledGameIds: string[]) {
    const current = await this.getUserGames(userId);
    const allIds = (current.data?.games ?? []).map((g) => g.gameId);
    const enabledSet = new Set(enabledGameIds);
    const toEnable = allIds.filter((id) => enabledSet.has(id));
    const toDisable = allIds.filter((id) => !enabledSet.has(id));

    if (toEnable.length) {
      await this.setUserGames(userId, toEnable, true);
    }
    if (toDisable.length) {
      await this.setUserGames(userId, toDisable, false);
    }
  },
};
