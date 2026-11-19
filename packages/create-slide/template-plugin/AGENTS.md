# AGENTS.md

このリポジトリは YADECK のプラグインです。YADECK は、data(YAML)に「何を伝えるか」だけを書き、見た目は view(React の Layout)が決めるスライドジェネレータです。プラグインは Layout を tags に bind して、deck に新しい見せ方を足します。

- ドキュメント: https://onfi.github.io/yadeck/guide/plugin

## 構成

| パス | 中身 |
|---|---|
| `src/index.ts` | `definePlugin` で Layout を tags に bind し、default export する |
| `src/layouts.tsx` | Layout(React コンポーネント)と、その data の型(zod) |
| `src/*.test.tsx` | Layout のテスト(vitest) |
| `example/deck.yaml` | 見本の deck。bind した tags をひととおり使う。npm に同梱し、プラグインの一覧のサムネイルにも使う |
| `slide.config.ts` | 見本をプレビューするための設定。公開はしない |

## コマンド

| コマンド | 使いどころ |
|---|---|
| `npm run dev` | 見本のプレビュー(http://localhost:3000/)。`src/` を変えると再読み込み |
| `npm test` | Layout を変えたら必ず |
| `npm run check` | 見本のはみ出し・切れ・コードの縮みを検査する。error は直す |
| `npm run png` | 見本を `.slide/preview/png/` に書き出す。見た目を確かめるときは PNG を読む |
| `npm run build` | `dist/` に出力する |

## Layout を書くときの約束

- **data に見た目を持たせない。** 型(zod)に色・位置・大きさのフィールドを足さない。何を伝えるかだけを書かせる
- **型のフィールドには `.describe()` を付ける。** schema に出て、deck を書く AI が読む
- **`bind` の `description` は「どういう内容のページで使うか」から書く。** AI が tags を選ぶ手がかりになる。見た目の説明は後ろに
- **色や文字の大きさはテーマのトークンを使う。** `bg-primary`、`text-surface`、`text-display` など。deck のテーマに従わせる
- **items は `<Block>` で描く。** 発表者ノート(`note`)も items に入っていて、`<Block>` で描くと発表者モードに出る
- **意図して枠の外へ出す装飾には `aria-hidden="true"` を付ける。** `check` の対象から外れる
- **ブラウザで動かす必要があるもの(WebGL、チャートのアニメーションなど)は、`bind` に `client: true` を付ける**

## 足したら

1. `src/index.ts` で bind する
2. `example/deck.yaml` に、その tags を使ったページを足す
3. `npm test` と `npm run check` を通す
4. `npm run png` で書き出した PNG を見て、見た目を確かめる

## 公開の決まり

- `package.json` の `keywords` に `yadeck-plugin` を入れたままにする(プラグインの一覧はこれで集める)
- 名前は `yadeck-plugin-*` か `@scope/yadeck-plugin-*`
- `@yadeck/slide-core`、`react`、`zod` は peerDependencies
