---
description: basic プラグインが用意する tags の一覧。表紙、章扉、自動レイアウト、2 列、カード、横並び、コード、画像、動画、流れの図と、それぞれのフィールド。
---

# basic の tags

`@yadeck/slide-components-basic`(basic プラグイン)が用意している Layout の一覧です。
最新の一覧は、deck リポジトリで `npm run schema` を実行して出る `.slide/deck.schema.json` が正です。各候補の `description` に用途が書かれています。

[デモの deck](../demo/sample.html){target="_blank"} と [レイアウト確認用の deck](../demo/panes.html){target="_blank"} で実物を見られます。

## slide

### tags なし(自動レイアウト)

tags を付けないページは、中身の数に応じて自動で配置されます。

- `heading` は上部の見出しになります。slide の `description` は見出しの下に 1 行で出ます
- テキスト系の block(tags なし / `body` / `list` / `quote` / `stat` / `item`)は、全部まとめて 1 つの区画(pane)になります
- `code` / `image` / `video` / `flow` は、1 つにつき 1 つの pane になります

| pane の数 | 配置 |
|---|---|
| 1 | 全面 |
| 2 | 左右 |
| 3 | ト型(左に 1 つ、右に 2 つ) |
| 4 | 十字(左右 2 つずつ) |
| 5 以上 | 左右 2 列に振り分け |

- テキストの pane は、1 行なら中央に大きく、2 行以上なら箇条書きになります
- コードは pane に収まる最大の文字サイズになり、同じページのコードは同じ大きさにそろいます。縦に積んだコードは、行数に応じて高さを分けます

```yaml
- - heading: 内容だけを書けば表紙になる
  - body: 見た目は Layout が決める
  - code: { lang: yaml, caption: "`header` の tags で表紙の Layout が選ばれる", $text: "- header:\n    title: 発表タイトル" }
```

### `header`(表紙)

| フィールド | 内容 |
|---|---|
| `title` | 発表タイトル(必須) |
| `subtitle` | 副題 |
| `author` / `affiliation` | 発表者名と所属。左下に出る |
| `event` / `date` | イベント名と日付。右下に出る |
| `logo` | ロゴ画像。右上に白抜きで出る |

### `profile`(自己紹介)

| フィールド | 内容 |
|---|---|
| `name` | 名前(必須) |
| `role` / `affiliation` | 肩書きと所属 |
| `photo` | 顔写真。無ければ名前の頭文字を出す |
| `accounts` | `{ x: id, github: id }` の形の SNS アカウント |

左に名前の欄、右に `items` の block が並びます。

### `section-header`(章扉)

`number`(章番号の文字列)と、`heading`、`body` を描きます。

### `two-column`(2 列の対比)

`left` を付けた block が左列、`right` を付けた block が右列に入ります。どちらも無い block は、列の上の前置きになります。
列ごとの見出しは `heading left` / `heading right` で書きます。

```yaml
- two-column:
    $items:
      - heading: 原稿とスライドは別もの
      - heading left: 原稿
      - body left: 話すことを全部書く
      - heading right: スライド
      - body right: 伝えたいことだけを見せる
```

### `card`(カード)

`item` の block をカードにして並べます。3 枚までは 1 行、4 枚は 2×2、5 枚以上は 3 列です。ほかの block はカードの上の前置きになります。

### `columns`(横に並べる)

pane を横 1 列に等分します。4 つまでは 1 行、5 つ以上は 3 列で折り返します。

`focus` で主役の列を指定すると、その列だけを他の列の黄金比倍(約 1.6 倍)の幅にします。2 列なら 38:62、3 列なら 28:28:45 です。番号は 1 始まりで、テキストはまとめて 1 つ、`code` / `image` / `video` / `flow` は 1 つずつ数えます。

```yaml
- columns:
    focus: 3                 # 3 つ目が主役
    $items:
      - heading: 書いたコードと、コンパイル後の中身
      - code: { lang: java, caption: 書いたソース, $text: "…" }
      - code: { lang: text, caption: 中間の形, $text: "…" }
      - code: { lang: text, caption: できあがったもの, $text: "…" }
```

### `main-left` / `main-right`(ト型とその逆)

1 つの区画を大きく置き、残りを反対側に縦に積みます。大きい側と積む側は黄金比(約 62:38)で分けます。

| tags | 大きく置く区画 | 残り |
|---|---|---|
| `main-left` | 最初の区画を左に | 右に縦に積む |
| `main-right` | 最後の区画を右に | 左に縦に積む |

どちらも、区画の並びは書いた順のまま、左から右へ読めます。説明や前提を左に置き、主役を右に見せたいときは `main-right` を使います。

## block

| tags | 内容 | 主なフィールド |
|---|---|---|
| なし | 本文 1 行。markdown 可 | |
| `heading` | 見出し | `level`(1〜4、既定 2) |
| `body` | 本文。複数行は段落になる | |
| `list` | 行ごとの箇条書き | `ordered`、`focus` |
| `code` | コード。highlight.js で色付けする | `lang`、`caption`、`focus` |
| `image` | 画像。pane にアスペクト比を保って収める。`text` はキャプション | `src`(必須)、`alt`、`width` |
| `video` | 動画。YouTube の URL は埋め込みに変換する | `url`(必須) |
| `flow` | 流れ(手順) | `steps`(必須)、`focus`、`direction` |
| `quote` | 引用 | `cite` |
| `stat` | 数字や固有名詞を大きく見せる | `value`(必須)、`label` |
| `item` | 並列の項目。`card` のページでカードになる | `title`(必須)、`logo` |
| `note` | 発表者ノート。画面と印刷には出ない | |

### `flow`(流れ)

段を順に並べ、段の間を矢印でつなぎます。

```yaml
- flow:
    direction: row          # row: 左から右、column: 上から下(既定)
    focus: [2, 3]
    steps:
      - { label: 原稿 }
      - { label: 構成, via: 組み立て, phase: ① 考えるとき, detail: 伝えたいことを決める }
      - { label: スライド, via: YAML, phase: ② 書くとき }
```

| 段のフィールド | 内容 |
|---|---|
| `label` | 段の名前(必須) |
| `via` | この段に入ってくる矢印のラベル(変換や処理の名前) |
| `phase` | この段が属する段階の名前 |
| `detail` | この段で起きることの一言 |

見せ方は block の tags で選びます。

| tags | 見せ方 |
|---|---|
| `flow` | 縦は STEP のラベルと縦のレール、横は番号付きの枠を › でつなぐ |
| `flow boxed` | 角丸の枠を縦に積み、点線と ▽ でつなぐ |
| `flow framed` | 全体を 1 つの枠で囲み、区切り線に ▽ を入れる |
| `flow grid` | 右端が矢印形のカードを 2 列に並べる。段が多いとき向け |
