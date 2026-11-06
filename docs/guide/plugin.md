---
description: YADECK のプラグインを npm パッケージとして作る方法。Interface と bind、tags の解決、スタイル、パッケージの構成、テスト。
---

# プラグイン開発

プラグインは、Layout の登録をまとめた関数です。npm パッケージにすれば、複数の deck やチームで同じテンプレートを使えます。
basic プラグイン(`@yadeck/slide-components-basic`)もプラグインの 1 つです。

Layout の書き方そのものは [独自テンプレート](/guide/custom-template) と同じです。このページでは、パッケージとして作るときの決まりを説明します。

## プラグインの形

```ts
import { BlockLayout, SlideLayout, definePlugin } from "@yadeck/slide-core";

export const myTheme = definePlugin((c) => {
  c.addStyle(MY_CSS);
  c.bind(SlideLayout, ["header"], MyHeader, { type: headerType, description: "表紙。…" });
  c.bind(BlockLayout, ["callout"], Callout, { type: calloutType, description: "注意書き。…" });
});
export default myTheme;
```

`definePlugin` は型を付けるための関数で、中身はコンテナを受け取る関数そのものです。

### Interface

Layout は、どの段の描画を担うかを表す Interface に bind します。

| Interface | 担う段 | Layout が受け取る props |
|---|---|---|
| `DeckLayout` | deck 全体 | `DeckNode`(`slides` など) |
| `SlideLayout` | 1 ページ | `SlideNode`(`items`、`description` など)+ 自分のフィールド |
| `BlockLayout` | 部品 | `BlockNode`(`text` など)+ 自分のフィールド |

### bind

```ts
c.bind(Interface, tags, Component, { type, description });
```

| 引数 | 内容 |
|---|---|
| `tags` | この Layout を選ぶ tags。配列か、空白区切りの文字列(`"flow boxed"`) |
| `type` | 自分のフィールドだけを書いた zod の object。`id` `tags` `text` `items` などの共通部は core が足す |
| `description` | 用途の説明。JSON Schema に「tags: xxx — 説明」の形で出る |
| `client` | `true` なら、この Layout を使うページをブラウザでも描き直す。WebGL や canvas など、ブラウザで動く部品に使う([npm のコンポーネントを使う](/guide/client)) |

- 同じ Interface・同じ tags の組への bind は、後から登録した方で置き換わります
- tags が完全に一致しなくても、最もよく一致する Layout が選ばれます。規則は [tags の解決規則](/reference/resolution) にあります
- どの tags にも一致しないときのために、`[]`(tags なし)の Layout を 1 つ用意します。basic は全 Interface に `[]` を持っています

### スタイル

```ts
c.addStyle(`
@theme {
  --color-primary: #2a5bd7;
}
@layer components {
  .my-callout { border-left: 6px solid var(--color-accent); }
}
`);
```

- `addStyle` の CSS は、登録順に連結されて Tailwind でコンパイルされます。`@theme` でトークンの既定値を出し、利用者の `theme.css` で上書きしてもらう形にします
- Layout の `className` に書いた Tailwind の utility は、build 時に描画結果から拾われます
- basic の既定値 `DEFAULT_THEME` と、部品の CSS `BASIC_CSS` は export されているので、参考にできます

## basic との組み合わせ

プラグインは `slide.config.ts` の `plugins` に並べた順で登録されます。

```ts
export default defineConfig({
  plugins: [basic, myTheme],
});
```

- **basic の上に重ねる**: basic を先に置き、変えたい tags だけを bind します。bind していない tags は basic のまま描かれます
- **basic を使わない**: `plugins: [myTheme]` だけにします。この場合は、`DeckLayout` `SlideLayout` `BlockLayout` のそれぞれに `[]` の Layout を用意します。bind が 1 つも無い Interface は構成エラーになります。`[]` が無いと、どの tags にも一致しないノードが、たまたま一番近い別の Layout で描かれてしまいます

basic の Layout や部品(`PAGE`、`SlideHeading`、`CodeBlock` など)は export されているので、自分の Layout の中で再利用できます。

## パッケージの構成

```
my-yadeck-theme/
├─ package.json
├─ tsconfig.json
└─ src/
   ├─ index.ts        # definePlugin して default export
   ├─ layouts.tsx
   └─ layouts.test.tsx
```

```json
{
  "name": "my-yadeck-theme",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "peerDependencies": {
    "@yadeck/slide-core": "^0.1.0",
    "react": "^19.0.0",
    "zod": "^4.0.0"
  }
}
```

- `@yadeck/slide-core`、`react`、`zod` は peerDependencies にします。deck 側と同じ実体を使わないと、コンテナや zod の型が別物になります
- tsconfig は `"jsx": "react-jsx"` で ESM に出力します
- deck の `slide.config.ts` は esbuild で読み込まれ、プラグインもまとめて取り込まれます

### 開発中のプラグインを deck で試す

```json
// deck の package.json
"my-yadeck-theme": "file:../my-yadeck-theme"
```

```ts
// deck の slide.config.ts
export default defineConfig({
  plugins: [basic, myTheme],
  watch: ["../my-yadeck-theme/dist"],   // dev でプラグインのビルド結果の変更も拾う
});
```

プラグイン側で `tsc --watch` を動かしておけば、`yadeck dev` が変更を拾ってブラウザを再読み込みします。

## テスト

YAML を読み込んで描画した HTML を、スナップショットや文字列で確かめます。ブラウザは要りません。

```tsx
import { describe, expect, it } from "vitest";
import { createContainer, loadDeckFromYaml, renderDeck, validateDeck } from "@yadeck/slide-core";
import basic from "@yadeck/slide-components-basic";
import { myTheme } from "./index.js";

const container = createContainer([basic, myTheme]);

const render = (yaml: string) => {
  const deck = loadDeckFromYaml(yaml, { name: "t" });
  expect(validateDeck(container, deck)).toEqual([]);
  return renderDeck(deck, { container });
};

describe("callout", () => {
  it("text を描く", () => {
    expect(render(`- - callout: 注意`)).toContain("注意");
  });
});
```

見た目の崩れは、deck 側で `yadeck check` を使って確かめます。意図して枠外に出す装飾には `aria-hidden="true"` を付けておきます。

## 作るときの指針

- **data に見た目を持ち込まない。** フィールドは「何を伝えるか」に限ります。色・位置・大きさの指定はフィールドにしません
- **`description` は用途から書く。** AI は `description` を読んで tags を選びます。「どんな内容のページに使うか」を先に書きます
- **どんな中身でも崩れないようにする。** 文字の長さや項目の数が変わっても枠内に収まるよう、Layout 側で縮小や折り返しを決めます。basic のコードの自動縮小や、pane の自動配置が例です
