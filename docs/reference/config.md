# slide.config.ts

deck リポジトリの直下に置く設定ファイルです。`defineConfig` で書きます。

```ts
import { defineConfig } from "@yadeck/slide-core";
import basic from "@yadeck/slide-components-basic";
import { tTheme } from "./src/t-theme.js";

export default defineConfig({
  plugins: [basic, tTheme],
  theme: "./theme.css",
  fonts: ["Noto Sans JP:400,700", "JetBrains Mono:400"],
  richText: { markdown: true, html: true },
});
```

| 項目 | 既定値 | 内容 |
|---|---|---|
| `plugins` | (必須) | 使うプラグイン。配列の順が登録の順で、同じ tags の組は後のプラグインが上書きする |
| `decks` | `"decks"` | deck ファイル(`.yaml` / `.yml` / `.json`)を置くディレクトリ |
| `outDir` | `"dist"` | 出力先 |
| `publicDir` | `"public"` | 出力先へそのままコピーする素材のディレクトリ |
| `schemaPath` | `".slide/deck.schema.json"` | JSON Schema の出力先 |
| `theme` | なし | テーマの CSS。Tailwind v4 の `@theme` でトークンを上書きする。プラグインの既定より後に読まれる |
| `fonts` | `[]` | Google Fonts の指定。`"ファミリー名:ウェイト,ウェイト"` |
| `embedFonts` | `true` | build でフォントを HTML に埋め込むか。`false` なら `<link>` で読む |
| `richText` | `{ markdown: true, html: true }` | テキストで markdown と HTML を使えるか。HTML は常に sanitize される |
| `port` | `3000` | dev サーバのポート |
| `watch` | `[]` | dev で追加で監視するパス。`file:` で参照しているプラグインの `dist` など |

`slide.config.ts` は esbuild でまとめて読み込まれます。`src/` のプラグインや、`file:` で参照しているプラグインも一緒に取り込まれるので、TypeScript と JSX をそのまま書けます。
