import type { DeckNode, SlideNode } from "@yadeck/slide-schema";

/**
 * deck の HTML の <head> に入れる SEO / OGP の meta タグを、deck の内容から作る。
 * 明示したいときは deck の meta(description / image / author)で上書きできる。
 */

export interface DeckMetaTags {
  title: string;
  description: string;
  author?: string;
  /** 絶対 URL のときだけ og:image に出す(SNS は相対パスを解決しない) */
  image?: string;
  /** 公開先での deck の URL。canonical と og:url に使う */
  url?: string;
}

/** 説明文の長さの目安。検索結果やカードで切られにくい長さに収める */
const DESCRIPTION_MAX = 120;

/** markdown の記号と HTML タグを落として、1 行の素のテキストにする */
export function plainText(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join("")}…`;
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);

function headingOf(slide: SlideNode): string | undefined {
  const h = slide.items.find((b) => b.tags.includes("heading"));
  return h?.text ? plainText(h.text) : undefined;
}

/**
 * 説明文: meta.description があればそれ。無ければ表紙の副題に、各ページの見出しを順に足していく。
 * 表紙・章扉の見出しも話の骨組みなので含める
 */
export function describeDeck(deck: DeckNode): string {
  const explicit = str(deck.meta.description);
  if (explicit) return truncate(plainText(explicit), DESCRIPTION_MAX);
  const header = deck.slides.find((s) => s.tags.includes("header"));
  const parts: string[] = [];
  const subtitle = str(header?.subtitle);
  if (subtitle) parts.push(plainText(subtitle));
  const headings = deck.slides.map(headingOf).filter((h): h is string => !!h && h !== deck.meta.title);
  if (headings.length > 0) parts.push(headings.join(" / "));
  return truncate(parts.join("。"), DESCRIPTION_MAX);
}

export function deckMetaTags(deck: DeckNode, url?: string): DeckMetaTags {
  const header = deck.slides.find((s) => s.tags.includes("header"));
  const image = str(deck.meta.image);
  const absolute = (v: string) => (/^https?:\/\//.test(v) ? v : url ? new URL(v, url).href : undefined);
  return {
    title: deck.meta.title ?? "",
    description: describeDeck(deck),
    author: str(deck.meta.author) ?? str(header?.author),
    image: image ? absolute(image) : undefined,
    url,
  };
}

/** <head> に入れる HTML。属性値はエスケープする */
export function metaTagsHtml(tags: DeckMetaTags, escape: (s: string) => string): string {
  const lines = [
    `<meta name="description" content="${escape(tags.description)}">`,
    tags.author ? `<meta name="author" content="${escape(tags.author)}">` : "",
    `<meta name="generator" content="YADECK">`,
    tags.url ? `<link rel="canonical" href="${escape(tags.url)}">` : "",
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escape(tags.title)}">`,
    `<meta property="og:description" content="${escape(tags.description)}">`,
    tags.url ? `<meta property="og:url" content="${escape(tags.url)}">` : "",
    tags.image ? `<meta property="og:image" content="${escape(tags.image)}">` : "",
    `<meta name="twitter:card" content="${tags.image ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${escape(tags.title)}">`,
    `<meta name="twitter:description" content="${escape(tags.description)}">`,
    tags.image ? `<meta name="twitter:image" content="${escape(tags.image)}">` : "",
  ];
  return lines.filter(Boolean).join("\n");
}
