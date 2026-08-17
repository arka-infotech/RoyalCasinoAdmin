"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { gameService, reportService } from "@/services/game.service";

export function useGameRounds(params?: Record<string, string | number>) {
  return useQuery({ queryKey: ["game-rounds", params], queryFn: () => gameService.getRounds(params) });
}

export function useGameRound(id: string | null) {
  return useQuery({ queryKey: ["game-round", id], queryFn: () => gameService.getRoundById(id!), enabled: !!id });
}

export function useGameStats() {
  return useQuery({ queryKey: ["game-stats"], queryFn: () => gameService.getStats(), refetchInterval: 60_000 });
}

export function useTurnoverReport(params?: Record<string, string>) {
  return useQuery({ queryKey: ["report-turnover", params], queryFn: () => reportService.getTurnover(params), refetchInterval: 60_000 });
}

export function useTransactionReport(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ["report-transactions", params],
    queryFn: () => reportService.getTransactions(params),
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useCommissionReport(params?: Record<string, string>) {
  return useQuery({ queryKey: ["report-commission", params], queryFn: () => reportService.getCommission(params), refetchInterval: 60_000 });
}

export function useAdminCommissionReport(params?: Record<string, string>) {
  return useQuery({ queryKey: ["report-admin-commission", params], queryFn: () => reportService.getAdminCommission(params) });
}

export function useLogs(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ["logs", params],
    queryFn: () => reportService.getLogs(params),
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useGameConfig() {
  return useQuery({ queryKey: ["config"], queryFn: () => reportService.getConfig(), staleTime: Infinity });
}
