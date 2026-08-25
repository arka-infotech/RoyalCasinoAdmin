/**
 * Roulette Mini live-result helpers — mirrors backend bet-catalog + French/neighbour payout.
 * Used so admin shows every bet type (straight, split, street, corner, line, outside,
 * French sections, neighbours), not only pockets 0–36.
 */

export const ROULETTE_MINI_STRAIGHT_PAYOUT = 36;

export const ROULETTE_MINI_RED = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

const BLACK = new Set(
  Array.from({ length: 36 }, (_, i) => i + 1).filter((n) => !ROULETTE_MINI_RED.has(n)),
);

const EUROPEAN_WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20,
  14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

type BetFamily =
  | "straight"
  | "split"
  | "street"
  | "corner"
  | "line"
  | "dozen"
  | "column"
  | "even_money"
  | "neighbor"
  | "jeu_zero"
  | "orphelins"
  | "voisins"
  | "tiers"
  | "ignore";

const MULTIPLIER: Record<
  Exclude<BetFamily, "ignore" | "jeu_zero" | "orphelins" | "voisins" | "tiers">,
  number
> = {
  straight: 36,
  split: 18,
  street: 12,
  corner: 9,
  line: 6,
  dozen: 3,
  column: 3,
  even_money: 2,
  neighbor: 36, // each neighbour chip pays as straight after expand
};

const OUTSIDE: Record<string, { family: BetFamily; covers: (n: number) => boolean; label: string }> = {
  "1st_12": { family: "dozen", covers: (n) => n >= 1 && n <= 12, label: "1st 12" },
  "2nd_12": { family: "dozen", covers: (n) => n >= 13 && n <= 24, label: "2nd 12" },
  "3rf_12": { family: "dozen", covers: (n) => n >= 25 && n <= 36, label: "3rd 12" },
  "1to18": { family: "even_money", covers: (n) => n >= 1 && n <= 18, label: "1 to 18" },
  "19to36": { family: "even_money", covers: (n) => n >= 19 && n <= 36, label: "19 to 36" },
  Even: { family: "even_money", covers: (n) => n !== 0 && n % 2 === 0, label: "Even" },
  ODD: { family: "even_money", covers: (n) => n !== 0 && n % 2 === 1, label: "Odd" },
  Red_Chokadi: { family: "even_money", covers: (n) => ROULETTE_MINI_RED.has(n), label: "Red" },
  Black_Chokadi: { family: "even_money", covers: (n) => BLACK.has(n), label: "Black" },
  "2To1_FirstRow": {
    family: "column",
    covers: (n) => n >= 1 && n % 3 === 1,
    label: "2:1 Col 1",
  },
  "2To1_SecondRow": {
    family: "column",
    covers: (n) => n >= 1 && n % 3 === 2,
    label: "2:1 Col 2",
  },
  "2To1_ThirdRow": {
    family: "column",
    covers: (n) => n >= 1 && n % 3 === 0,
    label: "2:1 Col 3",
  },
};

const JEU_ZERO_KEYS = new Set(["ZeroSpiel", "ZERO", "BtnZeroSpiel"]);
const ORPHELINS_KEYS = new Set(["Orphelins", "ORP", "BtnOrpheline"]);
const VOISINS_KEYS = new Set(["VoisinsDU", "DU", "Voisins", "BtnVoisinsDU"]);
const TIERS_KEYS = new Set(["Tiers", "BtnTier"]);

const JEU_ZERO_CHIPS = [
  { spotId: "0-3", units: 1 },
  { spotId: "12-15", units: 1 },
  { spotId: "26", units: 1 },
  { spotId: "32-35", units: 1 },
] as const;

const ORPHELINS_CHIPS = [
  { spotId: "1", units: 1 },
  { spotId: "6-9", units: 1 },
  { spotId: "14-17", units: 1 },
  { spotId: "17-20", units: 1 },
  { spotId: "31-34", units: 1 },
] as const;

const VOISINS_CHIPS = [
  { spotId: "0-2-3", units: 2 },
  { spotId: "4-7", units: 1 },
  { spotId: "12-15", units: 1 },
  { spotId: "18-21", units: 1 },
  { spotId: "19-22", units: 1 },
  { spotId: "25-26-28-29", units: 2 },
  { spotId: "32-35", units: 1 },
] as const;

const TIERS_CHIPS = [
  { spotId: "5-8", units: 1 },
  { spotId: "10-11", units: 1 },
  { spotId: "13-16", units: 1 },
  { spotId: "23-24", units: 1 },
  { spotId: "27-30", units: 1 },
  { spotId: "33-36", units: 1 },
] as const;

export type RouletteMiniBetKind =
  | "straight"
  | "inside"
  | "outside"
  | "french"
  | "neighbor"
  | "unknown";

export type ResolvedRouletteBet = {
  family: BetFamily;
  kind: RouletteMiniBetKind;
  multiplier: number;
  label: string;
  covers: number[];
  hits: (win: number) => boolean;
};

function parseNums(key: string): number[] | null {
  if (!/^\d+(-\d+)*$/.test(key)) return null;
  const nums = key.split("-").map(Number);
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 36)) return null;
  return nums;
}

function neighbourNumbers(target: number): number[] | null {
  const index = EUROPEAN_WHEEL.indexOf(target);
  if (index < 0) return null;
  const nums: number[] = [];
  for (let i = -2; i <= 2; i += 1) {
    nums.push(EUROPEAN_WHEEL[(index + i + EUROPEAN_WHEEL.length) % EUROPEAN_WHEEL.length]!);
  }
  return nums;
}

function parseNeighbourKey(key: string): number | null {
  const match = /^(?:R_|N_|neighbour[_:]?)(\d{1,2})$/i.exec(key.trim());
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isInteger(n) || n < 0 || n > 36) return null;
  return n;
}

function resolveNeighbourSelection(key: string): { target: number; numbers: number[] } | null {
  const direct = parseNeighbourKey(key);
  if (direct !== null) {
    const numbers = neighbourNumbers(direct);
    return numbers ? { target: direct, numbers } : null;
  }
  const nums = parseNums(key);
  if (!nums || nums.length !== 5) return null;
  for (const target of nums) {
    const expected = neighbourNumbers(target);
    if (
      expected &&
      expected.length === nums.length &&
      expected.every((value, index) => value === nums[index])
    ) {
      return { target, numbers: expected };
    }
  }
  return null;
}

function numbersFromSpot(spotId: string): number[] {
  return spotId.split("-").map(Number);
}

function coversFromFrenchChips(
  chips: ReadonlyArray<{ spotId: string; units: number }>,
): number[] {
  const set = new Set<number>();
  for (const chip of chips) {
    for (const n of numbersFromSpot(chip.spotId)) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

function frenchWin(
  chips: ReadonlyArray<{ spotId: string; units: number }>,
  chipAmount: number,
  win: number,
): number {
  let total = 0;
  for (const chip of chips) {
    const bet = resolveRouletteMiniBetKey(chip.spotId);
    if (!bet || !bet.hits(win)) continue;
    total += chipAmount * chip.units * bet.multiplier;
  }
  return total;
}

export function isRouletteMiniNumber(n: string): boolean {
  if (!/^\d{1,2}$/.test(n)) return false;
  const v = Number(n);
  return Number.isInteger(v) && v >= 0 && v <= 36;
}

export function rouletteMiniPocketTone(n: number): "green" | "red" | "black" {
  if (n === 0) return "green";
  return ROULETTE_MINI_RED.has(n) ? "red" : "black";
}

export function resolveRouletteMiniBetKey(key: string): ResolvedRouletteBet | null {
  if (JEU_ZERO_KEYS.has(key)) {
    const covers = coversFromFrenchChips(JEU_ZERO_CHIPS);
    return {
      family: "jeu_zero",
      kind: "french",
      multiplier: 0,
      label: "Jeu Zéro",
      covers,
      hits: (win) => covers.includes(win),
    };
  }
  if (ORPHELINS_KEYS.has(key)) {
    const covers = coversFromFrenchChips(ORPHELINS_CHIPS);
    return {
      family: "orphelins",
      kind: "french",
      multiplier: 0,
      label: "Orphelins",
      covers,
      hits: (win) => covers.includes(win),
    };
  }
  if (VOISINS_KEYS.has(key)) {
    const covers = coversFromFrenchChips(VOISINS_CHIPS);
    return {
      family: "voisins",
      kind: "french",
      multiplier: 0,
      label: "Voisins du Zéro",
      covers,
      hits: (win) => covers.includes(win),
    };
  }
  if (TIERS_KEYS.has(key)) {
    const covers = coversFromFrenchChips(TIERS_CHIPS);
    return {
      family: "tiers",
      kind: "french",
      multiplier: 0,
      label: "Tiers",
      covers,
      hits: (win) => covers.includes(win),
    };
  }

  const neighbour = resolveNeighbourSelection(key);
  if (neighbour) {
    const covers = neighbour.numbers;
    return {
      family: "neighbor",
      kind: "neighbor",
      multiplier: MULTIPLIER.neighbor,
      label: `Neighbours of ${neighbour.target}`,
      covers,
      hits: (win) => covers.includes(win),
    };
  }

  if (key === "00") {
    return {
      family: "straight",
      kind: "straight",
      multiplier: MULTIPLIER.straight,
      label: "0",
      covers: [0],
      hits: (win) => win === 0,
    };
  }

  if (/^\d{1,2}$/.test(key)) {
    const n = Number(key);
    if (n < 0 || n > 36) return null;
    return {
      family: "straight",
      kind: "straight",
      multiplier: MULTIPLIER.straight,
      label: String(n),
      covers: [n],
      hits: (win) => win === n,
    };
  }

  const outside = OUTSIDE[key];
  if (outside) {
    const covers = Array.from({ length: 37 }, (_, i) => i).filter(
      (n) => n !== 0 && outside.covers(n),
    );
    return {
      family: outside.family,
      kind: "outside",
      multiplier: MULTIPLIER[outside.family as keyof typeof MULTIPLIER],
      label: outside.label,
      covers,
      hits: (win) => win !== 0 && outside.covers(win),
    };
  }

  const nums = parseNums(key);
  if (!nums) return null;

  const family =
    nums.length === 2
      ? "split"
      : nums.length === 3
        ? "street"
        : nums.length === 4
          ? "corner"
          : nums.length === 6
            ? "line"
            : null;
  if (!family) return null;

  return {
    family,
    kind: "inside",
    multiplier: MULTIPLIER[family],
    label: `${family} (${nums.join("-")})`,
    covers: nums,
    hits: (win) => nums.includes(win),
  };
}

/** Total return if `winCard` is the pocket — matches backend `calcWin`. */
export function calcRouletteMiniExpectedPayment(
  totals: Record<string, number> | undefined,
  winCard: string,
): number {
  if (!totals || !isRouletteMiniNumber(winCard)) return 0;
  const win = Number(winCard);
  let total = 0;

  for (const [key, stakeRaw] of Object.entries(totals)) {
    const stake = Number(stakeRaw);
    if (!stake || stake <= 0) continue;

    if (JEU_ZERO_KEYS.has(key)) {
      total += frenchWin(JEU_ZERO_CHIPS, stake, win);
      continue;
    }
    if (ORPHELINS_KEYS.has(key)) {
      total += frenchWin(ORPHELINS_CHIPS, stake, win);
      continue;
    }
    if (VOISINS_KEYS.has(key)) {
      total += frenchWin(VOISINS_CHIPS, stake, win);
      continue;
    }
    if (TIERS_KEYS.has(key)) {
      total += frenchWin(TIERS_CHIPS, stake, win);
      continue;
    }

    const bet = resolveRouletteMiniBetKey(key);
    if (!bet || bet.family === "ignore") continue;
    if (bet.family === "jeu_zero" || bet.family === "orphelins" || bet.family === "voisins" || bet.family === "tiers") {
      continue;
    }
    if (!bet.hits(win)) continue;
    // Neighbour draft keys: one of the five straight chips hits → ×36 on chip amount
    total += stake * bet.multiplier;
  }

  return Math.round((total + Number.EPSILON) * 100) / 100;
}

/** Stake visible on pocket `n`: straight + every multi/outside/french/neighbour that covers it. */
export function rouletteMiniPocketExposure(
  totals: Record<string, number> | undefined,
  pocket: number,
): number {
  if (!totals) return 0;
  let sum = 0;
  for (const [key, stakeRaw] of Object.entries(totals)) {
    const stake = Number(stakeRaw);
    if (!stake || stake <= 0) continue;
    const bet = resolveRouletteMiniBetKey(key);
    if (!bet) continue;
    if (bet.covers.includes(pocket)) sum += stake;
  }
  return Math.round((sum + Number.EPSILON) * 100) / 100;
}

export type RouletteMiniStakeRow = {
  key: string;
  label: string;
  kind: RouletteMiniBetKind;
  family: BetFamily;
  stake: number;
  covers: number[];
};

/** Non-straight bets with stake > 0, for side panels. */
export function listRouletteMiniSpecialStakes(
  totals: Record<string, number> | undefined,
): RouletteMiniStakeRow[] {
  if (!totals) return [];
  const rows: RouletteMiniStakeRow[] = [];
  for (const [key, stakeRaw] of Object.entries(totals)) {
    const stake = Number(stakeRaw);
    if (!stake || stake <= 0) continue;
    const bet = resolveRouletteMiniBetKey(key);
    if (!bet || bet.kind === "straight") continue;
    rows.push({
      key,
      label: bet.label,
      kind: bet.kind,
      family: bet.family,
      stake,
      covers: bet.covers,
    });
  }
  const order: Record<RouletteMiniBetKind, number> = {
    inside: 0,
    outside: 1,
    french: 2,
    neighbor: 3,
    straight: 4,
    unknown: 5,
  };
  rows.sort((a, b) => order[a.kind] - order[b.kind] || a.label.localeCompare(b.label));
  return rows;
}

/**
 * Unique players who would win if `winCard` lands.
 * Prefers `userIdsByKey` when present; falls back to summing per-key counts (may over-count).
 */
export function countRouletteMiniUsersWinning(
  winCard: string,
  totals: Record<string, number> | undefined,
  usersByKey: Record<string, number> | undefined,
  userIdsByKey?: Record<string, string[]> | undefined,
): number {
  if (!totals || !isRouletteMiniNumber(winCard)) return 0;
  const win = Number(winCard);

  if (userIdsByKey) {
    const ids = new Set<string>();
    for (const [key, stakeRaw] of Object.entries(totals)) {
      if (!Number(stakeRaw)) continue;
      const bet = resolveRouletteMiniBetKey(key);
      if (!bet || !bet.hits(win)) continue;
      // French: "hits" means any covered number — payout may still be 0 if no chip spot hits;
      // mirror payment: treat as winning user if expected payment contribution > 0.
      const pay = calcRouletteMiniExpectedPayment({ [key]: Number(stakeRaw) }, winCard);
      if (pay <= 0) continue;
      for (const uid of userIdsByKey[key] ?? []) ids.add(uid);
    }
    return ids.size;
  }

  let total = 0;
  for (const [key, stakeRaw] of Object.entries(totals)) {
    if (!Number(stakeRaw)) continue;
    const pay = calcRouletteMiniExpectedPayment({ [key]: Number(stakeRaw) }, winCard);
    if (pay <= 0) continue;
    total += usersByKey?.[key] ?? 0;
  }
  return total;
}

export function formatRouletteMiniHistoryEntry(entry: string): string {
  const [card, rewardRaw] = entry.split("|");
  const cardPart = (card ?? "").trim() || entry;
  const reward =
    rewardRaw != null && String(rewardRaw).trim() !== ""
      ? String(rewardRaw).trim()
      : "0";
  return `${cardPart} | ${reward}x`;
}
