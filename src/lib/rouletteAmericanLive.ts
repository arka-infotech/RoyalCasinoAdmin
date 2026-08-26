/**
 * American Roulette (0 / 00) live-result helpers — mirrors backend roulette/bet-catalog.
 */

import { ROULETTE_MINI_RED } from "@/lib/rouletteMiniLive";

const BLACK = new Set(
  Array.from({ length: 36 }, (_, i) => i + 1).filter((n) => !ROULETTE_MINI_RED.has(n)),
);

type BetFamily =
  | "straight"
  | "split"
  | "street"
  | "corner"
  | "line"
  | "basket"
  | "dozen"
  | "column"
  | "even_money";

const MULTIPLIER: Record<BetFamily, number> = {
  straight: 36,
  split: 18,
  street: 12,
  corner: 9,
  line: 6,
  basket: 7,
  dozen: 3,
  column: 3,
  even_money: 2,
};

const OUTSIDE: Record<string, { family: BetFamily; covers: (n: number) => boolean }> = {
  "1st_12": { family: "dozen", covers: (n) => n >= 1 && n <= 12 },
  "2nd_12": { family: "dozen", covers: (n) => n >= 13 && n <= 24 },
  "3rf_12": { family: "dozen", covers: (n) => n >= 25 && n <= 36 },
  "1to18": { family: "even_money", covers: (n) => n >= 1 && n <= 18 },
  "19to36": { family: "even_money", covers: (n) => n >= 19 && n <= 36 },
  Even: { family: "even_money", covers: (n) => n !== 0 && n % 2 === 0 },
  ODD: { family: "even_money", covers: (n) => n !== 0 && n % 2 === 1 },
  Odd: { family: "even_money", covers: (n) => n !== 0 && n % 2 === 1 },
  Red_Chokadi: { family: "even_money", covers: (n) => ROULETTE_MINI_RED.has(n) },
  Black_Chokadi: { family: "even_money", covers: (n) => BLACK.has(n) },
  "2To1_FirstRow": { family: "column", covers: (n) => n >= 1 && n % 3 === 1 },
  "2To1_SecondRow": { family: "column", covers: (n) => n >= 1 && n % 3 === 2 },
  "2To1_ThirdRow": { family: "column", covers: (n) => n >= 1 && n % 3 === 0 },
};

function isZeroPocket(pocket: string): boolean {
  return pocket === "0" || pocket === "00";
}

function normalizePocket(token: string): string | null {
  if (token === "00") return "00";
  if (!/^\d{1,2}$/.test(token)) return null;
  const n = Number(token);
  if (!Number.isInteger(n) || n < 0 || n > 36) return null;
  return String(n);
}

function parsePockets(key: string): string[] | null {
  if (!/^(?:\d+|00)(?:-(?:\d+|00))*$/.test(key)) return null;
  const pockets: string[] = [];
  for (const token of key.split("-")) {
    const pocket = normalizePocket(token);
    if (!pocket) return null;
    pockets.push(pocket);
  }
  return pockets;
}

type Resolved = {
  family: BetFamily;
  multiplier: number;
  covers: string[];
  hits: (win: string) => boolean;
};

function resolveKey(key: string): Resolved | null {
  if (key === "00") {
    return {
      family: "straight",
      multiplier: MULTIPLIER.straight,
      covers: ["00"],
      hits: (win) => win === "00",
    };
  }
  if (/^\d{1,2}$/.test(key)) {
    const n = Number(key);
    if (n < 0 || n > 36) return null;
    const pocket = String(n);
    return {
      family: "straight",
      multiplier: MULTIPLIER.straight,
      covers: [pocket],
      hits: (win) => win === pocket,
    };
  }
  const outside = OUTSIDE[key];
  if (outside) {
    return {
      family: outside.family,
      multiplier: MULTIPLIER[outside.family],
      covers: [],
      hits: (win) => !isZeroPocket(win) && outside.covers(Number(win)),
    };
  }
  const nums = parsePockets(key);
  if (!nums) return null;
  const family =
    nums.length === 2
      ? "split"
      : nums.length === 3
        ? "street"
        : nums.length === 4
          ? "corner"
          : nums.length === 5
            ? "basket"
            : nums.length === 6
              ? "line"
              : null;
  if (!family) return null;
  return {
    family,
    multiplier: MULTIPLIER[family],
    covers: nums,
    hits: (win) => nums.includes(win),
  };
}

export function isRouletteAmericanNumber(n: string): boolean {
  if (n === "00") return true;
  if (!/^\d{1,2}$/.test(n)) return false;
  const v = Number(n);
  return Number.isInteger(v) && v >= 0 && v <= 36;
}

/** Keep "00" as a real American pocket. */
export function normalizeRouletteAmericanWinCard(n: string): string {
  if (n === "00") return "00";
  if (!isRouletteAmericanNumber(n)) return "";
  return String(Number(n));
}

export function rouletteAmericanPocketTone(n: number | "00"): "green" | "red" | "black" {
  if (n === "00" || n === 0) return "green";
  return ROULETTE_MINI_RED.has(n) ? "red" : "black";
}

export function rouletteAmericanPocketExposure(
  totals: Record<string, number>,
  pocket: number | "00",
): number {
  const pocketKey = pocket === "00" ? "00" : String(pocket);
  let sum = 0;
  for (const [key, amt] of Object.entries(totals)) {
    const amount = Number(amt) || 0;
    if (!amount) continue;
    const bet = resolveKey(key);
    if (!bet) continue;
    if (bet.family === "straight" || bet.family === "split" || bet.family === "street" || bet.family === "corner" || bet.family === "line" || bet.family === "basket") {
      if (bet.covers.includes(pocketKey)) sum += amount;
    } else if (!isZeroPocket(pocketKey) && bet.hits(pocketKey)) {
      sum += amount;
    }
  }
  return Math.round((sum + Number.EPSILON) * 100) / 100;
}

export function calcRouletteAmericanExpectedPayment(
  totals: Record<string, number>,
  winCard: string,
): number {
  const win = normalizeRouletteAmericanWinCard(winCard);
  if (!win) return 0;
  let total = 0;
  for (const [key, amt] of Object.entries(totals)) {
    const amount = Number(amt) || 0;
    if (!amount) continue;
    const bet = resolveKey(key);
    if (!bet || !bet.hits(win)) continue;
    total += amount * bet.multiplier;
  }
  return Math.round((total + Number.EPSILON) * 100) / 100;
}

export function countRouletteAmericanUsersWinning(
  winCard: string,
  totals: Record<string, number>,
  usersByKey: Record<string, number>,
  userIdsByKey?: Record<string, string[]>,
): number {
  const win = normalizeRouletteAmericanWinCard(winCard);
  if (!win) return 0;
  if (userIdsByKey) {
    const ids = new Set<string>();
    for (const [key, userIds] of Object.entries(userIdsByKey)) {
      const bet = resolveKey(key);
      if (!bet || !bet.hits(win)) continue;
      for (const id of userIds) ids.add(id);
    }
    return ids.size;
  }
  let users = 0;
  for (const [key, count] of Object.entries(usersByKey)) {
    if (!(Number(totals[key]) > 0)) continue;
    const bet = resolveKey(key);
    if (!bet || !bet.hits(win)) continue;
    users += Number(count) || 0;
  }
  return users;
}
