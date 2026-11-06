---
description: deck のリポジトリの src/ に JSX の Layout を書き、tags を足したり basic を上書きしたりして、1 ページを作り込む方法。
---

# 独自テンプレート

basic の Layout で足りないページは、deck リポジトリの `src/` に Layout を書いて足します。
パッケージを作る必要はありません。そのリポジトリの中だけで使うテンプレートです。

複数の deck やチームで使い回したくなったら、[プラグイン開発](/guide/plugin) でパッケージに切り出します。書き方は同じです。

## 仕組み

1. `src/` に React コンポーネント(Layout)を書く
2. `definePlugin` で、どの tags のときにその Layout を使うかを登録する
3. `slide.config.ts` の `plugins` に足す
4. deck では、その tags を付けるだけ

data の書き方は変わりません。AI にとっては、使える tags が 1 つ増えるだけです。

## 例 1: 既存のページの別バージョンを作る

雛形の `src/t-theme.tsx` は、章扉 `section-header` に `t` を足したときだけ見た目を変える例です。

```tsx
// src/t-theme.tsx
import { z } from "zod";
import { Block, SlideLayout, definePlugin, pick, pickAll, type SlideOf } from "@yadeck/slide-core";

const sectionType = z.object({ number: z.string() });

/** number を左に大きく出し、heading と body を右に寄せる */
export const TSectionLayout = (slide: SlideOf<typeof sectionType>) => {
  const [heading, rest] = pick(slide.items, ["heading"]);
  const [bodies] = pickAll(rest, ["body"]);
  return (
    <div className="absolute inset-0 grid grid-cols-[320px_1fr] bg-ink text-surface">
      <div className="flex items-center justify-center bg-accent text-[160px] font-extrabold text-ink">
        {slide.number}
      </div>
      <div className="flex flex-col justify-center gap-6 p-20">
        {heading && <Block data={heading} />}
        {bodies.map((b) => <Block key={b.id} data={b} />)}
      </div>
    </div>
  );
};

export const tTheme = definePlugin((c) => {
  c.bind(SlideLayout, ["section-header", "t"], TSectionLayout, { type: sectionType });
});
```

```ts
// slide.config.ts
import basic from "@yadeck/slide-components-basic";
import { tTheme } from "./src/t-theme.js";

export default defineConfig({
  plugins: [basic, tTheme],   // 配列の順 = 登録の順
});
```

```yaml
- section-header t:      # tags: [section-header, t] → TSectionLayout
    number: "01"
    $items:
      - heading: 本題
- section-header:        # tags: [section-header] → basic の章扉のまま
    number: "02"
```

`[section-header, t]` の両方を持つページだけが新しい Layout になり、`section-header` だけのページは basic のままです。
同じ tags の組で bind すると、後から登録した方で置き換わります。basic の `section-header` を丸ごと差し替えたいなら、`["section-header"]` で bind します。

## 例 2: 1 ページだけ作り込む

発表の山場など、1 ページだけ凝った見せ方をしたいときは、そのページ専用の tags を作ります。
見た目は JSX と Tailwind で自由に書けます。SVG や CSS アニメーションも使えます。
チャートや 3D など npm のコンポーネントを使う方法は [npm のコンポーネントを使う](/guide/client) にあります。

```tsx
// src/timeline.tsx
import { z } from "zod";
import { RichText, SlideLayout, definePlugin, pick, Block, type SlideOf } from "@yadeck/slide-core";
import { PAGE, SlideHeading } from "@yadeck/slide-components-basic";

const timelineType = z.object({
  events: z
    .array(z.object({ at: z.string().describe("時刻"), what: z.string().describe("起きたこと") }))
    .describe("時刻順の出来事"),
  focus: z.number().int().min(1).optional().describe("焦点にする出来事の番号(1 始まり)"),
});

export const TimelineSlide = (slide: SlideOf<typeof timelineType>) => {
  const [heading] = pick(slide.items, ["heading"]);
  return (
    <div className={PAGE}>
      {heading && <SlideHeading block={heading} description={slide.description} />}
      <div className="relative flex flex-1 items-center">
        {/* 時間軸の線。点の中心を通るよう、行の真ん中に引く */}
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-primary/30" />
        <ol className="relative m-0 flex w-full list-none justify-between p-0">
          {slide.events.map((e, i) => {
            const focused = slide.focus === i + 1;
            return (
              <li key={i} className="yd-pop grid h-48 w-56 grid-rows-[1fr_auto_1fr] justify-items-center gap-4">
                <span className={`self-end text-h3 font-bold ${focused ? "text-accent" : "text-primary"}`}>{e.at}</span>
                <span className={`size-7 rounded-full border-4 ${focused ? "border-accent bg-accent" : "border-primary bg-surface"}`} />
                <RichText className="self-start text-center text-small" text={e.what} />
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export const timeline = definePlugin((c) => {
  c.bind(SlideLayout, ["timeline"], TimelineSlide, {
    type: timelineType,
    description: "時刻順の出来事を横の時間軸に並べる。focus の出来事を accent で強調する",
  });
  // 発表モードで表示中のページだけ、出来事を順に出す
  c.addStyle(`
    .yd-active .yd-pop { animation: yd-pop .4s both; }
    .yd-active .yd-pop:nth-child(2) { animation-delay: .2s; }
    .yd-active .yd-pop:nth-child(3) { animation-delay: .4s; }
    @keyframes yd-pop { from { opacity: 0; transform: translateY(12px); } }
  `);
});
```

```yaml
- timeline:
    description: スライドを書くのは 2 日だけ
    focus: 3
    events:
      - { at: "1 日目", what: 原稿を書く }
      - { at: "4 日目", what: スライドにする }
      - { at: "7 日目", what: 発表する }
    $items:
      - heading: 1 週間で発表まで
```

## Layout を書くときの道具

| 道具 | 使い方 |
|---|---|
| `SlideOf<typeof type>` / `BlockOf<typeof type>` | Layout の props の型。ノードの共通部(`id` `tags` `items` など)と、自分のフィールドが入る |
| `pick(items, tags)` | items から tags に最もよく一致する 1 つと、残りを返す |
| `pickAll(items, tags)` | 一致する全部と、残りを返す |
| `<Block data={b} />` | block を、その tags に合う Layout で描く。basic の `code` や `list` をそのまま使える |
| `<RichText text={...} />` | markdown を含む文字列を描く |
| `PAGE` / `SlideHeading` | basic の、ページの余白と見出し(accent の縦バーと下線、description)。basic と見た目をそろえたいときに使う |
| `c.addStyle(css)` | CSS を出力に同梱する |

- `className` には Tailwind の utility をそのまま書けます。`bg-primary` や `text-h2` のように、テーマのトークンが使えます
- スライドの大きさは 1280×720 で固定です。Layout の外枠は `absolute inset-0` で全面に広げます

## schema と AI に向けて書くこと

- **`type` に zod でフィールドを書く。** 検証と `.slide/deck.schema.json` の両方に使われます。`.describe()` の説明は、エディタの補完と AI の手がかりになります
- **`description` に用途を書く。** 「どういう内容のページで使うか」を書くと、AI が tags を選ぶときの判断材料になります。見た目の説明より、用途を先に書きます
- **data に見た目の情報を足さない。** 色や位置をフィールドにせず、「何を強調するか」(`focus`)のような内容の指定にとどめます

## 確認する

```sh
npm run schema                          # 新しい tags が schema に出たか
npx yadeck check --slide 5 --png        # はみ出していないか
```

意図して枠の外にはみ出させる装飾(大きな円や透かしの文字など)には `aria-hidden="true"` を付けます。`check` の検査対象から外れます。
