import { describe, expect, it } from "vitest";
import { DeckLayout, SlideLayout, BlockLayout, type DeckNode } from "@yadeck/slide-schema";
import { Container } from "./container.js";
import { loadDeckFromYaml } from "./loader.js";
import { normalizeSource, Slide } from "./react.js";
import { renderDeck } from "./render.js";
import { validateDeck } from "./validate.js";

const Nop = () => null;
const container = new Container()
  .bind(DeckLayout, [], ({ slides }: DeckNode) => <main>{slides.map((s) => <Slide key={s.id} data={s} />)}</main>)
  .bind(SlideLayout, [], Nop)
  .bind(BlockLayout, [], Nop);

describe("normalizeSource", () => {
  it("URL だけなら、スキームと www と末尾の / を除いて題名にする", () => {
    expect(normalizeSource("https://www.example.com/docs/")).toEqual({ title: "example.com/docs", url: "https://www.example.com/docs/" });
  });

  it("URL でない文字列は題名だけ、オブジェクトはそのまま", () => {
    expect(normalizeSource("社内資料")).toEqual({ title: "社内資料" });
    expect(normalizeSource({ title: "JLS §8.8.9", url: "https://x.test/" })).toEqual({ title: "JLS §8.8.9", url: "https://x.test/" });
  });
});

describe("出典", () => {
  it("slide の sources をページの下端にリンク付きで描く", () => {
    const deck = loadDeckFromYaml(`
- sources:
    - { title: 仕様, url: "https://x.test/spec" }
    - 社内資料
  $items: [本文]
- - 出典なし
`);
    const html = renderDeck(deck, { container });
    expect(html).toContain(
      '<ol class="yd-sources"><li title="仕様\nhttps://x.test/spec"><a href="https://x.test/spec" target="_blank" rel="noopener noreferrer">仕様</a></li><li title="社内資料">社内資料</li></ol>',
    );
    expect(html.match(/yd-sources/g)).toHaveLength(1);
  });

  it("9 件以上は検証で拒否する", () => {
    const ok = loadDeckFromYaml(`- sources: [${Array.from({ length: 8 }, (_, i) => `s${i}`).join(", ")}]\n  $items: [x]`);
    const ng = loadDeckFromYaml(`- sources: [${Array.from({ length: 9 }, (_, i) => `s${i}`).join(", ")}]\n  $items: [x]`);
    expect(validateDeck(container, ok)).toEqual([]);
    expect(validateDeck(container, ng)).toEqual([{ path: "s1.sources", message: expect.any(String) }]);
  });
});
