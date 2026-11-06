# テーマ・フォント・画像

見た目の調整は data ではなく、`theme.css` と `slide.config.ts` で行います。

## テーマ(Tailwind v4)

YADECK の見た目は Tailwind v4 に乗っています。`slide.config.ts` の `theme` に指定した CSS の `@theme` で、デザイントークンを上書きします。

```ts
// slide.config.ts
export default defineConfig({
  plugins: [basic],
  theme: "./theme.css",
});
```

```css
/* theme.css */
@theme {
  --color-primary: #1f3a5f;
  --color-primary-deep: #0b1b33;
  --color-accent: #f2a900;
  --font-sans: "Noto Sans JP", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}
```

basic プラグインが使うトークンと既定値は次のとおりです。

| トークン | 既定値 | 使われ方 |
|---|---|---|
| `--color-primary` | `#2a5bd7` | 見出しの線、表紙と章扉の地、流れの枠 |
| `--color-primary-deep` | `#163a8f` | 表紙と章扉のグラデーションの終わり |
| `--color-accent` | `#e8c547` | 見出しの縦バー、表紙の帯、焦点 |
| `--color-ink` | `#222222` | 本文の文字 |
| `--color-muted` / `--color-faint` | `#666666` / `#888888` | 説明やキャプション |
| `--color-surface` | `#ffffff` | 地の色 |
| `--color-code` / `--color-code-ink` | `#1e1e1e` / `#eeeeee` | コードの背景と文字 |
| `--font-sans` / `--font-mono` | | 本文とコードの書体 |
| `--text-body` / `--text-small` | `28px` / `22px` | 本文と補足 |
| `--text-h1` 〜 `--text-h4` | `64px` 〜 `30px` | 見出し |
| `--text-display` | `96px` | 章番号などの大きな文字 |

`theme.css` は Tailwind の CSS なので、`@utility` や `@layer`、素の CSS も書けます。
Layout の `className` に書いた `bg-primary` や `text-h2` などの utility は、このトークンから作られます。

::: tip
build では、描画済みの HTML に出てくる utility だけを拾って CSS を作り、HTML に同梱します。
:::

## フォント(Google Fonts)

```ts
export default defineConfig({
  fonts: ["Noto Sans JP:400,700,800", "JetBrains Mono:400"],
});
```

- `"ファミリー名:ウェイト,ウェイト"` の形で書きます。`theme.css` の `--font-sans` などで同じファミリー名を指定します
- `dev` では Google Fonts の `<link>` を入れるだけです(ネットワークが必要です)
- `build` では、deck で使っている文字を含む断片だけを取り出して HTML に埋め込みます。出力した HTML はオフラインでも同じ見た目になります。外部に送るのはファミリー名だけです
- ダウンロードしたフォントは `node_modules/.yadeck/fonts/` にキャッシュされます
- `embedFonts: false` にすると、build でも `<link>` で読み込みます

## 画像などの素材

`public/` に置いたファイルは、出力先の直下にそのままコピーされます。deck からは `./ファイル名` で参照します。

```yaml
- header:
    title: 発表タイトル
    logo: ./logo.svg
- - heading: 原稿から発表まで
  - image: { src: ./workflow.svg, alt: 原稿、構成、スライド、発表の順に進む }
```

置き場所は `slide.config.ts` の `publicDir` で変えられます。外部の画像は URL でも指定できます。
