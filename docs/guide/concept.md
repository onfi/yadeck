# YADECK とは

YADECK は、AI と一緒にスライドを作ることを前提にしたスライドジェネレータです。
**内容は AI が schema 付きの YAML に書き、作り込みたいページだけを人が JSX で作り込む**、という分担を両立させます。

## なぜ作ったか

スライドを作る道具は、大きく 2 つに分かれます。

| 道具 | 得意なこと | 苦手なこと |
|---|---|---|
| Markdown からスライドを作るツール | 内容をすばやく書ける。AI にも書かせやすい | アニメーションや、1 ページだけの凝った見せ方 |
| フルスクラッチの HTML / プレゼンアプリでの作り込み | どんな見せ方でもできる | AI が「何を書くか」と「どう見せるか」を毎回一緒に考えることになる |

AI に任せたいのは、主に「何を伝えるか」を組み立てる部分です。
ところが作り込みのできる道具では、内容と見た目が同じファイルに混ざります。AI は内容を変えるたびに、レイアウトや CSS まで考え直さなければなりません。
逆に Markdown 系の道具では、AI は内容を書きやすい代わりに、作り込みたいページで手が止まります。

YADECK はこの 2 つを分けます。

- **data(YAML)は「何を伝えるか」だけを持つ。** 見出し、本文、コード、画像、流れの各段といった内容と、「これは表紙」「これは 2 列で比べる」といった種類を表す `tags` だけを書きます。色や位置は書きません。
- **view(React)が見た目を決める。** `tags` に合う Layout コンポーネントが選ばれて描画されます。
- **作り込みたいページは、そのページ用の Layout を JSX で書く。** data 側は新しい `tags` を 1 つ付けるだけで、書き方は変わりません。Layout は普通の React コンポーネントなので、チャートや three.js の 3D など、npm で配られているコンポーネントをそのまま import して使えます。

使える `tags` とフィールドは JSON Schema に出力されます。AI はこの schema を見て、迷わずに内容を書けます。
人は、AI が書いた内容を見ながら、作り込みたいページの JSX にだけ時間を使えます。

## 仕組みの全体像

```
decks/talk.yaml ──(読み込み・sugar 展開)──▶ deck / slide / block の木
                                               │
                     tags で Layout を解決 ◀───┘
                     (DI コンテナ)
                                               │
slide.config.ts の plugins ───▶ Layout(React)──▶ 静的 HTML
```

### data は 3 段の木

deck(発表全体)の下に slide(ページ)、slide の下に block(見出し・本文・コードなどの部品)が並びます。
どの段のノードも `tags` を持ち、`tags` が唯一の分岐キーです。

```yaml
- header: { title: 発表タイトル, author: 名前 }   # tags: [header] の slide
- - heading: 結論を 1 文で                        # tags なしの slide に block を 3 つ
  - body: 説明の本文
  - code: { lang: java, $text: "System.out.println();" }
```

### tags で Layout が選ばれる

プラグインは「この Interface のこの tags には、この Layout を使う」と DI コンテナに登録します。
描画時には、ノードの `tags` に最もよく一致する Layout が選ばれます。
一致するものが無くても、tags なしの既定 Layout で必ず描画されます。

```tsx
c.bind(SlideLayout, ["header"], HeaderSlide, { type: headerType, description: "表紙" });
```

詳しい規則は [tags の解決規則](/reference/resolution) にあります。

### schema が AI の手がかりになる

`bind` に渡したフィールドの型(zod)と説明は、`.slide/deck.schema.json` にまとめて出力されます。
エディタではこれで補完と検証が効き、AI はこれを読んで使える `tags` とフィールドを知ります。

## 構成するパッケージ

| パッケージ | 役割 |
|---|---|
| `@yadeck/slide-schema` | deck / slide / block の基底スキーマと、Layout の Interface(`DeckLayout` / `SlideLayout` / `BlockLayout`) |
| `@yadeck/slide-core` | YAML の読み込み、検証、DI コンテナ、描画、JSON Schema の出力、CLI(`yadeck`) |
| `@yadeck/slide-components-basic` | 標準の Layout 一式(basic プラグイン)。表紙、章扉、自動レイアウト、コード、流れなど |
| `@yadeck/create-slide` | deck 用のリポジトリを作る雛形 |

## 次に読む

- 手を動かして試すなら [Getting started](/guide/getting-started)
- AI に書かせるなら [AI スキルで作る](/guide/ai-skill)
- 1 ページを作り込むなら [独自テンプレート](/guide/custom-template)
