---
description: YADECK の deck(YAML)の書き方。deck・slide・block の 3 段の構造、省略記法、description、発表者ノート、focus での焦点の指定、検証の方法。
---

# deck の書き方

deck は `decks/` に置いた YAML(または JSON)です。ファイル名がそのまま出力の HTML 名になります。

## 3 段の構造

| 段 | 役割 | 子のキー |
|---|---|---|
| deck | 発表全体。ファイル 1 つが 1 deck | `slides` |
| slide | 1 ページ | `items` |
| block | 見出し・本文・コード・画像などの部品。末端 | なし |

どの段のノードも `tags`(文字列の配列)を持ちます。`tags` は「これは何か」を表す唯一の手がかりで、Layout はこれを見て選ばれます。
block は本文の `text` を持てます。ほかのフィールドは、選ばれる Layout が決めます(例: `code` の `lang`)。

## 省略記法(sugar)

正規形で書くと長くなるので、YAML では次の省略ができます。

```yaml
# yaml-language-server: $schema=../.slide/deck.schema.json
- header:                       # 単一キーの map: キーが tags になる
    title: 発表タイトル
- - heading: 見出し               # 配列: tags の無いノードで、要素が子になる
  - 文字列は tags の無い block     # 文字列: block の text
  - body: "**markdown** が使える"  # 単一キーの map で値が文字列: その tags の block
  - code:                         # 単一キーの map で値が map: その tags の block とフィールド
      lang: java
      $text: |
        System.out.println("hello");
- section-header:
    number: "01"
    $items:                       # フィールドと子を両方書くときは $items
      - heading: 本題
- 文字列 1 つだけのページ          # 上の段に文字列を置くと、tags の無い slide + block になる
```

規則は段によらず同じです。

- **配列**は、tags の無いノードになり、要素がその子になります
- **文字列**は、block の `text` になります。slide の位置に置くと、tags の無い slide に block を 1 つ入れたものになります
- **単一キーの map** `{ K: V }` は、`K` を空白で区切ったものが tags になります(`flow boxed` なら tags は `[flow, boxed]`)
  - `V` が map ならフィールド、配列なら子、文字列なら `text` です
- **構造を表すキー**は `$` を付けて書きます: `$tags` `$slides` `$items` `$text` `$meta` `$version`
  - `$` が付いたキーは tags 名と見なされないので、フィールドと子を同時に書けます

### フル記述

省略記法を使わずに書くこともできます。発表全体の情報(`meta`)を付けたいときはこの形にします。

```yaml
$meta:
  title: 発表タイトル        # 省略すると header の title、無ければファイル名
  description: 検索結果や SNS のカードに出す説明   # 省略すると内容から作る
  image: ./og.png            # SNS のカードの画像。URL か、siteUrl からの相対パス
$slides:
  - $tags: [two-column]
    description: 比べると違いが分かる
    $items:
      - { $tags: [heading], $text: 2 つの書き方 }
      - { $tags: [body, left], $text: 左の内容 }
      - { $tags: [body, right], $text: 右の内容 }
```

### 検索と SNS 向けの情報

build した HTML には、検索結果や SNS のカードに使われる meta タグ(description、OGP、Twitter カード)が入ります。

- **説明文**: `meta.description` があればそれを使います。無ければ、表紙の副題と各ページの見出しをつないで作ります(120 文字まで)
- **作者**: `meta.author`、無ければ表紙の `author` です
- **URL と画像**: `slide.config.ts` の `siteUrl` に公開先を書くと、canonical と og:url が入り、`meta.image` の相対パスが絶対 URL になります

## slide 共通のフィールド

| フィールド | 内容 |
|---|---|
| `$id` | ページの名前。URL の `#名前`、`yadeck check --slide 名前` で指せる。ページを足し引きしても変わらない |
| `description` | 見出しの下に添える 1 行の説明。そのページが何を示すかを短く書く |
| `sources` | ページの下端に小さく出す出典(8 件まで)。URL の文字列か、`{ title, url }` |

これらと子(`$items`)を両方書くときは、次のどちらかの形にします。

```yaml
- description: 原稿をそのままスライドにはしない           # tags の無い slide
  $items:
    - heading: 原稿とスライドの間には 3 つの段階がある
- card:                                                   # tags のある slide
    description: 1 ページで伝えることは 1 つにする
    $items:
      - heading: 伝わるページには型がある
```

### ページの名前(`$id`)

ページは、右下のページ番号(URL の `#s9`)でも指せます。ただし、前にページを足すと番号がずれます。後から何度も手を入れるページには、`$id` で名前を付けておくと、ページを足し引きしても同じ名前で指せます。

```yaml
- $id: three-stages
  description: 原稿とスライドの間には 3 つの段階がある
  $items:
    - heading: 原稿をそのままスライドにはしない
```

- URL は `deck.html#three-stages`。`#s9` の形もそのまま使えます
- `yadeck check --slide three-stages` で、そのページだけを検査できます。結果には `#three-stages (p.9)` のように、名前とページ番号の両方が出ます
- 名前に空白と `#` は使えません。`s9` のようにページ番号と同じ形の名前と、重複した名前は検証でエラーになります

### 出典(`sources`)

ページの下端の余白に、小さく薄く出典を出します。リンクは新しいタブで開きます。1 行に 4 件まで並び、8 件で 2 行になります。長い題名は省略記号で切れます(マウスを乗せると全体が見えます)。

```yaml
- description: デフォルトコンストラクタは javac が足している
  sources:
    - { title: "JLS §8.8.9 Default Constructor", url: "https://docs.oracle.com/javase/specs/jls/se25/html/jls-8.html#jls-8.8.9" }
    - https://openjdk.org/jeps/484          # URL だけなら、URL を題名にする
    - 社内の設計資料                          # URL の無い出典
  $items:
    - heading: 書いていないコンストラクタがある
```

`yadeck check` は出典を検査しません(下端の余白に置き、長い題名を切る前提のため)。

## テキストの書式(RichText)

block の `text` や多くのフィールドは、markdown と一部の HTML が使えます。出力時に必ず sanitize されます。

```yaml
- body: "**強調** と `コード` と [リンク](https://example.com)"
```

`slide.config.ts` の `richText` で、markdown や HTML を無効にできます。

## 発表者ノート

`note` の block は、画面にも印刷にも出ません。発表者モードにだけ表示されます。

```yaml
- - heading: 結論
  - body: 内容
  - note: |
      ここで話す内容。原稿をそのまま貼ってよい
```

## 焦点(focus)

ページの中で特に見てほしい箇所を、data で指定できます。指定した箇所以外は薄くなります。

```yaml
- code:
    lang: yaml
    focus: "title"              # 行番号、"6-8" の範囲、行に含まれる文字列。配列で複数可
    $text: |
      - header:
          title: 発表タイトル
          author: 名前
- list:
    focus: 2                    # 2 番目の項目
    $text: |
      項目 1
      項目 2
```

`focus` は見た目の指定ではなく、「このページの主張はここにある」という内容の指定です。どう目立たせるかは Layout が決めます。

## 検証

```sh
npx yadeck validate
```

tags に応じた Layout のフィールドの型で、deck 全体を検証します。知らないフィールドや型の違いはエラーになります。
`build` と `dev` でも同じ検証が走ります。
