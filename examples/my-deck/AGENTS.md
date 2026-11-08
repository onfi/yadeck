# AGENTS.md

このリポジトリは YADECK のスライド(deck)です。YADECK は、data(YAML)に「何を伝えるか」だけを書き、見た目は view(React の Layout)が決めるスライドジェネレータです。

- ドキュメント: https://onfi.github.io/yadeck/
- スライドの追加・編集の手順: skill `yadeck`(`.agents/skills/yadeck/SKILL.md`)。Claude Code / Codex / Antigravity のどれからも同じファイルを読む

## 構成

| パス | 中身 |
|---|---|
| `decks/*.yaml` | スライドの data。1 ファイルが 1 deck で、ファイル名が出力の HTML 名になる |
| `slide.config.ts` | 使うプラグイン、テーマ、フォント、公開先の URL などの設定 |
| `theme.css` | 色・フォント・文字サイズのトークン(Tailwind v4 の `@theme`) |
| `src/` | このリポジトリだけで使う Layout(独自テンプレート) |
| `public/` | 画像などの素材。deck からは `./name.png` で参照する |
| `.slide/deck.schema.json` | 使える tags とフィールドの一覧。`npm run schema` で作る。手で編集しない |
| `dist/` | build の出力。手で編集しない |

## コマンド

| コマンド | 使いどころ |
|---|---|
| `npm run dev` | プレビュー(http://localhost:3000/)。保存すると自動で再読み込み |
| `npx yadeck validate` | data を書いたら必ず。知らないフィールドや型の誤りを見つける |
| `npm run schema` | 使える tags とフィールドを確かめたいとき。`src/` を変えたとき |
| `npx yadeck check --deck <deck> --slide <n> --png` | 書いたページの見た目の検査。`n` は右下のページ番号か、`$id` で付けた名前 |
| `npx yadeck png --deck <deck>` | 全ページを `dist/png/<deck>/s09.png` に書き出す |
| `npm run build` | 公開用の `dist/*.html` を作る |

## 作業の約束

- **1 ページずつ、中身の合意を先に取る。** YAML に書く前に、見出し・説明・画面に出す文面やコードを、そのまま見せて確認する。ビルドや見た目の確認は中身が決まってから。候補は推奨を先頭に出し、利用者が選んでも直接指示してもよい形にする
- **data に見た目を書かない。** 色・位置・大きさのフィールドを足さない。`focus` は「このページで一番見てほしいもの」という中身の指定なので使ってよい
- **見せ方は tags で選ぶ。** 欲しい見せ方の Layout が無ければ、data を曲げて近い見た目にせず、「その Layout は無い」と報告する(下の「見せ方が足りないとき」)
- **入力に無いものを補わない。** 原稿やメモに無い数値・名前・文を足さない。要るなら聞く
- **原稿は `note` にそのまま入れる。** 話す文は画面に載せず、発表者モードのノートに回す
- **ページは名前で指す。** 何度も手を入れるページには `$id` で名前を付ける(URL の `#名前`、`check --slide 名前`)。ページ番号は前にページを足すとずれる
- **事実には出典を付ける。** 仕様・数値・引用・コマンドの出力を載せたページは、`sources` に一次資料の URL を書く。実在を確かめた URL だけを書く
- **確認は `yadeck check` で行う。** error(はみ出し・切れ)は直してから見せる。warn(余白への食い込み、コードの縮み・折り返し)は報告に添える。目で確かめるときは書き出した PNG を読み、ブラウザ操作のツールでスクリーンショットを撮らない

## ページの組み立て方

skill `yadeck` の手順に従う。要点は次のとおり。

- **why → how → what の順に考える。** 載せる情報から考え始めない
  - why: このページで聴衆に伝えたいことを 1 文にする(これが見出し)。聴衆がこの時点で知っていること(前提)も決める
  - how: 構成の型を「配置 × 主役」で選ぶ。1 ページ 1 点
  - what: 前提から結論への道筋を辿る語句だけを置く
- **見出しは主張にする。** 話題名ではなく、聴衆が持ち帰る 1 文。表紙・章扉だけは役割(タイトル・章名)が見出しになる
- **ほとんどのページに `description` を付ける。** 見出しの下に、そのページが何を示すかを 1 行で。表紙・自己紹介・章扉・一言のページには付けない
- **結論を文字で繰り返さない。** 主役(コードの実物、図)に語らせ、見てほしい箇所を `focus` で指定する
- **聴衆が知らない用語は現物で見せる。** 知っているもの(ソースなど)と、その用語の現物を並べる。説明だけで済ませない
- **仕組みの説明は、後のページで使う前に置く。** 後で「〜に差し込む」と言うなら、その「〜」が何かを先のページで見せておく

## 見せ方の選び方(basic の tags)

| 伝えたいこと | tags |
|---|---|
| 発表のタイトル / 自己紹介 / 章の区切り | `header` / `profile` / `section-header` |
| 一言だけ | tags なしで本文 1 行(中央に大きく出る) |
| 説明と主役(コード・画像)を並べる | tags なし(中身の数で自動配置。2 つなら左右) |
| 主役を大きく、補助を小さく | `main-right`(主役を最後に書くと右に大きく)/ `main-left`(主役を最初に書くと左に大きく) |
| 2 つを比べる | `two-column`(`left` / `right` を付けた block を左右に) |
| 並列の項目 3〜4 つ | `card`(`item` をカードに)/ `columns` |
| 横に並べたまま 1 つを目立たせる | `columns` + `focus`(主役の列だけ黄金比倍の幅) |
| 手順・段階 | `flow`(縦)/ `flow` + `direction: row`(横)/ `flow boxed` / `flow framed` / `flow grid` |
| 数字や固有名詞を大きく | `stat` |
| 引用 | `quote` |

## コードを載せるとき

- **実物を載せる。** コマンドの出力(`javap` など)やライブラリが生成するものは、実際に実行して得た結果を貼る。それらしく作らない
- **1 行を短くする。** 同じページのコードは同じ文字サイズにそろうので、1 つでも長い行があると全部が小さくなる。目安は、画面の半分の幅で 40 字、3 等分で 30 字。改行位置は変えてよいが、中身は変えない
- **`check` の warn を見る。** 「下限の 14px まで縮んでいる」「行が折り返している」が出たら、行を短くするか、`main-right` / `columns` + `focus` で主役の幅を広げる
- **見てほしい行は `focus` で指定する。** 行番号、`"6-8"` の範囲、行に含まれる文字列で書ける

## 図や画像

- `public/` に置いて `image` で参照する。外部の画像は URL でもよい
- 図を SVG で描くときは、テーマの色(primary / accent / ink / muted)を使い、文字は要素のラベルだけにする
- 頻度や割合を伝えたいときは、個数で描かない(4 台のうち 1 台を赤くすると「1/4」に見える)。繰り返しを並べ、その中の 1 つとして描く

## 見せ方が足りないとき

- `src/` に Layout(React コンポーネント)を書き、`definePlugin` で tags に bind して `slide.config.ts` の `plugins` に足す。data の書き方は変わらない
- `bind` の `description` には、見た目より先に「どういう内容のページで使うか」を書く。schema に出て、エージェントが tags を選ぶ手がかりになる
- 意図して枠の外へ出す装飾には `aria-hidden="true"` を付ける(`check` の対象から外れる)
- チャートや three.js など、npm の React コンポーネントもそのまま import して使える。ブラウザで動かす必要があるものは `bind` に `client: true` を付ける
- 詳しくは https://onfi.github.io/yadeck/guide/custom-template と https://onfi.github.io/yadeck/guide/client

## 発表と公開

- `deck.html?mode=presenter` で発表者モード(今と次のページ、ノート、タイマー)。`L` でレーザーポインタ、`B` で暗転
- 公開先が決まったら `slide.config.ts` の `siteUrl` に書く(canonical と OGP の URL が入る)。説明文を整えたいときは deck の `$meta.description` に書く
- 公開方法(GitHub Pages / Cloudflare)は https://onfi.github.io/yadeck/guide/deploy

## 更新

- YADECK: `npm update @yadeck/slide-core @yadeck/slide-components-basic`
- skill: `npx skills add onfi/yadeck --skill yadeck -y`(既存の skill を上書きする。一度これで入れた後は `npx skills update yadeck` でもよい)
