import type { BlockNode, Tags } from "@yadeck/slide-schema";
import { bestIndex, score } from "./resolve.js";

type TagsArg = Tags | string;

function toTags(tags: TagsArg): Tags {
  return typeof tags === "string" ? tags.split(/\s+/).filter(Boolean) : tags;
}

/**
 * items から tags に最も合う block を1個取り出す。
 * 1つも tag が一致しない場合は undefined で、rest は items のまま。
 * 同点は先に出現した方を採る。純粋関数で Context には依存しない。
 */
export function pick<T extends BlockNode>(
  items: readonly T[],
  tags: TagsArg,
): [T | undefined, T[]] {
  const query = toTags(tags);
  const candidates = items.filter((b) => score(b.tags, query).match > 0);
  const idx = bestIndex(candidates, (b) => b.tags, query, "first");
  if (idx < 0) return [undefined, [...items]];
  const chosen = candidates[idx]!;
  return [chosen, items.filter((b) => b !== chosen)];
}

/** tags が1つでも一致する block を元の順序で全部取り出す */
export function pickAll<T extends BlockNode>(
  items: readonly T[],
  tags: TagsArg,
): [T[], T[]] {
  const query = toTags(tags);
  const hit: T[] = [];
  const rest: T[] = [];
  for (const b of items) {
    (score(b.tags, query).match > 0 ? hit : rest).push(b);
  }
  return [hit, rest];
}
