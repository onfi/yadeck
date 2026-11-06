import { describe, expect, it } from "vitest";
import { pngName } from "./shot.js";

describe("pngName", () => {
  it("スライド id を 2 桁にそろえ、ファイル名順がスライド順になるようにする", () => {
    expect(["s0", "s9", "s10", "s123"].map(pngName)).toEqual(["s00", "s09", "s10", "s123"]);
  });
});
