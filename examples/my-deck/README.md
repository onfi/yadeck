# my-deck

YADECK で作るスライド。

- `decks/*.yaml` にスライドを書く
- `src/` に自作プラグイン(React コンポーネント)を置き、`slide.config.ts` に登録する
- `npm run dev` で `http://localhost:3000/` にプレビュー。保存すると自動で再読込
- `npm run build` で `dist/*.html` を生成。ブラウザの印刷で PDF にできる
- `theme.css` で色・フォント・文字サイズのトークンを上書きする(Tailwind v4 の `@theme`)。Layout の className には Tailwind の utility が使える
- 補完は `.slide/deck.schema.json`(build/dev で生成)。YAML 冒頭のコメントで参照する
