import { z } from "zod";

/** 段。deck > slide > block の3段構造で、block が末端 */
export type Stage = "deck" | "slide" | "block";

export const STAGES: readonly Stage[] = ["deck", "slide", "block"];

/** 各段の children を保持するキー。block は末端なので持たない */
export const CHILDREN_KEY = { deck: "slides", slide: "items" } as const;

export type Tags = string[];

/** 正規形スキーマのバージョン。data 側の `version` と照合する */
export const SCHEMA_VERSION = "1";

export const tagsSchema = z.array(z.string().min(1));

/** id は loader が付与する位置由来の識別子。React の key や検証エラーの位置表示に使う */
export const blockBase = z.object({
  id: z.string(),
  tags: tagsSchema,
  text: z.string().optional(),
});

export const slideBase = z.object({
  id: z.string(),
  tags: tagsSchema,
  /** 見出しの下に添える 1 行の説明。ページが何を示すかを簡潔に。RichText */
  description: z.string().optional().describe("見出しの下に添える 1 行の説明"),
});

export const deckMeta = z
  .object({
    title: z.string().optional(),
    author: z.string().optional(),
    date: z.string().optional(),
  })
  .loose();

export const deckBase = z.object({
  id: z.string(),
  version: z.string().optional(),
  tags: tagsSchema,
  meta: deckMeta,
});

export type DeckMeta = z.infer<typeof deckMeta>;

/** 正規形のノード。自分のフィールドは Layout の type が決めるため index signature を持つ */
export interface BlockNode extends z.infer<typeof blockBase> {
  [field: string]: unknown;
}

export interface SlideNode extends z.infer<typeof slideBase> {
  items: BlockNode[];
  [field: string]: unknown;
}

export interface DeckNode extends z.infer<typeof deckBase> {
  slides: SlideNode[];
  [field: string]: unknown;
}

export type NodeOf<S extends Stage> = S extends "deck"
  ? DeckNode
  : S extends "slide"
    ? SlideNode
    : BlockNode;

export const BASE_SCHEMAS = {
  deck: deckBase,
  slide: slideBase,
  block: blockBase,
} as const;
