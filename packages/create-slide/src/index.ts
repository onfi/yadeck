import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE_DIR = fileURLToPath(new URL("../template/", import.meta.url));
/** `--plugin`: プラグインのリポジトリ(Layout、見本の deck、テスト、プレビューの設定) */
const PLUGIN_TEMPLATE_DIR = fileURLToPath(new URL("../template-plugin/", import.meta.url));

const USAGE = `usage: npx @yadeck/create-slide <dir>            deck のリポジトリを作る
       npx @yadeck/create-slide --plugin <dir>   プラグインのリポジトリを作る(名前は yadeck-plugin-* を推奨)`;

/** テンプレートでは `_` 始まりで持つ dotfile を本来の名前に戻す(npm publish で落ちるのを避ける) */
function targetName(name: string): string {
  return name.startsWith("_") ? `.${name.slice(1)}` : name;
}

/** 雛形を置いた結果。パスは作った先のディレクトリからの相対 */
export interface ScaffoldResult {
  created: string[];
  /** 同じ名前のものが既にあったので、手を付けなかったもの */
  skipped: string[];
}

/**
 * テンプレートを dest に写す。既にあるファイルは上書きせず skipped に積む。
 * 原稿やメモがあるリポジトリにも後から足せるようにするため
 */
function copyDir(src: string, dest: string, root: string, vars: Record<string, string>, result: ScaffoldResult): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, targetName(entry.name));
    if (entry.isDirectory()) {
      copyDir(from, to, root, vars, result);
      continue;
    }
    const rel = path.relative(root, to);
    if (fs.existsSync(to)) {
      result.skipped.push(rel);
      continue;
    }
    let content = fs.readFileSync(from, "utf8");
    for (const [k, v] of Object.entries(vars)) content = content.replaceAll(`{{${k}}}`, v);
    fs.writeFileSync(to, content);
    result.created.push(rel);
  }
}

/** 正本 `.agents/skills`(Codex)を Claude Code / Antigravity の置き場所からも参照できるようにする */
const SKILL_DIRS = [".claude/skills", ".agent/skills"];

/** lstat で見る(壊れたシンボリックリンクも「ある」とみなし、上書きしない) */
function exists(p: string): boolean {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * 相対シンボリックリンクを作る。作れない環境(Windows の権限など)ではコピーに倒す。
 * 既に同じ名前のものがあれば何もしない
 */
function linkOrCopy(target: string, linkPath: string, root: string, result: ScaffoldResult): void {
  const rel = path.relative(root, linkPath);
  if (exists(linkPath)) {
    result.skipped.push(rel);
    return;
  }
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  try {
    fs.symlinkSync(path.relative(path.dirname(linkPath), target), linkPath, "dir");
  } catch {
    fs.cpSync(target, linkPath, { recursive: true });
  }
  result.created.push(rel);
}

export function linkAgentFiles(root: string, result: ScaffoldResult = { created: [], skipped: [] }): ScaffoldResult {
  const skillsRoot = path.join(root, ".agents", "skills");
  if (fs.existsSync(skillsRoot)) {
    for (const skill of fs.readdirSync(skillsRoot)) {
      for (const dir of SKILL_DIRS) linkOrCopy(path.join(skillsRoot, skill), path.join(root, dir, skill), root, result);
    }
  }
  const agentsMd = path.join(root, "AGENTS.md");
  const claudeMd = path.join(root, "CLAUDE.md");
  if (fs.existsSync(agentsMd)) {
    if (exists(claudeMd)) {
      result.skipped.push("CLAUDE.md");
    } else {
      try {
        fs.symlinkSync("AGENTS.md", claudeMd);
      } catch {
        fs.copyFileSync(agentsMd, claudeMd);
      }
      result.created.push("CLAUDE.md");
    }
  }
  return result;
}

/**
 * dest に deck リポジトリの雛形を置く。空でないディレクトリにも足せるが、
 * package.json が既にあると依存や scripts を合成できないので、何もせずエラーにする
 */
export function scaffold(dest: string, templateDir = TEMPLATE_DIR): ScaffoldResult {
  if (fs.existsSync(path.join(dest, "package.json"))) {
    throw new Error(
      `${path.join(dest, "package.json")} が既にあります。YADECK の依存と scripts は手で足してください: https://onfi.github.io/yadeck/guide/getting-started`,
    );
  }
  const result: ScaffoldResult = { created: [], skipped: [] };
  copyDir(templateDir, dest, dest, { name: path.basename(dest) }, result);
  return linkAgentFiles(dest, result);
}

export function main(argv: string[]): void {
  const plugin = argv.includes("--plugin");
  const rest = argv.filter((a) => a !== "--plugin");
  const name = rest[0];
  if (!name || rest.length > 1 || name.startsWith("-")) throw new Error(USAGE);
  const dest = path.resolve(process.cwd(), name);
  const { skipped } = scaffold(dest, plugin ? PLUGIN_TEMPLATE_DIR : TEMPLATE_DIR);
  if (skipped.length > 0) {
    console.log(`既にあるので、そのままにしたもの:\n${skipped.map((s) => `  ${s}`).join("\n")}\n`);
  }
  const cd = dest === process.cwd() ? "" : `  cd ${name}\n`;
  const next = plugin
    ? `${cd}  npm install\n  npm run dev     # example/ の見本をプレビュー\n  npm test\n`
    : `${cd}  npm install\n  npm run dev\n`;
  console.log(`created ${dest}\n\n${next}`);
  if (plugin && !/^(@[^/]+\/)?yadeck-plugin-/.test(path.basename(dest))) {
    console.log("  名前は yadeck-plugin-* にすると、プラグインの一覧や npx yadeck add で見つけやすくなります\n");
  }
}
