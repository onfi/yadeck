import { describe, expect, it } from "vitest";
import { BlockLayout, SlideLayout } from "@yadeck/slide-schema";
import { addPluginToConfig, diffLayouts, packageNameOf, pluginIdent } from "./add.js";
import { Container } from "./container.js";

const CONFIG = `import { defineConfig } from "@yadeck/slide-core";
import basic from "@yadeck/slide-components-basic";

export default defineConfig({
  plugins: [basic],
  theme: "./theme.css",
});
`;

describe("packageNameOf", () => {
  it("版の指定を外してパッケージ名を取り、パスや URL は名前が分からないとする", () => {
    expect(packageNameOf("yadeck-plugin-chart")).toBe("yadeck-plugin-chart");
    expect(packageNameOf("yadeck-plugin-chart@^1.2.0")).toBe("yadeck-plugin-chart");
    expect(packageNameOf("@acme/yadeck-plugin-chart@latest")).toBe("@acme/yadeck-plugin-chart");
    expect(packageNameOf("../my-plugin")).toBeUndefined();
    expect(packageNameOf("github:acme/plugin")).toBeUndefined();
  });
});

describe("pluginIdent", () => {
  it("決まった接頭辞を外して camelCase にし、使われている名前とは番号でずらす", () => {
    expect(pluginIdent("@acme/yadeck-plugin-bar-chart", "")).toBe("barChart");
    expect(pluginIdent("yadeck-theme-dark", "")).toBe("dark");
    expect(pluginIdent("3d-avatar", "")).toBe("plugin3dAvatar");
    expect(pluginIdent("@acme/yadeck-plugin-basic", CONFIG)).toBe("basic2");
  });
});

describe("addPluginToConfig", () => {
  it("import を最後の import の後に、プラグインを plugins の最後に足す", () => {
    const { source, ident, alreadyAdded } = addPluginToConfig(CONFIG, "yadeck-plugin-chart");
    expect(alreadyAdded).toBe(false);
    expect(ident).toBe("chart");
    expect(source).toBe(`import { defineConfig } from "@yadeck/slide-core";
import basic from "@yadeck/slide-components-basic";
import chart from "yadeck-plugin-chart";

export default defineConfig({
  plugins: [basic, chart],
  theme: "./theme.css",
});
`);
  });

  it("複数行で末尾にカンマのある plugins にも足せる", () => {
    const multi = CONFIG.replace("plugins: [basic],", "plugins: [\n    basic,\n  ],");
    expect(addPluginToConfig(multi, "yadeck-plugin-chart").source).toContain("plugins: [\n    basic, chart,\n  ],");
  });

  it("既に import されていれば書き換えない", () => {
    const r = addPluginToConfig(CONFIG, "@yadeck/slide-components-basic");
    expect(r).toEqual({ source: CONFIG, ident: "basic", alreadyAdded: true });
  });

  it("plugins が見つからなければ例外にする", () => {
    expect(() => addPluginToConfig("export default {}", "x")).toThrow(/plugins/);
  });
});

describe("diffLayouts", () => {
  const A = () => null;
  const B = () => null;

  it("新しい tags と、同じ tags を置き換えた Layout を返す", () => {
    const before = new Container().bind(SlideLayout, [], A).bind(BlockLayout, ["chart"], A);
    const after = new Container()
      .bind(SlideLayout, [], A)
      .bind(BlockLayout, ["chart"], B, { description: "グラフ" })
      .bind(SlideLayout, ["hero"], B);
    expect(diffLayouts(before, after)).toEqual([
      { stage: "slide", tags: ["hero"], description: undefined, replaced: false },
      { stage: "block", tags: ["chart"], description: "グラフ", replaced: true },
    ]);
  });
});
