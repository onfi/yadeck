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

/** 出典 1 件。URL だけの文字列、題名だけの文字列、または題名と URL */
export const sourceSchema = z.union([
  z.string().min(1),
  z.object({
    title: z.string().min(1).describe("出典の題名。画面に出す文字"),
    url: z.string().optional().describe("リンク先"),
  }),
]);

export type Source = z.infer<typeof sourceSchema>;

export const slideBase = z.object({
  /** ページの id。YAML の `$id` で名前を付けたらその名前、無ければ `s` + ページ番号(s1, s2, ...)。URL の #id になる */
  id: z.string(),
  /** 1 始まりのページ番号。loader が付ける。右下の表示、PNG の名前、`#s9` での指定に使う */
  page: z.number().int().min(1).optional(),
  tags: tagsSchema,
  /** 見出しの下に添える 1 行の説明。ページが何を示すかを簡潔に。RichText */
  description: z.string().optional().describe("見出しの下に添える 1 行の説明"),
  /** ページの下端に小さく出す出典。8 件まで */
  sources: z
    .array(sourceSchema)
    .max(8)
    .optional()
    .describe("ページの下端に小さく出す出典(8 件まで)。URL の文字列、または { title, url }"),
});

export const deckMeta = z
  .object({
    title: z.string().optional().describe("発表タイトル。省略すると header の title、無ければファイル名"),
    author: z.string().optional().describe("発表者。省略すると header の author"),
    date: z.string().optional(),
    description: z.string().optional().describe("検索結果や SNS のカードに出す説明。省略すると表紙の副題と各ページの見出しから作る"),
    image: z.string().optional().describe("SNS のカードに出す画像。URL か、siteUrl からの相対パス"),
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
