import { describe, expect, it } from "vitest";
import { googleFontsUrl, parseFontFaces, parseFontSpec, parseUnicodeRange, usedCodePoints } from "./fonts.js";

describe("fonts", () => {
  it("文字列の指定を family と weights に分ける", () => {
    expect(parseFontSpec("Noto Sans JP:400,700")).toEqual({ family: "Noto Sans JP", weights: [400, 700] });
    expect(parseFontSpec("JetBrains Mono")).toEqual({ family: "JetBrains Mono", weights: undefined });
  });

  it("css2 API の URL を組み立てる", () => {
    expect(googleFontsUrl(["Noto Sans JP:700,400", "JetBrains Mono"])).toBe(
      "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=JetBrains+Mono&display=swap",
    );
  });

  it("unicode-range の各記法を範囲にする", () => {
    expect(parseUnicodeRange("U+0000-00FF, U+30??, U+4E00")).toEqual([
      [0, 0xff],
      [0x3000, 0x30ff],
      [0x4e00, 0x4e00],
    ]);
  });

  it("@font-face を解析する", () => {
    const css = `
/* [1] */
@font-face {
  font-family: 'Noto Sans JP';
  font-style: normal;
  font-weight: 700;
  src: url(https://fonts.gstatic.com/s/x.woff2) format('woff2');
  unicode-range: U+4E00-4FFF;
}
`;
    expect(parseFontFaces(css)).toEqual([
      {
        family: "Noto Sans JP",
        style: "normal",
        weight: "700",
        url: "https://fonts.gstatic.com/s/x.woff2",
        format: "woff2",
        ranges: [[0x4e00, 0x4fff]],
      },
    ]);
  });

  it("HTML からタグを除いた文字のコードポイントを集める", () => {
    const used = usedCodePoints([`<style>.a{}</style><p class="x">A&amp;漢</p>`]);
    expect(used.has("A".codePointAt(0)!)).toBe(true);
    expect(used.has("&".codePointAt(0)!)).toBe(true);
    expect(used.has("漢".codePointAt(0)!)).toBe(true);
    expect(used.has("p".codePointAt(0)!)).toBe(false);
  });
});
