# AGENTS.md

このリポジトリは YADECK のスライド(deck)。`decks/*.yaml` が data、`src/` が自作プラグイン、`theme.css` がテーマ。

- スライドの追加・編集は skill `yadeck`(`.agents/skills/yadeck/SKILL.md`)の原則と手順に従う。Claude Code / Codex / Antigravity それぞれの skill ディレクトリから同じファイルを参照している
- `npm run dev` でプレビュー(http://localhost:3000/)、`npm run build` で `dist/*.html`、`npx yadeck validate` で data の検証、`npm run schema` で使える tags とフィールドの一覧(`.slide/deck.schema.json`)を生成
- 見た目の変更はツール側(`@yadeck/slide-components-basic`)か `src/` のプラグインで行い、data に見た目の情報を足さない
- skill を最新にするには `npx skills add onfi/yadeck --skill yadeck -y`(既存の skill を上書きする。一度これで入れた後は `npx skills update yadeck` でもよい)。YADECK のドキュメントは https://onfi.github.io/yadeck/
