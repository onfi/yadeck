import { describe, expect, it } from "vitest";
import { focusLines, splitHighlighted } from "./layouts.js";

describe("focusLines", () => {
  const lines = ["a", "title: 発表タイトル", "c", "d"];
  it("行番号、範囲、文字列、配列で指定できる", () => {
    expect([...focusLines(lines, 2)]).toEqual([1]);
    expect([...focusLines(lines, "3-4")]).toEqual([2, 3]);
    expect([...focusLines(lines, "title")]).toEqual([1]);
    expect([...focusLines(lines, [1, "title"])].sort()).toEqual([0, 1]);
    expect(focusLines(lines, undefined).size).toBe(0);
  });
});

describe("splitHighlighted", () => {
  it("行をまたぐ span を行末で閉じて次の行で開き直す", () => {
    expect(splitHighlighted(`<span class="c">/* a\nb */</span> x`)).toEqual([
      `<span class="c">/* a</span>`,
      `<span class="c">b */</span> x`,
    ]);
  });
});
