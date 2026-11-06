import { describe, expect, it } from "vitest";
import type { BlockNode } from "@yadeck/slide-core";
import { columnsFor, paneWeights, splitColumns, toPanes } from "./panes.js";

const b = (id: string, ...tags: string[]): BlockNode => ({ id, tags, text: id });

describe("toPanes", () => {
  it("テキストは全部で 1 pane、image / code / video / flow は 1 つずつ、note は除く", () => {
    const panes = toPanes([b("t1"), b("i1", "image"), b("t2", "body"), b("c1", "code"), b("n", "note"), b("v", "video"), b("f", "flow")]);
    expect(panes.map((p) => (p.kind === "text" ? `text:${p.blocks.map((x) => x.id).join(",")}` : p.block.id))).toEqual([
      "text:t1,t2",
      "i1",
      "c1",
      "v",
      "f",
    ]);
  });

  it("テキスト pane は最初のテキスト block の位置に置く", () => {
    const panes = toPanes([b("i1", "image"), b("t1"), b("i2", "image")]);
    expect(panes.map((p) => p.kind)).toEqual(["block", "text", "block"]);
  });

  it("quote や stat もテキスト pane に入る", () => {
    const panes = toPanes([b("q", "quote"), b("s", "stat")]);
    expect(panes).toHaveLength(1);
  });
});

describe("splitColumns", () => {
  it("1 は全面、2 以上は左 floor(N/2) + 右 残り", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(splitColumns)).toEqual([
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
      [2, 3],
      [3, 3],
      [3, 4],
      [4, 4],
    ]);
  });
});

describe("columnsFor", () => {
  it("4 までは横一列、5 以上は 3 列", () => {
    expect([1, 2, 3, 4, 5, 6].map(columnsFor)).toEqual([1, 2, 3, 4, 3, 3]);
  });
});

describe("paneWeights", () => {
  it("全部が code なら行数(+ caption 等の余白)の比、1 つでも code 以外があれば等分", () => {
    const code = (id: string, text: string, caption?: string): BlockNode => ({ id, tags: ["code"], text, ...(caption ? { caption } : {}) }) as BlockNode;
    expect(paneWeights(toPanes([code("a", "1\n2"), code("b", "1\n2\n3\n4\n5\n6")]))).toEqual([2 + 40 / 24, 6 + 40 / 24]);
    expect(paneWeights(toPanes([code("a", "1", "cap")]))).toEqual([1 + 80 / 24]);
    expect(paneWeights(toPanes([code("a", "1\n2\n3"), b("i", "image")]))).toEqual([1, 1]);
  });
});
