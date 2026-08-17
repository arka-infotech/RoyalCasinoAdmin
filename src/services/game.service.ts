import apiClient from "./apiClient";
import type { GameRound, PlayerBet, GameStats, WalletLog } from "@/types/game";
import type { ApiResponse } from "@/types/user";

export const gameService = {
  async getRounds(params?: Record<string, string | number>) {
    const res = await apiClient.get<ApiResponse<{ rounds: GameRound[]; total: number }>>("/api/games/rounds", { params });
    return res.data;
  },

  async getRoundById(id: string) {
    const res = await apiClient.get<ApiResponse<{ round: GameRound; bets: PlayerBet[] }>>(`/api/games/rounds/${id}`);
    return res.data;
  },

  async getStats() {
    const res = await apiClient.get<ApiResponse<{ stats: GameStats[] }>>("/api/games/stats");
    return res.data;
  },
};

export const reportService = {
  async getTurnover(params?: Record<string, string>) {
    const res = await apiClient.get<ApiResponse<{ report: Record<string, unknown>[] }>>("/api/reports/turnover", { params });
    return res.data;
  },

  async getTransactions(params?: Record<string, string | number>) {
    const res = await apiClient.get<ApiResponse<{ transactions: WalletLog[]; total: number }>>("/api/reports/transactions", { params });
    return res.data;
  },

  async getCommission(params?: Record<string, string>) {
    const res = await apiClient.get<ApiResponse<{ report: Record<string, unknown>[] }>>("/api/reports/commission", { params });
    return res.data;
  },

  async getAdminCommission(params?: Record<string, string>) {
    const res = await apiClient.get<ApiResponse<{ report: Record<string, unknown>[] }>>("/api/reports/admin-commission", { params });
    return res.data;
  },

  async getLogs(params?: Record<string, string | number>) {
    const res = await apiClient.get<ApiResponse<{ logs: WalletLog[]; total: number; stats: Record<string, unknown>[] }>>("/api/logs", { params });
    return res.data;
  },

  async getConfig() {
    const res = await apiClient.get<ApiResponse<{ config: Record<string, unknown> }>>("/api/config");
    return res.data;
  },

  async previewDeleteRange(payload: {
    target: "wallet" | "history" | "turnover";
    from: string;
    to: string;
    userId?: string;
    gameType?: string;
  }) {
    const res = await apiClient.post<
      ApiResponse<{ previewCount: number; confirmToken: string; message: string }>
    >("/api/reports/delete-range", { ...payload, mode: "preview" });
    return res.data;
  },

  async confirmDeleteRange(payload: {
    target: "wallet" | "history" | "turnover";
    from: string;
    to: string;
    confirmToken: string;
    userId?: string;
    gameType?: string;
  }) {
    const res = await apiClient.post<ApiResponse<{ deletedCount: number; message: string }>>(
      "/api/reports/delete-range",
      { ...payload, mode: "delete" }
    );
    return res.data;
  },
};
