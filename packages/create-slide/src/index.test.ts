import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { scaffold } from "./index.js";

const TEMPLATE = path.resolve(import.meta.dirname, "../template");
const PLUGIN_TEMPLATE = path.resolve(import.meta.dirname, "../template-plugin");
const dirs: string[] = [];

function tmp(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "create-slide-"));
  dirs.push(d);
  return d;
}

afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("scaffold", () => {
  it("空のディレクトリには雛形一式を置き、dotfile と CLAUDE.md を用意する", () => {
    const dest = tmp();
    const result = scaffold(dest, TEMPLATE);
    expect(result.skipped).toEqual([]);
    expect(fs.existsSync(path.join(dest, ".gitignore"))).toBe(true);
    expect(fs.readlinkSync(path.join(dest, "CLAUDE.md"))).toBe("AGENTS.md");
    expect(fs.existsSync(path.join(dest, ".claude/skills/yadeck/SKILL.md"))).toBe(true);
  });

  it("既にあるファイルは上書きせず、無いファイルだけ足す", () => {
    const dest = tmp();
    fs.writeFileSync(path.join(dest, "README.md"), "自分の README");
    fs.writeFileSync(path.join(dest, "talkscript.md"), "原稿");
    const result = scaffold(dest, TEMPLATE);
    expect(fs.readFileSync(path.join(dest, "README.md"), "utf8")).toBe("自分の README");
    expect(fs.readFileSync(path.join(dest, "talkscript.md"), "utf8")).toBe("原稿");
    expect(result.skipped).toEqual(["README.md"]);
    expect(result.created).toContain("package.json");
  });

  it("package.json が既にあれば、何も置かずにエラーにする", () => {
    const dest = tmp();
    fs.writeFileSync(path.join(dest, "package.json"), "{}");
    expect(() => scaffold(dest, TEMPLATE)).toThrow(/package\.json が既にあります/);
    expect(fs.readdirSync(dest)).toEqual(["package.json"]);
  });

  it("プラグインの雛形は、一覧に載る決まり(keywords と見本の deck)を備え、名前を埋める", () => {
    const dest = path.join(tmp(), "yadeck-plugin-hero");
    scaffold(dest, PLUGIN_TEMPLATE);
    const pkg = JSON.parse(fs.readFileSync(path.join(dest, "package.json"), "utf8"));
    expect(pkg.name).toBe("yadeck-plugin-hero");
    expect(pkg.keywords).toContain("yadeck-plugin");
    expect(pkg.files).toEqual(["dist", "example"]);
    expect(fs.existsSync(path.join(dest, "example/deck.yaml"))).toBe(true);
    expect(fs.readFileSync(path.join(dest, "README.md"), "utf8")).toContain("npx yadeck add yadeck-plugin-hero");
    expect(fs.readlinkSync(path.join(dest, "CLAUDE.md"))).toBe("AGENTS.md");
  });
});
