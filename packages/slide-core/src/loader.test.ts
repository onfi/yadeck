import { describe, expect, it } from "vitest";
import { expand, loadDeckFromYaml, LoadError } from "./loader.js";

describe("expand (sugar → 正規形)", () => {
  it("配列は tags 無しのノードと children になる", () => {
    expect(expand(["a", "b"], "deck")).toMatchInlineSnapshot(`
      {
        "slides": [
          {
            "items": [
              {
                "tags": [],
                "text": "a",
              },
            ],
            "tags": [],
          },
          {
            "items": [
              {
                "tags": [],
                "text": "b",
              },
            ],
            "tags": [],
          },
        ],
        "tags": [],
      }
    `);
  });

  it("文字列は block 位置なら text、それ以外は末端まで落とす", () => {
    expect(expand("x", "block")).toEqual({ tags: [], text: "x" });
    expect(expand("x", "slide")).toEqual({ tags: [], items: [{ tags: [], text: "x" }] });
    expect(expand("x", "deck")).toEqual({ tags: [], slides: [{ tags: [], items: [{ tags: [], text: "x" }] }] });
  });

  it("単一キー map はキーを tags に分割し、値の形で展開を変える", () => {
    expect(expand({ "section-header t": { number: "01", $items: [{ heading: "概要" }] } }, "slide")).toEqual({
      tags: ["section-header", "t"],
      number: "01",
      items: [{ tags: ["heading"], text: "概要" }],
    });
    expect(expand({ heading: "概要" }, "block")).toEqual({ tags: ["heading"], text: "概要" });
    expect(expand({ "two-column": ["a"] }, "slide")).toEqual({
      tags: ["two-column"],
      items: [{ tags: [], text: "a" }],
    });
    expect(expand({ header: "表紙" }, "slide")).toEqual({ tags: ["header"], items: [{ tags: [], text: "表紙" }] });
  });

  it("単一キー map の値に $tags があれば結合する", () => {
    expect(expand({ body: { $tags: "left", $text: "x" } }, "block")).toEqual({ tags: ["body", "left"], text: "x" });
  });

  it("$ 付きの構造キーは剥がし、$tags の文字列は空白で分割する", () => {
    expect(expand({ $tags: "a  b", $text: "t", color: "red" }, "block")).toEqual({
      tags: ["a", "b"],
      text: "t",
      color: "red",
    });
  });

  it("単一キーでも構造キーなら tag とは見なさない", () => {
    expect(expand({ text: "x" }, "block")).toEqual({ tags: [], text: "x" });
    expect(expand({ tags: ["a"] }, "block")).toEqual({ tags: ["a"] });
  });

  it("block に children や配列は置けない", () => {
    expect(() => expand(["a"], "block")).toThrow(LoadError);
    expect(() => expand({ $items: [] }, "block")).toThrow(LoadError);
    expect(() => expand({ $slides: [] }, "slide")).toThrow(/not allowed/);
  });
});

describe("loadDeckFromYaml", () => {
  const yaml = `
- header: { title: 発表タイトル }
- section-header t:
    number: "01"
    $items:
      - heading: 概要
      - body: これこれは…
-
  - 本文1
  - 本文2
- 次のページ本文
`;

  it("仕様 §4 の例を正規形に展開し id を付与する", () => {
    expect(loadDeckFromYaml(yaml)).toMatchInlineSnapshot(`
      {
        "id": "deck",
        "meta": {
          "title": "発表タイトル",
        },
        "slides": [
          {
            "id": "s1",
            "items": [],
            "page": 1,
            "tags": [
              "header",
            ],
            "title": "発表タイトル",
          },
          {
            "id": "s2",
            "items": [
              {
                "id": "s2-b0",
                "tags": [
                  "heading",
                ],
                "text": "概要",
              },
              {
                "id": "s2-b1",
                "tags": [
                  "body",
                ],
                "text": "これこれは…",
              },
            ],
            "number": "01",
            "page": 2,
            "tags": [
              "section-header",
              "t",
            ],
          },
          {
            "id": "s3",
            "items": [
              {
                "id": "s3-b0",
                "tags": [],
                "text": "本文1",
              },
              {
                "id": "s3-b1",
                "tags": [],
                "text": "本文2",
              },
            ],
            "page": 3,
            "tags": [],
          },
          {
            "id": "s4",
            "items": [
              {
                "id": "s4-b0",
                "tags": [],
                "text": "次のページ本文",
              },
            ],
            "page": 4,
            "tags": [],
          },
        ],
        "tags": [],
        "version": "1",
      }
    `);
  });

  it("header が無ければ meta.title はファイル名から補完する", () => {
    expect(loadDeckFromYaml("- 本文", { name: "intro" }).meta.title).toBe("intro");
  });

  it("フル記述では $meta / $version を書ける。$schema は捨てる", () => {
    const deck = loadDeckFromYaml(`
$schema: ./x.json
$version: "1"
$meta: { title: T, author: me }
$tags: dark
$slides:
  - heading: H
`);
    expect(deck.meta).toEqual({ title: "T", author: "me" });
    expect(deck.tags).toEqual(["dark"]);
    expect(deck.slides[0]).toEqual({ id: "s1", page: 1, tags: ["heading"], items: [{ id: "s1-b0", tags: [], text: "H" }] });
    expect(deck).not.toHaveProperty("schema");
  });

  it("未対応 version は拒否する", () => {
    expect(() => loadDeckFromYaml(`{ $version: "2", $slides: [] }`)).toThrow(/unsupported version/);
  });
});

describe("ページの名前($id)", () => {
  it("$id を付けたページはその名前が id になり、ページ番号は page に残る", () => {
    const deck = loadDeckFromYaml(`
- - 一枚目
- $id: lombok-ast
  $items: [二枚目]
`);
    expect(deck.slides.map((s) => [s.id, s.page])).toEqual([
      ["s1", 1],
      ["lombok-ast", 2],
    ]);
    expect(deck.slides[1]!.items[0]!.id).toBe("lombok-ast-b0");
  });

  it("重複、ページ番号の形、空白を含む名前は拒否する", () => {
    expect(() => loadDeckFromYaml(`[{ $id: a, $items: [] }, { $id: a, $items: [] }]`)).toThrow(/already used on page 1/);
    expect(() => loadDeckFromYaml(`[{ $id: s3, $items: [] }]`)).toThrow(/page number/);
    expect(() => loadDeckFromYaml(`[{ $id: "a b", $items: [] }]`)).toThrow(/without spaces/);
  });
});
