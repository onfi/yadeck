import { createContext, useContext, type ReactNode } from "react";
import {
  BlockLayout,
  DeckLayout,
  SlideLayout,
  type BlockNode,
  type DeckNode,
  type SlideNode,
  type Source,
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
  pageNumbers: boolean;
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
  /** 各ページの右下にページ番号を出すか。既定 true */
  pageNumbers?: boolean;
  children?: ReactNode;
}

export function DeckProvider({ container, richText = {}, renderText = escapeText, pageNumbers = true, children }: DeckProviderProps) {
  return <DeckContext.Provider value={{ container, richText, renderText, pageNumbers }}>{children}</DeckContext.Provider>;
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

/** ページ番号。loader が付けた page、無ければ id(s9)の数字 */
export function pageOf(slide: SlideNode): number | string {
  return slide.page ?? slide.id.replace(/^s/, "");
}

/** 出典を { title, url } にそろえる。URL だけのときは、スキームと末尾の / を除いた URL を題名にする */
export function normalizeSource(source: Source): { title: string; url?: string } {
  if (typeof source !== "string") return source;
  if (!/^https?:\/\//.test(source)) return { title: source };
  return { title: source.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), url: source };
}

/** ページの下端の出典。並べ方と見た目はプラグインの CSS が .yd-sources で決める */
export function Sources({ sources }: { sources?: Source[] }) {
  if (!sources?.length) return null;
  return (
    <ol className="yd-sources">
      {sources.map((s, i) => {
        const { title, url } = normalizeSource(s);
        return (
          <li key={i} title={url ? `${title}\n${url}` : title}>
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer">
                {title}
              </a>
            ) : (
              title
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * 1 枚のスライドの中身(枠の内側)。Layout と、下端の出典、右下のページ番号。ブラウザで描き直すときはここから描く。
 * ページ番号は loader が付けた page。見た目(色、表紙で隠すか)はプラグインの CSS が .yd-page-number で決める
 */
export function SlideBody({ data }: { data: SlideNode }) {
  const { container, pageNumbers } = useDeckContext();
  const Layout = container.resolve(SlideLayout, data.tags).component;
  return (
    <>
      <Layout {...data} />
      <Sources sources={data.sources} />
      {pageNumbers && (
        <div className="yd-page-number" aria-hidden="true">
          {pageOf(data)}
        </div>
      )}
    </>
  );
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
      data-page={pageOf(data)}
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
