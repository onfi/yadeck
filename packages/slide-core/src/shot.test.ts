import { describe, expect, it } from "vitest";
import { pngName, selectSlides } from "./shot.js";

describe("pngName", () => {
  it("ページ番号を 2 桁にそろえる", () => {
    expect([1, 9, 10, 123].map(pngName)).toEqual(["s01", "s09", "s10", "s123"]);
  });
});

describe("selectSlides", () => {
  const reports = [
    { id: "s1", page: 1 },
    { id: "lombok-ast", page: 2 },
    { id: "s3", page: 3 },
  ];

  it("ページ番号(9 / s9)と $id の名前のどれでも選べる", () => {
    expect(selectSlides(reports, ["3", "s1"]).map((r) => r.page)).toEqual([1, 3]);
    expect(selectSlides(reports, ["lombok-ast"]).map((r) => r.page)).toEqual([2]);
    expect(selectSlides(reports, ["s2"]).map((r) => r.id)).toEqual(["lombok-ast"]);
  });

  it("当たらない指定はエラーにする", () => {
    expect(() => selectSlides(reports, ["nope", "9"])).toThrow(/nope, 9/);
  });
});
