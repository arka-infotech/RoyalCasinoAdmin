import type { StaticImageData } from "next/image";

import amrela from "@/assets/titli-sorat/Amrela.png";
import ball from "@/assets/titli-sorat/Ball.png";
import butterfly from "@/assets/titli-sorat/Butterfly.png";
import cow from "@/assets/titli-sorat/Cow.png";
import egle from "@/assets/titli-sorat/Egle.png";
import gariyo from "@/assets/titli-sorat/Gariyo.png";
import kite from "@/assets/titli-sorat/Kite.png";
import lamp from "@/assets/titli-sorat/Lamp.png";
import rebit from "@/assets/titli-sorat/Rebit.png";
import rose from "@/assets/titli-sorat/Rose.png";
import sun from "@/assets/titli-sorat/Sun.png";
import watterDoll from "@/assets/titli-sorat/WatterDoll.png";

import { TITLI_SORAT_SYMBOLS, type TitliSoratSymbol } from "@/lib/luckyGameAdmin";

/** Unity Sorat.unity symbol sprites — same names as backend win_card keys. */
export const TITLI_SORAT_IMAGES: Record<TitliSoratSymbol, StaticImageData> = {
  Amrela: amrela,
  Ball: ball,
  Sun: sun,
  Lamp: lamp,
  Cow: cow,
  WatterDoll: watterDoll,
  Kite: kite,
  Gariyo: gariyo,
  Rose: rose,
  Butterfly: butterfly,
  Egle: egle,
  Rebit: rebit,
};

export function getTitliSoratImage(symbol: string): StaticImageData | null {
  const key = String(symbol ?? "").trim();
  if (!(TITLI_SORAT_SYMBOLS as readonly string[]).includes(key)) return null;
  return TITLI_SORAT_IMAGES[key as TitliSoratSymbol];
}

/** Parse history entry `<symbol>|<rewardX>` into parts for image display. */
export function parseTitliSoratHistoryEntry(entry: string): {
  symbol: string;
  reward: string;
} {
  const [card, rewardRaw] = entry.split("|");
  const symbol = (card ?? "").trim() || entry.trim();
  const reward =
    rewardRaw != null && String(rewardRaw).trim() !== "" ? String(rewardRaw).trim() : "0";
  return { symbol, reward };
}
