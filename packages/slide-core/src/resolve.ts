import type { Tags } from "@yadeck/slide-schema";

/**
 * tags 集合の一致度。DI の resolve と pick の両方がこの1つの規則で候補を選ぶ。
 * - match: 候補の tags と問い合わせ tags の共通数(多いほど良い)
 * - extra: 候補にだけある tags の数(少ないほど良い)
 */
export interface Score {
  match: number;
  extra: number;
}

export function score(candidate: Tags, query: Tags): Score {
  const q = new Set(query);
  let match = 0;
  let extra = 0;
  for (const t of new Set(candidate)) {
    if (q.has(t)) match++;
    else extra++;
  }
  return { match, extra };
}

/** 同点時に配列のどちらを採るか。DI は後勝ち、pick は先勝ち */
export type TieBreak = "first" | "last";

export function compareScore(a: Score, b: Score): number {
  return b.match - a.match || a.extra - b.extra;
}

/**
 * 最良の候補の index を返す。候補が空なら -1。
 * match=0 の候補も対象に含めるかは呼び出し側が事前に絞る。
 */
export function bestIndex<T>(
  candidates: readonly T[],
  tagsOf: (c: T) => Tags,
  query: Tags,
  tie: TieBreak,
): number {
  let best = -1;
  let bestScore: Score | undefined;
  candidates.forEach((c, i) => {
    const s = score(tagsOf(c), query);
    if (bestScore === undefined) {
      best = i;
      bestScore = s;
      return;
    }
    const cmp = compareScore(s, bestScore);
    if (cmp < 0 || (cmp === 0 && tie === "last")) {
      best = i;
      bestScore = s;
    }
  });
  return best;
}

export function sameTagSet(a: Tags, b: Tags): boolean {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const t of sa) if (!sb.has(t)) return false;
  return true;
}

export function splitTags(s: string): Tags {
  return s.split(/\s+/).filter((t) => t.length > 0);
}
