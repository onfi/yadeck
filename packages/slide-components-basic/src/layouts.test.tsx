import { describe, expect, it } from "vitest";
import { createContainer, loadDeckFromYaml, renderDeck, validateDeck } from "@yadeck/slide-core";
import { basic } from "./index.js";

const container = createContainer([basic]);

const render = (yaml: string) => {
  const deck = loadDeckFromYaml(yaml, { name: "t" });
  expect(validateDeck(container, deck)).toEqual([]);
  return renderDeck(deck, { container });
};

describe("basic layouts", () => {
  it("header slide", () => {
    expect(render(`- header: { title: "T **b**", subtitle: S, author: A, date: D }`)).toMatchSnapshot();
  });

  it("section-header slide は heading と body だけを描く", () => {
    const html = render(`
- section-header:
    number: "01"
    $items:
      - heading: 概要
      - body: 本文
      - code: 描画されない
`);
    expect(html).toMatch(/text-display[^>]*>01</);
    expect(html).not.toContain("描画されない");
    expect(html).toMatchSnapshot();
  });

  it("default slide は heading を上に、残りを順に並べる", () => {
    expect(
      render(`
- - body: 先
  - heading: H
  - list: |
      a
      b
  - quote: { cite: C, $text: Q }
  - image: { src: x.png, alt: X, width: 400, $text: cap }
  - note: hidden
  - code: { lang: ts, $text: "const a = 1;" }
`),
    ).toMatchSnapshot();
  });

  it("two-column は right を右列に、それ以外を左列に置く", () => {
    const html = render(`
- two-column:
    $items:
      - heading: H
      - body: L
      - body right: R
`);
    expect(html).toMatchSnapshot();
  });

  it("未知の tags でも fallback で描画される", () => {
    const html = render(`- weird: [{ odd: x }]`);
    expect(html).toContain(`data-tags="weird"`);
    expect(html).toContain(`<div class="b-body">x</div>`);
  });
});
