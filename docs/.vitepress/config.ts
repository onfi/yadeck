import { defineConfig } from "vitepress";

// GitHub Pages のプロジェクトサイトは /<repo>/ 配下になるので、公開時に DOCS_BASE で渡す
const base = process.env.DOCS_BASE ?? "/";

/** 公開先。canonical、og:url、サイトマップの絶対 URL に使う */
const SITE_URL = "https://onfi.github.io/yadeck/";
const SITE_NAME = "YADECK";
const SITE_DESCRIPTION =
  "YADECK は AI ファーストのスライドジェネレータ。AI が schema 付きの YAML に内容を書き、作り込みたいページだけを JSX で作る。静的 HTML 1 つで発表、印刷、PNG まで。";

/** docs/guide/writing.md → https://onfi.github.io/yadeck/guide/writing(cleanUrls に合わせる) */
function pageUrl(relativePath: string): string {
  const path = relativePath.replace(/(^|\/)index\.md$/, "$1").replace(/\.md$/, "");
  return new URL(path, SITE_URL).href;
}

export default defineConfig({
  lang: "ja",
  title: "YADECK",
  description: SITE_DESCRIPTION,
  base,
  cleanUrls: true,
  lastUpdated: false,
  sitemap: { hostname: SITE_URL },
  head: [
    ["meta", { name: "author", content: "onfi" }],
    ["meta", { property: "og:site_name", content: SITE_NAME }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:locale", content: "ja_JP" }],
    ["meta", { name: "twitter:card", content: "summary" }],
  ],
  // ページごとの OGP と canonical。説明文は各ページの frontmatter の description に書く
  transformHead({ pageData, title, description }) {
    const url = pageUrl(pageData.relativePath);
    return [
      ["link", { rel: "canonical", href: url }],
      ["meta", { property: "og:title", content: title }],
      ["meta", { property: "og:description", content: description }],
      ["meta", { property: "og:url", content: url }],
      ["meta", { name: "twitter:title", content: title }],
      ["meta", { name: "twitter:description", content: description }],
    ];
  },
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
