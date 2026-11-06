import { defineConfig } from "vitepress";

// GitHub Pages のプロジェクトサイトは /<repo>/ 配下になるので、公開時に DOCS_BASE で渡す
const base = process.env.DOCS_BASE ?? "/";

export default defineConfig({
  lang: "ja",
  title: "YADECK",
  description: "AI が内容を書き、人が作り込みたいページだけを JSX で作るスライドジェネレータ",
  base,
  cleanUrls: true,
  lastUpdated: false,
  themeConfig: {
    nav: [
      { text: "ガイド", link: "/guide/concept" },
      { text: "リファレンス", link: "/reference/cli" },
      { text: "デモ", link: "/demo/sample.html", target: "_blank" },
    ],
    sidebar: [
      {
        text: "はじめに",
        items: [
          { text: "YADECK とは", link: "/guide/concept" },
          { text: "Getting started", link: "/guide/getting-started" },
        ],
      },
      {
        text: "スライドを書く",
        items: [
          { text: "deck の書き方", link: "/guide/writing" },
          { text: "basic の tags", link: "/guide/basic" },
          { text: "テーマ・フォント・画像", link: "/guide/theme" },
          { text: "発表・印刷・確認", link: "/guide/present" },
          { text: "公開する", link: "/guide/deploy" },
          { text: "AI スキルで作る", link: "/guide/ai-skill" },
        ],
      },
      {
        text: "作り込む",
        items: [
          { text: "独自テンプレート", link: "/guide/custom-template" },
          { text: "npm のコンポーネントを使う", link: "/guide/client" },
          { text: "プラグイン開発", link: "/guide/plugin" },
        ],
      },
      {
        text: "リファレンス",
        items: [
          { text: "CLI", link: "/reference/cli" },
          { text: "slide.config.ts", link: "/reference/config" },
          { text: "tags の解決規則", link: "/reference/resolution" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/onfi/yadeck" }],
    editLink: { pattern: "https://github.com/onfi/yadeck/edit/main/docs/:path", text: "このページを GitHub で編集" },
    outline: { level: [2, 3], label: "このページ" },
    docFooter: { prev: "前へ", next: "次へ" },
    darkModeSwitchLabel: "表示",
    sidebarMenuLabel: "メニュー",
    returnToTopLabel: "先頭へ",
    search: { provider: "local" },
  },
});
