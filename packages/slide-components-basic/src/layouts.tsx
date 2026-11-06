import hljs from "highlight.js";
import type { CSSProperties } from "react";
import { z } from "zod";
import {
  Block,
  RichText,
  Slide,
  pick,
  pickAll,
  type BlockNode,
  type BlockOf,
  type DeckNode,
  type SlideNode,
  type SlideOf,
} from "@yadeck/slide-core";
import { Notes, PAGE, SlideHeading } from "./chrome.js";

// ---- deck ----

export const DefaultDeck = (deck: DeckNode) => (
  <main className="yd-deck">
    {deck.slides.map((s) => (
      <Slide key={s.id} data={s} />
    ))}
  </main>
);

// ---- slide ----

/**
 * `card` を付けた slide。item をカードで横並びにし、それ以外の block は前置きとして上に置く。
 * この bind が無い構成では tags 無しの slide に fallback して縦に並ぶ。
 */
/** カードの列数。3 枚までは 1 行、4 枚は 2×2、5 枚以上は 3 列で折り返す(1 枚に見出しと説明が入る分、columns より早く折り返す) */
export function cardColumns(n: number): number {
  if (n <= 3) return Math.max(1, n);
  return n === 4 ? 2 : 3;
}

export const CardSlide = (slide: SlideNode) => {
  const [heading, rest] = pick(slide.items, ["heading"]);
  const [entries, lead] = pickAll(rest, ["item"]);
  return (
    <div className={`${PAGE} b-card`}>
      {heading && <SlideHeading block={heading} description={slide.description} />}
      {lead.length > 0 && (
        <div className="flex flex-col gap-3">
          {lead.map((b) => (
            <Block key={b.id} data={b} />
          ))}
        </div>
      )}
      <div className="grid min-h-0 flex-1 auto-rows-[minmax(0,1fr)] gap-6" style={{ gridTemplateColumns: `repeat(${cardColumns(entries.length)}, minmax(0, 1fr))` }}>
        {entries.map((b) => (
          <div key={b.id} className="flex min-h-0 flex-col justify-center rounded-2xl bg-ink/5 px-8 py-5 [&_.b-item]:items-center [&_.b-item]:text-center">
            <Block data={b} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const headerType = z.object({
  title: z.string().describe("発表タイトル"),
  subtitle: z.string().optional().describe("副題"),
  author: z.string().optional().describe("発表者名"),
  affiliation: z.string().optional().describe("所属。author の下に小さく出す"),
  event: z.string().optional().describe("イベント名。右下に date と並べる"),
  date: z.string().optional().describe("日付"),
  logo: z.string().optional().describe("ロゴ画像。public/ のファイルは ./logo.svg、外部は URL。右上に白抜きで出す"),
});

/**
 * 表紙。title / subtitle を中央左寄せで大きく、発表者情報を左下、イベント情報を右下に置く。
 * items は title の下に補足として並ぶ(通常は空)。
 */
export const HeaderSlide = (slide: SlideOf<typeof headerType>) => (
  <div className="b-header absolute inset-0 flex flex-col overflow-hidden bg-linear-to-br from-primary to-primary-deep px-20 py-14 text-surface">
    {/* 装飾: 右下の大きな円と下端のストライプ。accent トークンで色が変わる。aria-hidden で yadeck check の対象から外す */}
    <div aria-hidden="true" className="pointer-events-none absolute -right-40 -bottom-64 size-[640px] rounded-full bg-accent/10" />
    <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3 bg-accent" />
    {slide.logo && <img className="absolute top-14 right-20 h-12 w-auto brightness-0 invert" src={slide.logo} alt="" />}
    <div className="relative flex flex-1 flex-col justify-center">
      <div className="flex flex-col gap-5 border-l-[10px] border-accent pl-8">
        <h1 className="m-0 text-h1 leading-[1.25] font-bold">
          <RichText text={slide.title} />
        </h1>
        {slide.subtitle && (
          <p className="m-0 text-h3 leading-snug font-normal text-accent">
            <RichText text={slide.subtitle} />
          </p>
        )}
      </div>
      {slide.items.length > 0 && (
        <div className="mt-8 flex flex-col gap-3">
          {slide.items.map((b) => (
            <Block key={b.id} data={b} />
          ))}
        </div>
      )}
    </div>
    <div className="relative flex items-end justify-between gap-6 text-small leading-snug">
      <div className="flex flex-col gap-1">
        {slide.author && <span className="text-h4 font-bold">{slide.author}</span>}
        {slide.affiliation && <span className="opacity-85">{slide.affiliation}</span>}
      </div>
      <div className="flex flex-col items-end gap-1 opacity-85">
        {slide.event && <span>{slide.event}</span>}
        {slide.date && <span>{slide.date}</span>}
      </div>
    </div>
  </div>
);

export const profileType = z.object({
  name: z.string().describe("名前"),
  role: z.string().optional().describe("肩書き・役割"),
  affiliation: z.string().optional().describe("所属"),
  photo: z.string().optional().describe("顔写真。無ければ name の頭文字を accent の円で出す"),
  accounts: z.record(z.string(), z.string()).optional().describe("SNS や GitHub の ID。{ x: id, github: id } の形"),
});

const ACCOUNT_LABEL: Record<string, string> = { x: "X", twitter: "X", github: "GitHub", bluesky: "Bluesky", mastodon: "Mastodon", zenn: "Zenn", qiita: "Qiita" };

/**
 * 自己紹介。左に名前・肩書き・写真、右に items(heading があれば右上の見出しに)。
 */
export const ProfileSlide = (slide: SlideOf<typeof profileType>) => {
  const [heading, rest] = pick(slide.items, ["heading"]);
  return (
    <div className={`${PAGE} b-profile`}>
      {heading && (
        <SlideHeading block={heading} description={slide.description} />
      )}
      <div className="grid min-h-0 flex-1 grid-cols-[380px_1fr] gap-12">
        <div className="relative flex flex-col items-center justify-center gap-6 overflow-hidden rounded-2xl bg-linear-to-br from-primary to-primary-deep px-8 py-10 text-center text-surface">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -bottom-24 size-72 rounded-full bg-accent/15" />
          {slide.photo ? (
            <img className="relative size-52 rounded-full object-cover ring-6 ring-accent" src={slide.photo} alt="" />
          ) : (
            <div className="relative flex size-52 items-center justify-center rounded-full bg-surface/10 text-display font-extrabold text-accent ring-6 ring-accent">
              {Array.from(slide.name)[0]}
            </div>
          )}
          <div className="relative flex flex-col gap-1">
            <span className="text-h3 font-bold">{slide.name}</span>
            {slide.role && <span className="text-body text-accent">{slide.role}</span>}
            {slide.affiliation && <span className="text-small opacity-85">{slide.affiliation}</span>}
          </div>
          {slide.accounts && (
            <div className="relative flex flex-col gap-1 text-small">
              {Object.entries(slide.accounts).map(([service, id]) => (
                <span key={service}>
                  <span className="mr-2 text-accent">{ACCOUNT_LABEL[service.toLowerCase()] ?? service}</span>@{id}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-6">
          {rest.map((b) => (
            <Block key={b.id} data={b} />
          ))}
        </div>
      </div>
    </div>
  );
};

export const sectionHeaderType = z.object({
  number: z.string().optional().describe("章番号。\"01\" のように表示したい文字列"),
});

/**
 * 章扉。表紙と同じ primary の地と accent の縦バーで、本文ページとの切り替わりを見せる。
 * number は左上に accent で大きく、右下に透かしでもう一度出す
 */
export const SectionHeaderSlide = (slide: SlideOf<typeof sectionHeaderType>) => {
  const [heading, rest] = pick(slide.items, ["heading"]);
  const [bodies] = pickAll(rest, ["body"]);
  return (
    <div className="b-section absolute inset-0 flex flex-col justify-center overflow-hidden bg-linear-to-br from-primary to-primary-deep px-20 py-14 text-surface [&_.b-heading]:m-0 [&_.b-heading]:text-[64px] [&_.b-heading]:leading-tight [&_.b-heading]:text-surface [&_.b-body]:m-0 [&_.b-body]:text-h3 [&_.b-body]:text-accent">
      {slide.number && (
        <div aria-hidden="true" className="pointer-events-none absolute -right-6 -bottom-28 text-[420px] leading-none font-extrabold text-surface/5 select-none">
          {slide.number}
        </div>
      )}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3 bg-accent" />
      <div className="relative flex flex-col gap-6">
        {slide.number && <div className="text-display leading-none font-extrabold text-accent">{slide.number}</div>}
        <div className="flex flex-col gap-4 border-l-[10px] border-accent pl-8">
          {heading && <Block data={heading} />}
          {bodies.map((b) => (
            <Block key={b.id} data={b} />
          ))}
        </div>
      </div>
      <Notes items={slide.items} />
    </div>
  );
};

/** 見出し + 前置き + left / right の 2 列。left / right の無い block は前置きとして列の上に置く */
export const TwoColumnSlide = (slide: SlideNode) => {
  const [heading, rest] = pick(slide.items, ["heading"]);
  const [right, rest2] = pickAll(rest, ["right"]);
  const [left, lead] = pickAll(rest2, ["left"]);
  // 列の中の code が収まるよう、pane 相当の寸法を渡す(幅は列幅、高さは列の半分程度を上限とみなす)
  const column = (blocks: BlockNode[]) => (
    <div
      className="flex min-w-0 flex-col gap-5 [&_.b-heading]:text-h3 [&_.b-heading]:text-primary"
      style={{ "--pane-w": "540px", "--pane-h": "260px" } as CSSProperties}
    >
      {blocks.map((b) => (
        <Block key={b.id} data={b} />
      ))}
    </div>
  );
  return (
    <div className={`${PAGE} b-two-column`}>
      {heading && <SlideHeading block={heading} description={slide.description} />}
      {lead.length > 0 && (
        <div className="flex flex-col gap-3">
          {lead.map((b) => (
            <Block key={b.id} data={b} />
          ))}
        </div>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-10">
        {column(left)}
        {column(right)}
      </div>
    </div>
  );
};

// ---- block ----

export const DefaultBlock = (block: BlockNode) => <RichText as="div" className="b-body" text={block.text} />;

export const headingType = z.object({
  level: z.number().int().min(1).max(4).optional().describe("見出しレベル 1〜4。既定 2"),
});

const HEADING_SIZE = { 1: "text-h1", 2: "text-h2", 3: "text-h3", 4: "text-h4" } as const;

/** 見出し。文字サイズは level で決まるが、slide 側が `[&_.b-heading]:text-*` で上書きできる */
export const HeadingBlock = (block: BlockOf<typeof headingType>) => {
  const level = (block.level ?? 2) as 1 | 2 | 3 | 4;
  const Tag = `h${level}` as "h2";
  return (
    <Tag className={`b-heading m-0 leading-tight font-bold ${HEADING_SIZE[level]}`}>
      <RichText text={block.text} />
    </Tag>
  );
};

export const BodyBlock = (block: BlockNode) => <RichText as="div" className="b-body" text={block.text} />;

export const listType = z.object({
  ordered: z.boolean().optional().describe("番号付きにする"),
  focus: z.number().int().min(1).optional().describe("焦点にする項目の番号(1 始まり)。他の項目は薄くなる"),
});

/** text の各行を項目にする。markdown の箇条書きは body でも書けるので、こちらは行区切りの簡易記法 */
export const ListBlock = (block: BlockOf<typeof listType>) => {
  const lines = (block.text ?? "").split("\n").filter((l) => l.trim().length > 0);
  const Tag = block.ordered ? "ol" : "ul";
  return (
    <Tag className={`b-list m-0 pl-[1.2em] marker:text-accent ${block.ordered ? "list-decimal" : "list-disc"}`}>
      {lines.map((line, i) => (
        <li key={i} className={`my-1 ${block.focus ? (block.focus === i + 1 ? "font-bold text-primary" : "opacity-50") : ""}`}>
          <RichText text={line} />
        </li>
      ))}
    </Tag>
  );
};

export const codeType = z.object({
  lang: z.string().optional().describe("言語。省略で自動判定、text でログなどを無色表示"),
  caption: z.string().optional().describe("コードの下に添える 1 行"),
  focus: z
    .union([z.string(), z.number().int().min(1), z.array(z.union([z.string(), z.number().int().min(1)]))])
    .optional()
    .describe('焦点にする行。行番号(1 始まり)、"6-8" の範囲、または行に含まれる文字列。配列で複数可。他の行は薄くなる'),
});

/** focus の指定を行番号(0 始まり)の集合にする */
export function focusLines(lines: string[], focus: z.infer<typeof codeType>["focus"]): Set<number> {
  const set = new Set<number>();
  if (focus === undefined) return set;
  for (const f of Array.isArray(focus) ? focus : [focus]) {
    if (typeof f === "number") {
      set.add(f - 1);
      continue;
    }
    const range = f.match(/^(\d+)-(\d+)$/);
    if (range) {
      for (let i = Number(range[1]); i <= Number(range[2]); i++) set.add(i - 1);
      continue;
    }
    lines.forEach((l, i) => {
      if (l.includes(f)) set.add(i);
    });
  }
  return set;
}

/**
 * ハイライト済み HTML を行ごとに分ける。行をまたぐ span(複数行コメントなど)は
 * 行末で閉じて次の行頭で開き直す。
 */
export function splitHighlighted(html: string): string[] {
  const out: string[] = [];
  const open: string[] = [];
  for (const raw of html.split("\n")) {
    let line = open.join("");
    for (const m of raw.matchAll(/<span[^>]*>|<\/span>/g)) {
      if (m[0] === "</span>") open.pop();
      else open.push(m[0]);
    }
    line += raw + "</span>".repeat(open.length);
    out.push(line);
  }
  return out;
}

/**
 * コード。highlight.js で SSG 時に色付けする。
 * 行数と最大行長を CSS 変数で渡し、pane に収まるフォントサイズを CSS の calc で決める(styles.ts)。
 */
/** コードの最大行幅(全角 2)と行数。フォントサイズの計算に使う */
export function codeSize(text: string | undefined): { cols: number; rows: number } {
  const lines = (text ?? "").replace(/\n$/, "").split("\n");
  return { cols: Math.max(1, ...lines.map(displayWidth)), rows: lines.length };
}

/** 箱の上下余白(40px)と、caption があればその 1 行分(40px)。高さからこの分を引いた残りに行を収める */
export function codeChrome(caption: string | undefined): number {
  return caption ? 80 : 40;
}

export const CodeBlock = (block: BlockOf<typeof codeType>) => {
  const code = (block.text ?? "").replace(/\n$/, "");
  const lines = code.split("\n");
  const { cols } = codeSize(code);
  // lang 無しは自動判定、text / plain はログなどの無色表示
  const plain = block.lang === "text" || block.lang === "plain" || block.lang === "plaintext";
  const lang = block.lang && hljs.getLanguage(block.lang) ? block.lang : undefined;
  const html = plain ? escapeHtml(code) : lang ? hljs.highlight(code, { language: lang }).value : hljs.highlightAuto(code).value;
  const focus = focusLines(lines, block.focus);
  const rows = splitHighlighted(html);
  // 箱は内容の高さで止め、pane の中では縦中央に置く(短いコードで黒い箱が間延びしない)
  return (
    <figure className="m-0 flex min-h-0 flex-1 flex-col justify-center gap-2">
      <pre
        className="b-code m-0 max-h-full min-h-0 overflow-hidden rounded-lg bg-code py-5 font-mono leading-snug text-code-ink"
        data-lang={block.lang}
        style={{ "--code-cols": cols, "--code-rows": lines.length, "--code-chrome": `${codeChrome(block.caption)}px` } as CSSProperties}
      >
        <code className="hljs block">
          {rows.map((row, i) => (
            <span
              key={i}
              className={`block border-l-4 px-5 ${
                focus.size === 0 ? "border-transparent" : focus.has(i) ? "border-accent bg-accent/15" : "border-transparent opacity-40"
              }`}
              dangerouslySetInnerHTML={{ __html: row || " " }}
            />
          ))}
        </code>
      </pre>
      {block.caption && (
        <figcaption className="shrink-0 text-small text-muted">
          <RichText text={block.caption} />
        </figcaption>
      )}
    </figure>
  );
};

export const imageType = z.object({
  src: z.string().describe("画像のパス(public/ なら ./name.png)か URL"),
  alt: z.string().optional().describe("代替テキスト"),
  width: z.union([z.string(), z.number()]).optional().describe("幅を固定したいときだけ。既定は pane いっぱい"),
});

/** 画像。pane いっぱいにアスペクト比を保って収める。width 指定があればその幅にする */
export const ImageBlock = (block: BlockOf<typeof imageType>) => (
  <figure className="b-image m-0 flex min-h-0 flex-1 flex-col items-center gap-2">
    <img
      className={block.width ? "max-h-full" : "min-h-0 w-full flex-1 object-contain"}
      src={block.src}
      alt={block.alt ?? ""}
      style={block.width ? { width: block.width } : undefined}
    />
    {block.text && (
      <figcaption className="shrink-0 text-small text-muted">
        <RichText text={block.text} />
      </figcaption>
    )}
  </figure>
);

export const videoType = z.object({
  url: z.string().describe("YouTube の watch / youtu.be / shorts の URL、または iframe で開ける URL"),
});

/** 動画。YouTube は embed URL に変換して iframe で埋め込む。text はキャプション */
export const VideoBlock = (block: BlockOf<typeof videoType>) => (
  <figure className="b-video m-0 flex min-h-0 flex-1 flex-col items-center gap-2">
    <iframe
      className="min-h-0 w-full flex-1 rounded-lg border-0 bg-code"
      src={toEmbedUrl(block.url)}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
    {block.text && (
      <figcaption className="shrink-0 text-small text-muted">
        <RichText text={block.text} />
      </figcaption>
    )}
  </figure>
);

/** 等幅フォントでの表示幅。全角(CJK や全角記号)は半角 2 つ分として数える */
function displayWidth(line: string): number {
  let w = 0;
  for (const ch of line) {
    const cp = ch.codePointAt(0)!;
    w += cp >= 0x1100 && (cp <= 0x115f || (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe30 && cp <= 0xfe4f) || (cp >= 0xff00 && cp <= 0xff60) || (cp >= 0xffe0 && cp <= 0xffe6) || cp >= 0x20000) ? 2 : 1;
  }
  return w;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function toEmbedUrl(url: string): string {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

export const statType = z.object({
  value: z.string().describe("大きく出す値。数字や固有名詞"),
  label: z.string().optional().describe("値の説明。1 行"),
});

/** 数字や固有名詞を主役にする block。text は補足として小さく出す */
export const StatBlock = (block: BlockOf<typeof statType>) => (
  <div className="b-stat flex items-baseline gap-5">
    <span className="w-[240px] shrink-0 text-right text-h1 leading-none font-extrabold text-primary">
      <RichText text={block.value} />
    </span>
    <div className="flex min-w-0 flex-col gap-1">
      {block.label && (
        <span className="text-h4 leading-tight font-bold">
          <RichText text={block.label} />
        </span>
      )}
      {block.text && (
        <span className="text-small leading-snug text-muted">
          <RichText text={block.text} />
        </span>
      )}
    </div>
  </div>
);

export const itemType = z.object({
  title: z.string().describe("項目名"),
  logo: z.string().optional().describe("項目のロゴ画像"),
});

/** 並列の項目。タイトルと説明を持つ。見せ方(カードにするか等)は slide の Layout が決める */
export const ItemBlock = (block: BlockOf<typeof itemType>) => (
  <div className="b-item flex flex-col gap-2">
    {block.logo && <img className="h-14 w-auto" src={block.logo} alt="" />}
    <span className="text-h4 leading-tight font-bold [word-break:keep-all]">
      <RichText text={block.title} />
    </span>
    {block.text && (
      <span className="text-body leading-snug text-muted">
        <RichText text={block.text} />
      </span>
    )}
  </div>
);

export const quoteType = z.object({
  cite: z.string().optional().describe("出典"),
});

export const QuoteBlock = (block: BlockOf<typeof quoteType>) => (
  <blockquote className="b-quote m-0 border-l-[6px] border-primary px-6 py-2 text-muted">
    <RichText as="div" className="b-body" text={block.text} />
    {block.cite && <cite className="mt-2 block text-small text-faint">{block.cite}</cite>}
  </blockquote>
);

/** 発表者ノート。画面・印刷には出さず、presenter モードが `.yd-notes` を拾って表示する */
export const NoteBlock = (block: BlockNode) => (
  <div className="yd-notes b-note" hidden>
    <RichText as="div" text={block.text} />
  </div>
);
