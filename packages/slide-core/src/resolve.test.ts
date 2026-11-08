import { describe, expect, it } from "vitest";
import { z } from "zod";
import { BlockLayout, SlideLayout, type BlockNode } from "@yadeck/slide-schema";
import { Container, ConfigError } from "./container.js";
import { pick, pickAll } from "./pick.js";
import { bestIndex, score } from "./resolve.js";

const tagsOf = (c: { tags: string[] }) => c.tags;

describe("解決規則 (§7)", () => {
  it("match が多い方を優先する", () => {
    const cands = [{ tags: ["a"] }, { tags: ["a", "b"] }, { tags: ["c"] }];
    expect(bestIndex(cands, tagsOf, ["a", "b"], "first")).toBe(1);
  });

  it("match が同じなら extra が少ない方を優先する", () => {
    const cands = [{ tags: ["a", "x"] }, { tags: ["a"] }];
    expect(bestIndex(cands, tagsOf, ["a", "b"], "first")).toBe(1);
  });

  it("完全同点は tie で決まる(DI は後勝ち、pick は先勝ち)", () => {
    const cands = [{ tags: ["a"] }, { tags: ["a"] }];
    expect(bestIndex(cands, tagsOf, ["a"], "first")).toBe(0);
    expect(bestIndex(cands, tagsOf, ["a"], "last")).toBe(1);
  });

  it("重複した tag は1つとして数える", () => {
    expect(score(["a", "a", "b"], ["a"])).toEqual({ match: 1, extra: 1 });
  });

  it("候補が無ければ -1", () => {
    expect(bestIndex([], tagsOf, ["a"], "first")).toBe(-1);
  });
});

describe("Container.resolve", () => {
  const A = () => null;
  const B = () => null;
  const C = () => null;

  it("bind があれば match=0 でも fallback を返す", () => {
    const c = new Container().bind(BlockLayout, [], A).bind(BlockLayout, ["heading"], B);
    expect(c.resolve(BlockLayout, ["unknown"]).component).toBe(A);
    expect(c.resolve(BlockLayout, ["heading", "big"]).component).toBe(B);
  });

  it("同じ tags 集合の再 bind は後段が上書きする", () => {
    const c = new Container().bind(BlockLayout, ["x", "y"], A).bind(BlockLayout, ["y", "x"], B);
    expect(c.bindingsOf(BlockLayout)).toHaveLength(1);
    expect(c.resolve(BlockLayout, ["x"]).component).toBe(B);
  });

  it("同点は登録順の後勝ち", () => {
    const c = new Container().bind(BlockLayout, ["a", "p"], A).bind(BlockLayout, ["a", "q"], C);
    expect(c.resolve(BlockLayout, ["a"]).component).toBe(C);
  });

  it("bind がゼロの Interface は構成エラー", () => {
    const c = new Container().bind(BlockLayout, [], A);
    expect(() => c.resolve(SlideLayout, [])).toThrow(ConfigError);
  });

  it("tags は文字列でも渡せ、type は段の共通部と合成される", () => {
    const c = new Container().bind(SlideLayout, "section-header t", (s: { number: string }) => s.number, {
      type: z.object({ number: z.string() }),
    });
    const b = c.resolve(SlideLayout, ["t", "section-header"]);
    expect(b.tags).toEqual(["section-header", "t"]);
    expect(Object.keys(b.schema.shape)).toEqual(["id", "page", "tags", "description", "sources", "number"]);
  });
});

describe("pick / pickAll (§5)", () => {
  const block = (id: string, ...tags: string[]): BlockNode => ({ id, tags });
  const items = [block("h", "heading"), block("b1", "body"), block("b2", "body", "left"), block("c", "code", "right")];

  it("pick は最良の1個と残りを返す", () => {
    const [hit, rest] = pick(items, ["body"]);
    expect(hit?.id).toBe("b1");
    expect(rest.map((b) => b.id)).toEqual(["h", "b2", "c"]);
  });

  it("pick は extra の少ない方、同点は先に出現した方", () => {
    expect(pick(items, ["body", "left"])[0]?.id).toBe("b2");
    expect(pick([block("x", "body", "p"), block("y", "body", "q")], ["body"])[0]?.id).toBe("x");
  });

  it("pick は一致ゼロなら undefined で items はそのまま", () => {
    const [hit, rest] = pick(items, "none");
    expect(hit).toBeUndefined();
    expect(rest).toEqual(items);
  });

  it("pickAll は一致する全部を元の順序で", () => {
    const [hits, rest] = pickAll(items, "body right");
    expect(hits.map((b) => b.id)).toEqual(["b1", "b2", "c"]);
    expect(rest.map((b) => b.id)).toEqual(["h"]);
  });
});
