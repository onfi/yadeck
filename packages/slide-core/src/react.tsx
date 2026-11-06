import { createContext, useContext, type ReactNode } from "react";
import {
  BlockLayout,
  DeckLayout,
  SlideLayout,
  type BlockNode,
  type DeckNode,
  type SlideNode,
} from "@yadeck/slide-schema";
import type { Container, RichTextOptions } from "./container.js";
import { isInline } from "./inline.js";

/**
 * Layout が使う React の部品。build(Node)とブラウザの両方で動くよう、
 * react-dom/server や markdown の処理には依存しない(静的な書き出しは render.tsx)。
 */

/** RichText の text を HTML にする関数。build では markdown + sanitize、ブラウザでは build 時の結果を引く */
export type RenderText = (text: string, options: RichTextOptions) => string;

interface DeckContextValue {
  container: Container;
  richText: RichTextOptions;
  renderText: RenderText;
}

const DeckContext = createContext<DeckContextValue | null>(null);

function useDeckContext(): DeckContextValue {
  const ctx = useContext(DeckContext);
  if (!ctx) throw new Error("<Deck>/<Slide>/<Block> must be rendered inside <DeckProvider>");
  return ctx;
}

const escapeText: RenderText = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface DeckProviderProps {
  container: Container;
  /** deck 単位の view 設定。data 側では指定できない */
  richText?: RichTextOptions;
  /** RichText の変換。省略時は HTML エスケープだけ(renderDeck は markdown + sanitize を渡す) */
  renderText?: RenderText;
  children?: ReactNode;
}

export function DeckProvider({ container, richText = {}, renderText = escapeText, children }: DeckProviderProps) {
  return <DeckContext.Provider value={{ container, richText, renderText }}>{children}</DeckContext.Provider>;
}

export function Deck({ data }: { data: DeckNode }) {
  const { container } = useDeckContext();
  const Layout = container.resolve(DeckLayout, data.tags).component;
  return <Layout {...data} />;
}

/** slide の Layout か、その items のどれかの Layout が `client: true` で bind されているか */
export function isClientSlide(container: Container, slide: SlideNode): boolean {
  if (container.resolve(SlideLayout, slide.tags).client) return true;
  return slide.items.some((b) => container.resolve(BlockLayout, b.tags).client);
}

/** 1 枚のスライドの中身(枠の内側)。ブラウザで描き直すときはここから描く */
export function SlideBody({ data }: { data: SlideNode }) {
  const { container } = useDeckContext();
  const Layout = container.resolve(SlideLayout, data.tags).component;
  return <Layout {...data} />;
}

/**
 * 1枚のスライド。16:9 の固定枠を core が与え、Layout は枠の中身だけを描く。
 * 枠があることで print(@page + break-after) が Layout に依らず成立する。
 * ブラウザで描き直すページには data-yd-client を付ける
 */
export function Slide({ data }: { data: SlideNode }) {
  const { container } = useDeckContext();
  return (
    <section
      className="yd-slide-frame"
      id={data.id}
      data-tags={data.tags.join(" ")}
      data-yd-client={isClientSlide(container, data) ? "" : undefined}
    >
      <div className="yd-slide">
        <SlideBody data={data} />
      </div>
    </section>
  );
}

export function Block({ data }: { data: BlockNode }) {
  const { container } = useDeckContext();
  const Layout = container.resolve(BlockLayout, data.tags).component;
  return <Layout {...data} />;
}

/**
 * 中身をブラウザで動かす印。これを含むページは、表示されたときに React で描き直される。
 * Layout 全体を動かすなら bind の `client: true` の方が簡単
 */
export function Client({ children }: { children?: ReactNode }) {
  return (
    <>
      <template data-yd-client="" />
      {children}
    </>
  );
}

export interface RichTextProps {
  text?: string;
  /** 包む要素。既定は1行なら span、複数行なら div */
  as?: keyof HTMLElementTagNameMap;
  className?: string;
}

/** markdown + html を sanitize して描画する。設定は DeckProvider の richText */
export function RichText({ text = "", as, className }: RichTextProps) {
  const { richText, renderText } = useDeckContext();
  const Tag = (as ?? (isInline(text) ? "span" : "div")) as "span";
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: renderText(text, richText) }} />;
}
