export interface GameRound {
  id: string;
  game_type: string;
  win_result: string;
  reward: string;
  state: string;
  started_at: string;
  ended_at?: string;
  total_bets?: number;
  total_bet_amount?: number;
}

export interface PlayerBet {
  id: string;
  user_id: string;
  username?: string;
  round_id: string;
  bet_details: Record<string, number>;
  total_bet: number;
  win_amount: number;
  claimed: boolean;
  created_at: string;
}

export interface WalletLog {
  id: string;
  username?: string;
  type: "bet" | "claim" | "claim_all" | "claim_ticket" | "admin_adjust";
  amount: number;
  balance_after: number;
  created_at: string;
}

export interface GameStats {
  game_type: string;
  total_rounds: number;
  total_bets: number;
  total_wins: number;
}

export type GamePhase = "init" | "betting" | "spinning" | "done";

export interface LuckyGameState {
  phase: GamePhase;
  timer: number;
  winCard: string | null;
  roundId: string | null;
  lastWinCards: string[];
  isConnected: boolean;
}
