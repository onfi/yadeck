import { describe, expect, it } from "vitest";
import { z } from "zod";
import { BlockLayout, DeckLayout, SlideLayout } from "@yadeck/slide-schema";
import { Container } from "./container.js";
import { emitJsonSchema } from "./jsonschema.js";
import { loadDeckFromYaml } from "./loader.js";
import { renderRichText } from "./richtext.js";
import { validateDeck } from "./validate.js";

const Nop = () => null;

const container = new Container()
  .bind(DeckLayout, [], Nop)
  .bind(SlideLayout, [], Nop)
  .bind(SlideLayout, ["section-header"], Nop, { type: z.object({ number: z.string() }) })
  .bind(BlockLayout, [], Nop)
  .bind(BlockLayout, ["image"], Nop, { type: z.object({ src: z.string(), width: z.number().optional() }) });

describe("validateDeck", () => {
  it("各段の type で再帰的に検証し、位置付きで問題を返す", () => {
    const deck = loadDeckFromYaml(`
- section-header:
    $items:
      - image: { $text: cap }
      - body: ok
- - image: { src: a.png, width: "wide" }
`);
    expect(validateDeck(container, deck)).toEqual([
      { path: "s1.number", message: expect.stringContaining("expected string") },
      { path: "s1-b0.src", message: expect.stringContaining("expected string") },
      { path: "s2-b0.width", message: expect.stringContaining("expected number") },
    ]);
  });

  it("type に無いフィールドは拒否する", () => {
    const deck = loadDeckFromYaml(`- section-header: { number: "1", color: red }`);
    expect(validateDeck(container, deck)).toEqual([{ path: "s1", message: expect.stringMatching(/color/) }]);
  });

  it("正しい deck は問題なし", () => {
    const deck = loadDeckFromYaml(`
$meta: { title: T, anything: ok }
$slides:
  - section-header: { number: "1", $items: [{ image: { src: a.png } }, plain] }
`);
    expect(validateDeck(container, deck)).toEqual([]);
  });
});

describe("renderRichText", () => {
  it("markdown を解釈し、1行はインラインとして段落で包まない", () => {
    expect(renderRichText("a **b**")).toBe("a <strong>b</strong>");
    expect(renderRichText("a\n\nb")).toBe("<p>a</p>\n<p>b</p>");
  });

  it("html は通すが常に sanitize する", () => {
    expect(renderRichText(`<b onclick="x()">t</b><script>alert(1)</script>`)).toBe("<b>t</b>");
  });

  it("html=false なら生 HTML をエスケープする", () => {
    expect(renderRichText("<b>t</b> *i*", { html: false })).toBe("&lt;b&gt;t&lt;/b&gt; <em>i</em>");
  });

  it("markdown=false なら記法をそのまま残す", () => {
    expect(renderRichText("a **b**", { markdown: false })).toBe("a **b**");
  });
});

describe("emitJsonSchema", () => {
  it("各段を anyOf で合成し、Layout の tags を contains で表す", () => {
    const schema = emitJsonSchema(container) as { $defs: Record<string, { anyOf: Record<string, unknown>[] }> };
    const slideFull = schema.$defs.slide!.anyOf.find((a) => a.description === "tags: section-header") as {
      properties: Record<string, unknown>;
      required: string[];
    };
    expect(slideFull.properties.$tags).toEqual({
      type: "array",
      items: { type: "string" },
      allOf: [{ contains: { const: "section-header" } }],
    });
    expect(slideFull.properties.$items).toEqual({ type: "array", items: { $ref: "#/$defs/block" } });
    expect(slideFull.required).toEqual(["number"]);
    expect(slideFull.properties).not.toHaveProperty("id");

    const single = schema.$defs.block!.anyOf.find((a) => a.maxProperties === 1) as { properties: Record<string, unknown> };
    expect(Object.keys(single.properties)).toEqual(["image"]);
    expect(schema).toMatchSnapshot();
  });
});
