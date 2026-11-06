# Getting started

deck 用のリポジトリを作り、最初のページをプレビューして、HTML に書き出すまでを通します。

## 必要なもの

- Node.js(24 で動作確認しています)
- npm
- PNG 書き出しと検査を使う場合は Chromium(後述の `npx playwright install chromium` で入ります)

## deck リポジトリを作る

```sh
npx @yadeck/create-slide my-deck
cd my-deck
npm install
```

::: warning npm への公開前
パッケージはまだ npm に公開していません。それまでは YADECK のリポジトリを手元に置き、`file:` で参照します。

```sh
git clone https://github.com/onfi/yadeck.git
cd yadeck && npm install && npm run build && cd ..
node yadeck/packages/create-slide/bin/create-slide.js my-deck
```

作られた `my-deck/package.json` の `@yadeck/*` を、次のように書き換えてから `npm install` します。

```json
"@yadeck/slide-components-basic": "file:../yadeck/packages/slide-components-basic",
"@yadeck/slide-core": "file:../yadeck/packages/slide-core",
"@yadeck/slide-schema": "file:../yadeck/packages/slide-schema"
```
:::

できあがるリポジトリの中身は次のとおりです。

```
my-deck/
├─ decks/sample.yaml      # スライドの data。ここに書く
├─ slide.config.ts        # 使うプラグイン、テーマ、フォントの設定
├─ theme.css              # 色・フォント・文字サイズのトークン
├─ src/t-theme.tsx        # 独自テンプレートの例
├─ AGENTS.md              # AI エージェント向けの案内(CLAUDE.md はこれへのリンク)
└─ .agents/skills/yadeck/SKILL.md   # スライド作成スキル
```

画像などの素材は、自分で `public/` を作って置きます。deck からは `./name.png` で参照できます。

## プレビューする

```sh
npm run dev
```

`http://localhost:3000/` に deck の一覧が出ます。`decks/` の YAML や `theme.css` を保存すると、ブラウザが自動で再読み込みします。

## 最初のページを書く

`decks/` に新しいファイルを作ります。1 行目のコメントで schema を指定すると、VS Code の YAML 拡張などで補完と検証が効きます。

```yaml
# yaml-language-server: $schema=../.slide/deck.schema.json
- header:
    title: はじめての YADECK
    subtitle: YAML で内容を書き、React で描く
    author: あなたの名前
- - heading: 内容と見た目を分けて書く
  - body: data には **何を伝えるか** だけを書く
  - list: |
      見出し・本文・コードを並べるだけ
      配置は tags と Layout が決める
- section-header:
    number: "01"
    $items:
      - heading: 本題
```

- 1 枚目は `header` の tags を付けた表紙です
- 2 枚目は tags の無いページで、中身に応じて自動で配置されます
- 3 枚目は `section-header` の章扉です

書き方の全体は [deck の書き方](/guide/writing)、使える tags は [basic の tags](/guide/basic) にあります。

## 書き出す

```sh
npm run build
```

`dist/<deck 名>.html` ができます。フォントも CSS も埋め込まれた HTML 1 ファイルで、`public/` の素材と一緒に置けばどこでも開けます。

- ブラウザで開き、印刷すると 16:9 の PDF になります
- `?mode=present` を付けると発表モードになります。詳しくは [発表・印刷・確認](/guide/present)

## 次に読む

- AI に書かせる: [AI スキルで作る](/guide/ai-skill)
- 色やフォントを変える: [テーマ・フォント・画像](/guide/theme)
- 1 ページを作り込む: [独自テンプレート](/guide/custom-template)
