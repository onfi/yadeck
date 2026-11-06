import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE_DIR = fileURLToPath(new URL("../template/", import.meta.url));

/** テンプレートでは `_` 始まりで持つ dotfile を本来の名前に戻す(npm publish で落ちるのを避ける) */
function targetName(name: string): string {
  return name.startsWith("_") ? `.${name.slice(1)}` : name;
}

function copyDir(src: string, dest: string, vars: Record<string, string>): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, targetName(entry.name));
    if (entry.isDirectory()) {
      copyDir(from, to, vars);
      continue;
    }
    let content = fs.readFileSync(from, "utf8");
    for (const [k, v] of Object.entries(vars)) content = content.replaceAll(`{{${k}}}`, v);
    fs.writeFileSync(to, content);
  }
}

/** 正本 `.agents/skills`(Codex)を Claude Code / Antigravity の置き場所からも参照できるようにする */
const SKILL_DIRS = [".claude/skills", ".agent/skills"];

/**
 * 相対シンボリックリンクを作る。作れない環境(Windows の権限など)ではコピーに倒す。
 */
function linkOrCopy(target: string, linkPath: string): void {
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  try {
    fs.symlinkSync(path.relative(path.dirname(linkPath), target), linkPath, "dir");
  } catch {
    fs.cpSync(target, linkPath, { recursive: true });
  }
}

export function linkAgentFiles(root: string): void {
  const skillsRoot = path.join(root, ".agents", "skills");
  if (fs.existsSync(skillsRoot)) {
    for (const skill of fs.readdirSync(skillsRoot)) {
      for (const dir of SKILL_DIRS) linkOrCopy(path.join(skillsRoot, skill), path.join(root, dir, skill));
    }
  }
  const agentsMd = path.join(root, "AGENTS.md");
  if (fs.existsSync(agentsMd)) {
    const claudeMd = path.join(root, "CLAUDE.md");
    try {
      fs.symlinkSync("AGENTS.md", claudeMd);
    } catch {
      fs.copyFileSync(agentsMd, claudeMd);
    }
  }
}

export function main(argv: string[]): void {
  const name = argv[0];
  if (!name) throw new Error("usage: npx @yadeck/create-slide <dir>");
  const dest = path.resolve(process.cwd(), name);
  if (fs.existsSync(dest) && fs.readdirSync(dest).length > 0) {
    throw new Error(`${dest} is not empty`);
  }
  copyDir(TEMPLATE_DIR, dest, { name: path.basename(dest) });
  linkAgentFiles(dest);
  console.log(`created ${dest}\n\n  cd ${name}\n  npm install\n  npm run dev\n`);
}
