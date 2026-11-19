import { describe, expect, it } from "vitest";
import { createContainer, loadDeckFromYaml, renderDeck, validateDeck } from "@yadeck/slide-core";
import basic from "@yadeck/slide-components-basic";
import plugin from "./index.js";

const container = createContainer([basic, plugin]);

describe("hero", () => {
  it("message を大きく出し、補足を添える", () => {
    const deck = loadDeckFromYaml(`- hero: { message: 一言, $items: [補足] }`);
    expect(validateDeck(container, deck)).toEqual([]);
    const html = renderDeck(deck, { container });
    expect(html).toContain("一言");
    expect(html).toContain("補足");
  });

  it("message が無ければ検証で落ちる", () => {
    const deck = loadDeckFromYaml(`- hero: { $items: [補足] }`);
    expect(validateDeck(container, deck)).toEqual([{ path: "s1.message", message: expect.any(String) }]);
  });
});
