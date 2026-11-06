import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { buildCss } from "./tailwind.js";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "yadeck-tw-"));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("buildCss (Tailwind v4)", () => {
  it("HTML に現れた utility だけを出力し、@theme のトークンを使う", async () => {
    const css = await buildCss({
      base: dir,
      pluginCss: `@theme { --color-primary: #123456; }`,
      html: [`<div class="bg-primary flex">x</div>`],
    });
    expect(css).toContain("--color-primary: #123456");
    expect(css).toMatch(/\.bg-primary\s*\{[^}]*var\(--color-primary\)/);
    expect(css).toMatch(/\.flex\s*\{/);
    expect(css).not.toMatch(/\.grid\s*\{/);
  });

  it("React がエスケープした &amp; を含む arbitrary variant も拾う", async () => {
    const css = await buildCss({
      base: dir,
      pluginCss: "",
      html: [`<div class="[&amp;_.x]:text-center"><p class="x">a</p></div>`],
    });
    expect(css).toMatch(/\.x\s*\{[^}]*text-align:\s*center/);
  });

  it("利用者のテーマ CSS がプラグインの既定トークンを上書きする", async () => {
    const theme = path.join(dir, "theme.css");
    fs.writeFileSync(theme, `@theme { --color-primary: #abcdef; }`);
    const css = await buildCss({
      base: dir,
      themeFile: theme,
      pluginCss: `@theme { --color-primary: #123456; }`,
      html: [`<p class="text-primary">x</p>`],
    });
    expect(css).toContain("--color-primary: #abcdef");
    expect(css).not.toContain("#123456");
  });
});
