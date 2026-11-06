---
description: yadeck コマンドのリファレンス。dev・build・validate・schema・check・png の各コマンドとオプション、出力されるファイル。
---

# CLI

deck リポジトリで `npx yadeck <コマンド>` として使います。雛形の `package.json` には、同じ名前の npm scripts が入っています。

| コマンド | 内容 |
|---|---|
| `yadeck dev` | ビルドしてプレビューサーバを起動する。変更を監視して再ビルドし、ブラウザを自動で再読み込みする |
| `yadeck build` | `decks/` の全 deck を検証し、静的 HTML に書き出す |
| `yadeck validate` | `decks/` の全 deck を検証する |
| `yadeck schema` | `.slide/deck.schema.json` を書き出す |
| `yadeck check` | ビルドして Chromium で描画し、はみ出し・切れ・コードの縮みを検査する |
| `yadeck png` | ビルドして各ページを PNG に書き出す |

## オプション

| オプション | 対象 | 内容 |
|---|---|---|
| `--config <path>` | 全部 | 設定ファイル。既定 `slide.config.ts` |
| `--out <dir>` | build / dev / check / png | 出力先。既定は設定の `outDir`(`dist`) |
| `--port <n>` | dev | ポート。既定は設定の `port`(3000) |
| `--deck <name>` | check / png | 対象の deck(拡張子なしのファイル名)。カンマ区切り・複数回指定できる |
| `--slide <n>` | check / png | 対象のページ。`#s9` なら `9`。カンマ区切り・複数回指定できる |
| `--png` | check | 問題のあったページを PNG にも書き出す |
| `--scale <n>` | png | 倍率。既定 1(1280×720) |

## 出力

| パス | 内容 |
|---|---|
| `dist/<deck>.html` | deck の HTML。CSS とフォントを埋め込んだ 1 ファイル |
| `dist/index.html` | deck の一覧。ビルドに失敗した deck のエラーも出る |
| `dist/<public の中身>` | `public/` からコピーした素材 |
| `dist/png/<deck>/s09.png` | `png` と `check --png` の書き出し。番号は 2 桁にそろえる |
| `.slide/deck.schema.json` | 補完と AI 向けの JSON Schema |

## check の結果

```
  ✓ sample  (6 slides)
  ! talk  (12 slides)
      #s9   warn   コードが下限の 14px まで縮んでいる: 「public class VeryLongCla…」
      #s11  error  枠で切れて見えない: b-code 「line 1 line 2 …」
             png: dist/png/talk/s11.png
1 error(s), 1 warning(s)
```

| 区分 | 内容 |
|---|---|
| error | スライドの外へのはみ出し、`overflow` で切れて見えない文字。終了コードが 1 になる |
| warn | 端から 32px の余白への食い込み、コードが下限の 14px まで縮んでいる、コードの行の折り返し |

`aria-hidden="true"` の要素と、発表者ノートは検査しません。

`check` と `png` は playwright と Chromium を使います。

```sh
npm i -D playwright
npx playwright install chromium
```
