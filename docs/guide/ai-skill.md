# AI スキルで作る

deck リポジトリには、スライドの追加・編集の進め方を書いたエージェント用のスキル `yadeck` が入っています。
Claude Code、Codex、Antigravity のどれからでも同じスキルを使えます。

## スキルを使うと何が楽になるか

- **原稿から 1 ページずつ起こせる。** 話す原稿を渡して「次のページ」と言うと、該当する範囲を読み、このページで何を伝えるかから組み立てて提案します
- **選ぶだけで決められる。** 見出し、見せ方、画面に出す文面を、推奨を先頭にした候補で聞いてきます。Claude Code では選択 UI に画面のプレビューが付きます。候補から選んでも、直接「見出しはこれ」と指示してもかまいません
- **内容と見た目を混ぜない。** AI は schema にある tags とフィールドだけで内容を書きます。欲しい見せ方の Layout が無ければ、data を曲げずに「その Layout は無い」と報告します
- **書いたら自分で確かめる。** `yadeck validate` と `yadeck check` で、フィールドの誤りとはみ出しを確かめてから報告します

## スキルを入れる

### 雛形で作った deck リポジトリ

`create-slide` で作った deck リポジトリには、最初からスキルが入っています。

| パス | 読むエージェント |
|---|---|
| `.agents/skills/yadeck/SKILL.md` | 正本。Codex、Antigravity |
| `.claude/skills/yadeck` | Claude Code(正本へのリンク) |
| `.agent/skills/yadeck` | 正本へのリンク |
| `AGENTS.md` / `CLAUDE.md` | リポジトリの案内(`CLAUDE.md` は `AGENTS.md` へのリンク) |

シンボリックリンクを作れない環境では、雛形の作成時にコピーになります。

### 既存のリポジトリに入れる・更新する

[skills](https://github.com/vercel-labs/skills) の CLI で、GitHub から直接入れられます(Node.js 22.20 以上が必要です)。

```sh
# deck リポジトリの直下で実行する。使っているエージェントは自動で検出される
npx skills add onfi/yadeck --skill yadeck

# エージェントを指定し、確認なしで入れる
npx skills add onfi/yadeck --skill yadeck -a claude-code -a codex -a antigravity -y
```

- 正本は `.agents/skills/yadeck/` に置かれ、Codex と Antigravity はここを読みます。Claude Code 用には `.claude/skills/yadeck` にリンクが作られます
- 入れた記録が `skills-lock.json` に残ります。スキルのファイルと一緒にコミットしておくと、チームで同じ版を使えます
- `-g` を付けると、プロジェクトではなくホームディレクトリに入り、すべてのリポジトリで使えます

YADECK を更新したら、スキルも更新します。

```sh
npx skills check                 # 更新があるかを確かめる
npx skills update yadeck    # 更新する
npx skills list                  # 入っているスキルの一覧
```

雛形で作ったリポジトリのスキルは CLI の記録(`skills-lock.json`)に無いので、`update` では更新されません。最初の 1 回は `add` で入れ直します。既存のスキルは上書きされ、以後は `update` で更新できます。

```sh
npx skills add onfi/yadeck --skill yadeck -a claude-code -a codex -a antigravity -y
```

### 手で置く

CLI を使わない場合は、[SKILL.md](https://github.com/onfi/yadeck/blob/main/packages/create-slide/template/_agents/skills/yadeck/SKILL.md) を deck リポジトリの `.agents/skills/yadeck/SKILL.md` に置き、Claude Code 用に `.claude/skills/yadeck` からリンクします。

## 呼び出し方

deck リポジトリでエージェントを起動し、次のように頼みます。Claude Code では `/yadeck` でも呼べます。

```
talk.md の原稿から、decks/talk.yaml に表紙と自己紹介を作って
次のページ
このページ、コードじゃなくて流れの図にして
```

## スキルの進め方

1. **deck リポジトリかを確かめる。** `slide.config.ts` と `@yadeck/slide-core` の依存があるかを見ます
2. **schema を確かめる。** `.slide/deck.schema.json` を読み、使える tags とフィールドを知ります。古ければ作り直します
3. **対象を決める。** どの deck のどの位置に書くかと、渡された原稿の該当範囲を確かめます
4. **内容を提案して合意を取る。** 下の順で組み立て、1 問ずつ候補を添えて確認します
5. **書いて確かめる。** YAML を書き、`validate` と `check` を通してから、書いた内容を報告します

### 内容の組み立て方

スキルは、載せる情報から考えず、次の順で組み立てます。

1. **why: このページで何を伝えるか、聴衆は何を知っている前提か。** 前提と結論の間を埋めるのがページの役目です。伝えたいことの 1 文が見出しになります
2. **how: 構成の類型を選ぶ。** 「配置 × 主役」で決めます。主役はコードや画面などの現物、図解、数字、列挙、手順など。配置は単独、説明＋主役、対比、分割などです
3. **what: 類型の枠に中身を埋める。** 前提から結論への道筋を辿る語句だけを置き、主役の中で見てほしい箇所を `focus` で指定します。理由づけや例え話は `note` に回します

入力の形によって進め方を変えます。

| 渡すもの | スキルの動き |
|---|---|
| 原稿やメモ | 該当範囲から伝えたいことを読み取り、上の順で組み立てる |
| 何も無い | 伝えたいことから順に、候補を出して相談しながら決める |
| はっきりしたイメージ | 書かれた内容をそのまま写し、指示された見せ方を tags に対応付ける |
| 既存のスライド | 1 ページずつ、内容を変えずに data に写す |

## 上手に使うコツ

- **1 ページずつ進める。** まとめて作らせるより、1 ページごとに合意して進めるほうが、結果的に手戻りが減ります
- **中身が決まってから見た目を見る。** 見た目の問題は Layout の問題なので、data をいじって合わせず、テンプレートを直します
- **知らない用語は現物で見せる。** 聴衆が知らない仕組みを説明するページは、知っているもの(ソースなど)と仕組みの現物を並べるよう頼むと伝わりやすくなります
- **作り込みたいページは JSX にする。** スキルが「その見せ方の Layout は無い」と言ったら、[独自テンプレート](/guide/custom-template) を書くタイミングです
