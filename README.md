# YADECK

YAML で「何を伝えるか」だけを書き、見た目・配置・コンポーネント選択は全て React(view)で決めるスライドジェネレータ。
data の各ノードは `tags` を持ち、tags が唯一の分岐キー。view は「Interface + tags」で実装を解決する DI コンテナを中心に組む。

- ドキュメント: https://onfi.github.io/yadeck/
- スライド作成用のエージェントスキル: `npx skills add onfi/yadeck --skill yadeck`(deck リポジトリの直下で実行。本体は `packages/create-slide/template/_agents/skills/yadeck/SKILL.md`、`skills.sh.json` で CLI に場所を教えている)

## パッケージ

| パッケージ | 役割 |
|---|---|
| `@yadeck/slide-schema` | 基底スキーマ(version / meta / deck-slide-block) + Interface(`DeckLayout` / `SlideLayout` / `BlockLayout`) |
| `@yadeck/slide-core` | loader(sugar 展開) / validate / DI コンテナ / renderer / RichText / JSON Schema emit / CLI(`yadeck build|dev|validate|schema|check|png`) |
| `@yadeck/slide-components-basic` | 標準の Layout 一式(basic プラグイン)。表紙、自己紹介、章扉、自動レイアウト、2 列、カード、横並び、コード、画像、動画、流れの図、ノートなど |
| `@yadeck/create-slide` | `npx @yadeck/create-slide my-deck` で利用者リポジトリを生成 |

利用者リポジトリの実例は `examples/my-deck`。

使い方のドキュメントは `docs/`(VitePress)。`npm run docs:dev` で手元に表示し、`npm run docs:build` でサンプル deck のデモを含む静的サイトを `docs/.vitepress/dist/` に出す。

## 開発

```sh
npm install
npm run build          # 全パッケージを tsc でビルド
npm test               # vitest(sugar 展開 / 解決規則 / validate / Layout snapshot)
npm run example:build  # examples/my-deck を dist/*.html に出力
npm run example:dev    # http://localhost:3000/ でプレビュー(保存で自動再読込)
npm run docs:dev       # ドキュメントサイトを手元で表示
```

## データの書き方(sugar)

```yaml
# yaml-language-server: $schema=../.slide/deck.schema.json
- header: { title: 発表タイトル }
- section-header t:
    number: "01"
    $items:
      - heading: 概要
      - body: これこれは…
- - 本文1
  - 本文2
- 次のページ本文
```

- 配列 → tags 無しのノードと children
- 文字列 → block なら `text`、上位の段なら末端まで落として block 1個
- `$` を含まない単一キー map `{ K: V }` → `K` を空白で分割して tags、`V` は map なら fields、配列なら children、文字列なら text
- フル記述の構造キーは `$tags $slides $items $text $meta $version`

## プラグイン

```tsx
export default definePlugin((c) =>
  c.bind(SlideLayout, ["section-header", "t"], TSectionLayout, {
    type: z.object({ number: z.string() }),
  }));
```

`slide.config.ts` の `plugins` 配列順が登録順。同じ Interface + tags の bind は後段が上書きする。
解決は match(共通 tag 数)多い順 → extra(余分な tag 数)少ない順 → 登録順(DI は後勝ち、pick は先勝ち)。

## テーマ(Tailwind v4)

見た目は Tailwind v4 に乗せている。`slide.config.ts` の `theme` に CSS を指定し、`@theme` でトークンを上書きするとテーマが切り替わる。

```css
@theme {
  --color-primary: #0f766e;
  --font-sans: "Noto Sans JP", sans-serif;
}
```

- basic の既定トークン: `--color-primary / primary-deep / accent / ink / muted / faint / surface / code / code-ink`、`--font-sans / mono`、`--text-body / small / h1 / h2 / h3 / h4 / display`
- Layout の `className` には `bg-primary` `text-h2` `grid-cols-[320px_1fr]` など Tailwind の utility をそのまま書ける
- build 時に描画済み HTML から使われた utility だけを拾ってコンパイルし、HTML に同梱する(自動スキャンは無効)

## フォント(Google Fonts)

```ts
fonts: ["Noto Sans JP:400,700", "JetBrains Mono:400"],
```

- `dev` は Google Fonts の `<link>` を入れるだけ(ネットワーク前提)
- `build` は Google Fonts の CSS を取り、`unicode-range` で分割された woff2 のうち deck で使う文字を含む断片だけを data URI で `@font-face` に埋め込む。HTML 1 ファイルで完結し、オフラインでも同じ見た目になる。外部へ送るのは family 名だけ
- ダウンロードは `node_modules/.yadeck/fonts/` にキャッシュ。`embedFonts: false` で build でも `<link>` にできる
- theme.css 側で `--font-sans: "Noto Sans JP", sans-serif` のように family 名を指定する

## プレゼンテーションモード

生成した HTML だけで動く(サーバ不要)。通常表示の右下のボタン、または `P` / `S` キーで切り替える。

| モード | URL | 内容 |
|---|---|---|
| 通常 | `deck.html` | 全スライドを縦に並べて閲覧。印刷はここから |
| present | `deck.html?mode=present` | 聴衆向け。1枚ずつ全画面。← → Space クリックで送り、`F` 全画面、`B` 暗転、`Esc` で戻る |
| presenter | `deck.html?mode=presenter` | 発表者向け。現在/次のスライド、ノート(`note` block)、タイマー、投影先の選択 |

- presenter の「投影ウィンドウを開く」は Window Management API でスクリーンを列挙し、選んだ画面に全画面 popup で present を開く(Chrome。権限ダイアログが出る)。非対応ブラウザでは通常の別ウィンドウで開くので `F` で全画面にする
- ウィンドウ間は BroadcastChannel で同期する。ページ送り・暗転・レーザーポインタ(`L` で切り替え、押している間だけ赤い点を出す)が揃う
- 同一オリジンが前提なので `file://` で直接開くのではなく、`yadeck dev` か任意の静的サーバで配信する

## 出力

`dist/*.html` の静的 HTML。16:9(1280x720)固定で、ブラウザの印刷から PDF にできる(`@page` + `break-after: page`)。
補完用の JSON Schema は build/dev 時(または `yadeck schema`)に `.slide/deck.schema.json` へ出力される。bind の `description` と zod の `.describe()` が入るので、使える tags とフィールドの一覧として読める。
`public/`(config の `publicDir`)の中身は `dist/` 直下にそのままコピーされ、deck からは `./logo.svg` のように参照する。

## リリース

4 つのパッケージは同じ版で出す。依存の順(schema → core → components-basic → create-slide)に publish される。

```sh
npm login                  # 初回だけ。@yadeck スコープに publish できるアカウントで
npm run release:check      # クリーンビルド、テスト、各パッケージの中身の確認(上げない)
npm run release:publish    # クリーンビルド、テストのあと npm に publish する
```

版を上げるときは、4 つのパッケージの `version`、パッケージ間の依存(`@yadeck/*`)、雛形の依存をスクリプトでまとめて変える。

```sh
npm run release:version -- 0.1.1
npm install                # package-lock.json を合わせる
```
