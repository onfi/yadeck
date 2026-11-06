import { describe, expect, it } from "vitest";
import { DeckLayout, type DeckNode } from "@yadeck/slide-schema";
import { Container } from "./container.js";
import { CREDIT_URL, renderDocument } from "./document.js";
import { loadDeckFromYaml } from "./loader.js";

const container = new Container().bind(DeckLayout, [], ({ slides }: DeckNode) => <main>{slides.length}</main>);
const deck = loadDeckFromYaml(`- 本文`);

describe("クレジット", () => {
  it("既定で通常表示の末尾に YADECK へのリンクを出す", () => {
    const html = renderDocument(deck, { container });
    expect(html).toContain(`<footer class="yd-credit">Created with <a href="${CREDIT_URL}"`);
  });

  it("credit: false なら出さない", () => {
    expect(renderDocument(deck, { container, credit: false })).not.toContain("yd-credit\">");
  });
});
