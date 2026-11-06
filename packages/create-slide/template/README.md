# {{name}}

YADECK で作るスライド。

- `decks/*.yaml` にスライドを書く
- `src/` に自作プラグイン(React コンポーネント)を置き、`slide.config.ts` に登録する
- `npm run dev` で `http://localhost:3000/` にプレビュー。保存すると自動で再読込
- `npm run build` で `dist/*.html` を生成。ブラウザの印刷で PDF にできる
- `npm run check` で各スライドを Chromium で描画し、はみ出し・切れ・コードの縮みを検査する(`--deck <name> --slide <n> --png` で絞り込みと PNG 出力)
- `npm run png` で各スライドを `dist/png/<deck>/s09.png` に書き出す。初回は `npx playwright install chromium` が必要
- `theme.css` で色・フォント・文字サイズのトークンを上書きする(Tailwind v4 の `@theme`)。Layout の className には Tailwind の utility が使える
- 補完は `.slide/deck.schema.json`(build/dev で生成)。YAML 冒頭のコメントで参照する
