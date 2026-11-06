import { BlockLayout, DeckLayout, SlideLayout, definePlugin } from "@yadeck/slide-core";
import {
  BodyBlock,
  CardSlide,
  CodeBlock,
  DefaultBlock,
  DefaultDeck,
  HeaderSlide,
  HeadingBlock,
  ImageBlock,
  ItemBlock,
  ListBlock,
  NoteBlock,
  ProfileSlide,
  QuoteBlock,
  SectionHeaderSlide,
  StatBlock,
  TwoColumnSlide,
  VideoBlock,
  codeType,
  headerType,
  headingType,
  imageType,
  itemType,
  listType,
  profileType,
  quoteType,
  sectionHeaderType,
  statType,
  videoType,
} from "./layouts.js";
import { FlowBlock, FlowBoxed, FlowFramed, FlowGrid, flowType } from "./flow.js";
import { ColumnsSlide, DefaultSlide } from "./panes.js";
import { BASIC_CSS, DEFAULT_THEME } from "./styles.js";

export * from "./layouts.js";
export * from "./panes.js";
export * from "./flow.js";
export * from "./chrome.js";
export { BASIC_CSS, DEFAULT_THEME } from "./styles.js";

/**
 * 最小 tag セット。全 Interface に tags: [] の fallback を持つので、
 * これを先頭に置けばどんな tags でも必ず何かが描画される。
 */
export const basic = definePlugin((c) => {
  c.addStyle(DEFAULT_THEME);
  c.addStyle(BASIC_CSS);
  c.bind(DeckLayout, [], DefaultDeck, { description: "スライドを縦に並べる" });

  c.bind(SlideLayout, [], DefaultSlide, {
    description:
      "汎用。テキスト(tags なし / body / list / quote / stat / item)は全部で 1 pane、code / image / video は 1 つずつ 1 pane に数え、1: 全面、2: 左右、3: ト型、4: 十字、5 以上: 左右 2 列に自動配置。テキストは 1 行なら中央に大きく、2 行以上なら箇条書き",
  });
  c.bind(SlideLayout, ["header"], HeaderSlide, { type: headerType, description: "表紙。title / subtitle を大きく、発表者情報を左下、イベント情報を右下、logo を右上" });
  c.bind(SlideLayout, ["profile"], ProfileSlide, { type: profileType, description: "自己紹介。左に名前・肩書き・写真・アカウント、右に items" });
  c.bind(SlideLayout, ["section-header"], SectionHeaderSlide, { type: sectionHeaderType, description: "章扉。number と heading、body だけを描く" });
  c.bind(SlideLayout, ["two-column"], TwoColumnSlide, { description: "2 列の対比。left を付けた block を左列、right を右列、どちらも無い block は前置きとして列の上に置く。列の見出しは heading left / heading right" });
  c.bind(SlideLayout, ["card"], CardSlide, { description: "item をカードにして並べる(3 枚までは 1 行、4 枚は 2×2、5 枚以上は 3 列)。他の block は前置きとして上に置く" });
  c.bind(SlideLayout, ["columns"], ColumnsSlide, { description: "pane を横一列に等分する(4 まで。5 以上は 3 列 × 2 行)" });

  c.bind(BlockLayout, [], DefaultBlock, { description: "本文 1 行。markdown 可" });
  c.bind(BlockLayout, ["heading"], HeadingBlock, { type: headingType, description: "見出し。slide の上部に置かれる" });
  c.bind(BlockLayout, ["body"], BodyBlock, { description: "本文。markdown 可。複数行は段落になる" });
  c.bind(BlockLayout, ["list"], ListBlock, { type: listType, description: "行ごとの箇条書き" });
  c.bind(BlockLayout, ["code"], CodeBlock, { type: codeType, description: "コード。highlight.js で色付けし、pane に収まるよう縮小する" });
  c.bind(BlockLayout, ["image"], ImageBlock, { type: imageType, description: "画像。pane にアスペクト比維持で収める。text はキャプション" });
  c.bind(BlockLayout, ["video"], VideoBlock, { type: videoType, description: "動画。YouTube の URL は embed に変換して iframe で埋め込む" });
  c.bind(BlockLayout, ["flow"], FlowBlock, {
    type: flowType,
    description: "流れ(手順)。縦は STEP ピル + 縦レール + 見出しと説明(1 カラム構成)、横(direction: row)は吹き出し番号付きの枠カードを › でつなぐ。via / phase / detail / focus。1 つで 1 pane",
  });
  c.bind(BlockLayout, ["flow", "boxed"], FlowBoxed, {
    type: flowType,
    description: "流れ(手順)の別の見せ方。角丸の枠を縦に積み、点線と ▽ でつなぐ。左に STEP と見出し、右に説明",
  });
  c.bind(BlockLayout, ["flow", "framed"], FlowFramed, {
    type: flowType,
    description: "流れ(手順)の別の見せ方。全体を 1 つの枠で囲み、区切り線に ▽ の切り込み。左に STEP と見出し、右に説明",
  });
  c.bind(BlockLayout, ["flow", "grid"], FlowGrid, {
    type: flowType,
    description: "流れ(手順)の別の見せ方。右端が矢印形のカードを 2 列に並べる。段数が多いときに高さを取らない",
  });
  c.bind(BlockLayout, ["quote"], QuoteBlock, { type: quoteType, description: "引用" });
  c.bind(BlockLayout, ["stat"], StatBlock, { type: statType, description: "数字や固有名詞を大きく見せる。label と補足の text" });
  c.bind(BlockLayout, ["item"], ItemBlock, { type: itemType, description: "並列の項目(title + 説明の text)。card slide でカードになる" });
  c.bind(BlockLayout, ["note"], NoteBlock, { description: "発表者ノート。画面にも印刷にも出ず、presenter モードに出る" });
});

export default basic;
