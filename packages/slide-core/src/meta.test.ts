import { describe, expect, it } from "vitest";
import { escapeHtml } from "./document.js";
import { loadDeckFromYaml } from "./loader.js";
import { deckMetaTags, describeDeck, metaTagsHtml } from "./meta.js";

const yaml = `
- header: { title: 発表タイトル, subtitle: "**副題**です", author: 名前 }
- section-header: { $items: [{ heading: 本題 }] }
- - heading: "原稿と \`スライド\` は別もの"
  - body: 本文は説明に入れない
`;

describe("deck の meta タグ", () => {
  it("説明は表紙の副題と各ページの見出しから作る(markdown の記号は落とす)", () => {
    expect(describeDeck(loadDeckFromYaml(yaml))).toBe("副題です。本題 / 原稿と スライド は別もの");
  });

  it("meta.description があればそれを使い、120 文字で切る", () => {
    const deck = loadDeckFromYaml(`$meta: { description: "${"あ".repeat(200)}" }\n$slides: [本文]`);
    const d = describeDeck(deck);
    expect(Array.from(d)).toHaveLength(120);
    expect(d.endsWith("…")).toBe(true);
  });

  it("author は header から、image の相対パスは URL があるときだけ絶対 URL にする", () => {
    const deck = loadDeckFromYaml(`$meta: { image: ./og.png }\n$slides:\n${yaml.replace(/^/gm, "  ")}`);
    expect(deckMetaTags(deck).author).toBe("名前");
    expect(deckMetaTags(deck).image).toBeUndefined();
    expect(deckMetaTags(deck, "https://example.com/deck/talk.html").image).toBe("https://example.com/deck/og.png");
  });

  it("属性値をエスケープし、URL が無ければ canonical と og:url を出さない", () => {
    const html = metaTagsHtml({ title: 'a"b', description: "<x>" }, escapeHtml);
    expect(html).toContain('<meta property="og:title" content="a&quot;b">');
    expect(html).toContain('content="&lt;x&gt;"');
    expect(html).not.toContain("canonical");
    expect(html).toContain('<meta name="twitter:card" content="summary">');
  });
});
