import type { ReactNode } from "react";
import type { z } from "zod";
import type { BlockNode, DeckNode, SlideNode, Stage } from "./nodes.js";

/**
 * DI コンテナの契約型。`Props` は実装コンポーネントが受け取る共通部で、
 * 実体は識別用のトークン。型引数は phantom として推論にだけ使う。
 */
export interface Interface<Props, S extends Stage = Stage> {
  readonly name: string;
  readonly stage: S;
  readonly __props?: Props;
}

export function defineInterface<Props, S extends Stage = Stage>(
  name: string,
  stage: S,
): Interface<Props, S> {
  return Object.freeze({ name, stage });
}

/** Interface から共通 props を取り出す */
export type PropsOf<I> = I extends Interface<infer P, Stage> ? P : never;

/** 各段の Layout が受け取る props。段のノードそのもの */
export const DeckLayout = defineInterface<DeckNode, "deck">("DeckLayout", "deck");
export const SlideLayout = defineInterface<SlideNode, "slide">("SlideLayout", "slide");
export const BlockLayout = defineInterface<BlockNode, "block">("BlockLayout", "block");

/** Layout の実装。利用者は素の React コンポーネントを書く */
export type LayoutComponent<P> = (props: P) => ReactNode;

/** Layout の `type` に渡す zod。自分のフィールドのみを記述する */
export type FieldsSchema = z.ZodObject<z.ZodRawShape>;

export type DeckOf<T extends FieldsSchema> = DeckNode & z.infer<T>;
export type SlideOf<T extends FieldsSchema> = SlideNode & z.infer<T>;
export type BlockOf<T extends FieldsSchema> = BlockNode & z.infer<T>;
