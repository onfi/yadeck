import { describe, expect, it } from "vitest";
import { createContainer, loadDeckFromYaml, renderDeck, validateDeck } from "@yadeck/slide-core";
import { basic, columnWeights, PHI } from "./index.js";

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

describe("発表者ノート", () => {
  it("どの slide の Layout も note の block を描く(発表者モードがページの中から読む)", () => {
    const cases = [
      "- - heading: h\n  - body: b\n  - note: N",
      "- columns:\n  - heading: h\n  - code: x\n  - note: N",
      "- header: { title: t, $items: [{ note: N }] }",
      "- profile: { name: n, $items: [{ heading: h }, { note: N }] }",
      "- section-header: { $items: [{ heading: h }, { note: N }] }",
      "- two-column: { $items: [{ heading: h }, { body left: a }, { note: N }] }",
      "- card: { $items: [{ heading: h }, { item: { title: a } }, { note: N }] }",
    ];
    for (const yaml of cases) expect(render(yaml).match(/yd-notes/g) ?? [], yaml).toHaveLength(1);
  });
});

describe("columns の focus", () => {
  it("主役の列を他の列の黄金比倍の幅にする。focus が無ければ等分", () => {
    expect(columnWeights(3, undefined)).toEqual([1, 1, 1]);
    expect(columnWeights(3, 2)).toEqual([1, 1, PHI]);
    const html = render("- columns:\n    focus: 3\n    $items:\n    - code: a\n    - code: b\n    - code: c");
    expect(html).toContain(`grid-template-columns:minmax(0, 1fr) minmax(0, 1fr) minmax(0, ${PHI}fr)`);
  });
});

describe("main-left / main-right", () => {
  const order = (html: string) => Array.from(html.matchAll(/src="\.\/([a-z])\.png"/g), (m) => m[1]).join("");
  const items = "\n    $items:\n    - image: { src: ./a.png }\n    - image: { src: ./b.png }\n    - image: { src: ./c.png }";

  it("main-left は最初の区画を左に大きく、残りを右に積む", () => {
    const html = render(`- main-left:${items}`);
    expect(html).toContain(`grid-template-columns:minmax(0, ${PHI}fr) minmax(0, 1fr)`);
    expect(order(html)).toBe("abc");
  });

  it("main-right は最後の区画を右に大きく、残りを左に積む(読む順は変えない)", () => {
    const html = render(`- main-right:${items}`);
    expect(html).toContain(`grid-template-columns:minmax(0, 1fr) minmax(0, ${PHI}fr)`);
    expect(order(html)).toBe("abc");
  });
});

describe("ページ番号", () => {
  it("各ページの右下に 1 始まりの番号を出し、pageNumbers: false なら出さない", () => {
    const deck = loadDeckFromYaml("- 一枚目\n- 二枚目", { name: "t" });
    const html = renderDeck(deck, { container });
    expect(html).toContain('id="s2"');
    expect(html).toContain('<div class="yd-page-number" aria-hidden="true">2</div>');
    expect(renderDeck(deck, { container, pageNumbers: false })).not.toContain("yd-page-number");
  });
});
