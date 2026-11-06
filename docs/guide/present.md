---
description: YADECK の発表モードと発表者モード、デュアルモニターへの投影、印刷して PDF、yadeck png での PNG の書き出し、yadeck check でのレイアウトの検査。
---

# 発表・印刷・確認

build した HTML だけで、発表、印刷、PNG の書き出しができます。

## 発表モード

通常表示の右下のボタン、または `P` / `S` キーで切り替えます。

| モード | URL | 内容 |
|---|---|---|
| 通常 | `deck.html` | 全ページを縦に並べて表示する。印刷はここから |
| present | `deck.html?mode=present` | 聴衆向け。1 ページずつ全画面で出す |
| presenter | `deck.html?mode=presenter` | 発表者向け。今のページと次のページ、ノート、タイマー、投影先の選択 |

present のキー操作は次のとおりです。

| キー | 操作 |
|---|---|
| `→` `Space` クリック | 次へ |
| `←` | 前へ |
| `F` | 全画面 |
| `B` | 暗転 |
| `Esc` | 通常表示に戻る |

`#s3` のように URL の末尾にページ番号(0 始まり)を付けると、そのページから開きます。

通常表示の末尾には「Created with YADECK」のリンクが出ます。発表モードと印刷には出ません。消したいときは `slide.config.ts` で `credit: false` にします。

### デュアルモニター

- presenter の「投影ウィンドウを開く」は、接続された画面を一覧し、選んだ画面に present を全画面で開きます(Chrome の Window Management API。権限の確認が出ます)
- 対応していないブラウザでは別ウィンドウで開くので、`F` で全画面にします
- ウィンドウ同士は同期します。ページ送り、暗転、ポインタ(presenter のプレビュー上のマウス位置が、投影側に赤い点で出る)がそろいます
- 同期は同じオリジンが前提です。`file://` で開かず、`yadeck dev` か静的サーバで配信します

## 印刷して PDF にする

通常表示でブラウザの印刷を使うと、1 ページ 1 枚の 16:9(1280×720)の PDF になります。

## PNG に書き出す

```sh
npx yadeck png --deck talk              # dist/png/talk/s00.png, s01.png, ...
npx yadeck png --deck talk --slide 3,4  # 指定したページだけ
npx yadeck png --scale 2                # 2 倍の解像度
```

初回は Chromium が必要です。

```sh
npm i -D playwright
npx playwright install chromium
```

## レイアウトを検査する

```sh
npx yadeck check --deck talk --slide 9 --png
```

各ページを Chromium で描画し、要素の寸法を測って問題を文字で報告します。`--png` を付けると、問題のあったページだけ PNG も書き出します。

| 区分 | 検出するもの |
|---|---|
| error | スライドの外へのはみ出し、枠で切れて見えない文字 |
| warn | 端の余白への食い込み、コードが下限の 14px まで縮んでいる、コードの行の折り返し |

```
  ! talk  (12 slides)
      #s9   warn   コードが下限の 14px まで縮んでいる: 「public class VeryLongCla…」
             png: dist/png/talk/s09.png
0 error(s), 1 warning(s)
```

error があると終了コードが 1 になるので、CI でも使えます。
AI に作らせるときも、スクリーンショットを撮る代わりにこの結果を読ませると速く確認できます。
