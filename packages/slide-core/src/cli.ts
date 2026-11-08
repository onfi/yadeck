import { build as esbuild } from "esbuild";
import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createContainer, type Container, type SlideConfig } from "./container.js";
import { creditHtml, escapeHtml, renderDocument } from "./document.js";
import { embedFonts, fontLinkTags } from "./fonts.js";
import { emitJsonSchema } from "./jsonschema.js";
import { loadDeckFromJson, loadDeckFromYaml } from "./loader.js";
import { renderDeck } from "./render.js";
import { ShotSession, type SlideReport } from "./shot.js";
import { buildCss } from "./tailwind.js";
import { assertValidDeck } from "./validate.js";

interface CliOptions {
  cwd: string;
  config: string;
  out?: string;
  port?: number;
  /** check / png: 対象の deck 名(拡張子なし)。複数可 */
  decks: string[];
  /** check / png: 対象のページ番号(右下の番号、URL の #s9 の 9)。複数可 */
  slides: string[];
  /** check: 問題のあったスライドを PNG にも書き出す */
  png?: boolean;
  /** png: 倍率 */
  scale?: number;
}

const USAGE = `usage: yadeck <command> [options]
  build      decks/ を静的 HTML にする
  dev        変更を監視して再ビルドし、ブラウザを自動で再読込する
  validate   decks/ を schema で検証する
  schema     .slide/deck.schema.json を書き出す
  check      ビルドして Chromium で描画し、はみ出し・切れ・コードの縮みを検査する
  png        ビルドして各スライドを PNG に書き出す(<out>/png/<deck>/s09.png)

options:
  --config slide.config.ts   --out dist   --port 3000
  --deck <name>    check / png の対象 deck(複数指定可)
  --slide <n|名前>  check / png の対象ページ(右下の番号 9 か s9、または $id の名前。カンマ区切り・複数指定可)
  --png            check で問題のあったスライドを PNG にも書き出す
  --scale <n>      png の倍率(既定 1 = 1280x720)`;

function parseArgs(argv: string[]): { command: string; options: CliOptions } {
  const options: CliOptions = { cwd: process.cwd(), config: "slide.config.ts", decks: [], slides: [] };
  let command = "";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--config") options.config = argv[++i] ?? options.config;
    else if (a === "--out") options.out = argv[++i];
    else if (a === "--port") options.port = Number(argv[++i]);
    else if (a === "--deck") options.decks.push(...(argv[++i] ?? "").split(",").filter(Boolean));
    else if (a === "--slide") options.slides.push(...(argv[++i] ?? "").split(",").filter(Boolean));
    else if (a === "--png") options.png = true;
    else if (a === "--scale") options.scale = Number(argv[++i]);
    else if (!command) command = a;
    else throw new Error(USAGE);
  }
  return { command, options };
}

/**
 * slide.config.ts と、そこから import されるプラグインを esbuild で1ファイルにまとめて読み込む。
 * react / zod / core / schema だけは external にして CLI 自身と同じ実体を共有させる。
 * それ以外(プラグイン群)はバンドルするので、dev 中にプラグインの dist が変わっても再読込で反映される。
 */
const SHARED_MODULES = ["react", "react-dom", "react/*", "react-dom/*", "zod", "@yadeck/slide-core", "@yadeck/slide-schema"];
export async function loadConfig(options: CliOptions): Promise<SlideConfig> {
  const entry = path.resolve(options.cwd, options.config);
  if (!fs.existsSync(entry)) throw new Error(`config not found: ${entry}`);
  const outdir = path.join(options.cwd, "node_modules", ".yadeck");
  fs.mkdirSync(outdir, { recursive: true });
  const outfile = path.join(outdir, "slide.config.mjs");
  await esbuild({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    // ESM 版を持つ依存は ESM 版を使う(three.js などは CommonJS 版の require を非推奨にしている)
    mainFields: ["module", "main"],
    external: SHARED_MODULES,
    jsx: "automatic",
    sourcemap: "inline",
    // バンドルに入った CommonJS の依存(react-three-fiber など)が external の react を require できるようにする
    banner: { js: `import { createRequire as __yadeckCreateRequire } from "node:module"; const require = __yadeckCreateRequire(import.meta.url);` },
    logLevel: "silent",
  });
  const mod = (await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`)) as { default?: SlideConfig };
  if (!mod.default?.plugins) throw new Error(`${options.config} must default-export defineConfig({ plugins })`);
  return mod.default;
}

interface Project {
  config: SlideConfig;
  container: Container;
  cwd: string;
  configFile: string;
  decksDir: string;
  outDir: string;
  publicDir: string;
  cacheDir: string;
  schemaPath: string;
  themeFile?: string;
}

async function prepare(options: CliOptions): Promise<Project> {
  const config = await loadConfig(options);
  const container = createContainer(config.plugins);
  const themeFile = config.theme ? path.resolve(options.cwd, config.theme) : undefined;
  if (themeFile && !fs.existsSync(themeFile)) throw new Error(`theme not found: ${themeFile}`);
  return {
    config,
    container,
    cwd: options.cwd,
    configFile: path.resolve(options.cwd, options.config),
    themeFile,
    decksDir: path.resolve(options.cwd, config.decks ?? "decks"),
    outDir: path.resolve(options.cwd, options.out ?? config.outDir ?? "dist"),
    publicDir: path.resolve(options.cwd, config.publicDir ?? "public"),
    cacheDir: path.join(options.cwd, "node_modules", ".yadeck"),
    schemaPath: path.resolve(options.cwd, config.schemaPath ?? ".slide/deck.schema.json"),
  };
}

function listDecks(decksDir: string): string[] {
  if (!fs.existsSync(decksDir)) throw new Error(`decks directory not found: ${decksDir}`);
  return fs
    .readdirSync(decksDir)
    .filter((f) => /\.(ya?ml|json)$/.test(f))
    .sort()
    .map((f) => path.join(decksDir, f));
}

function loadDeckFile(file: string) {
  const name = path.basename(file).replace(/\.(ya?ml|json)$/, "");
  const source = fs.readFileSync(file, "utf8");
  return file.endsWith(".json") ? loadDeckFromJson(source, { name }) : loadDeckFromYaml(source, { name });
}

function writeFile(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function emitSchema(project: Project): void {
  writeFile(project.schemaPath, JSON.stringify(emitJsonSchema(project.container), null, 2));
}

/** public/ の中身を出力先の直下へコピーする。deck の HTML からは `./name.ext` で参照できる */
function copyPublic(project: Project): void {
  if (!fs.existsSync(project.publicDir)) return;
  fs.cpSync(project.publicDir, project.outDir, { recursive: true });
}

interface BuildResult {
  pages: { name: string; title: string }[];
  errors: { file: string; error: Error }[];
}

/** 全 deck を検証して静的 HTML にする。1つの deck の失敗は他の deck の出力を止めない */
async function buildAll(project: Project, extraScripts: string[] = [], embed = true): Promise<BuildResult> {
  const result: BuildResult = { pages: [], errors: [] };
  let clientNeeded = false;
  emitSchema(project);
  copyPublic(project);
  const { container, config } = project;
  const fonts = config.fonts ?? [];
  const shouldEmbed = embed && (config.embedFonts ?? true);
  for (const file of listDecks(project.decksDir)) {
    const name = path.basename(file).replace(/\.(ya?ml|json)$/, "");
    try {
      const deck = loadDeckFile(file);
      assertValidDeck(container, deck);
      const richTextCache: Record<string, string> = {};
      const body = renderDeck(deck, {
        container,
        richText: config.richText,
        onRichText: (text, html) => (richTextCache[text] = html),
        pageNumbers: config.pageNumbers,
      });
      // ブラウザで描き直すページがあれば、deck と RichText の変換結果を埋め込み、ブラウザ向けのバンドルを読ませる
      const needsClient = body.includes("data-yd-client");
      if (needsClient) clientNeeded = true;
      const css = await buildCss({ base: project.cwd, themeFile: project.themeFile, pluginCss: container.css, html: [body] });
      const extraHead = shouldEmbed
        ? `<style>${await embedFonts({ fonts, html: [body], cacheDir: path.join(project.cacheDir, "fonts") })}</style>`
        : fontLinkTags(fonts);
      const client = needsClient
        ? { data: { deck, richText: richTextCache, richTextOptions: config.richText, pageNumbers: config.pageNumbers }, src: `./${CLIENT_BUNDLE}` }
        : undefined;
      const url = config.siteUrl ? new URL(`${encodeURIComponent(name)}.html`, config.siteUrl.replace(/\/?$/, "/")).href : undefined;
      const html = renderDocument(deck, { container, richText: config.richText, body, css, extraScripts, extraHead, client, credit: config.credit, url });
      writeFile(path.join(project.outDir, `${name}.html`), html);
      result.pages.push({ name, title: deck.meta.title ?? name });
    } catch (error) {
      result.errors.push({ file: path.relative(project.decksDir, file), error: error as Error });
    }
  }
  writeFile(path.join(project.outDir, "index.html"), indexPage(result, extraScripts, config.credit !== false));
  if (clientNeeded) {
    try {
      await buildClientBundle(project);
    } catch (error) {
      result.errors.push({ file: CLIENT_BUNDLE, error: error as Error });
    }
  } else {
    // ブラウザで描き直すページが無くなったら、前回のバンドルを残さない
    fs.rmSync(path.join(project.outDir, CLIENT_BUNDLE), { force: true });
  }
  return result;
}

const CLIENT_BUNDLE = "yadeck.client.js";

/**
 * from から親へ node_modules/<name> を辿り、パッケージのディレクトリを返す(シンボリックリンクは実体へ)。
 * exports で ESM の入口しか公開していないパッケージもあるので、require.resolve は使わない
 */
function findPackageDir(from: string, name: string): string {
  for (let dir = path.resolve(from); ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, "node_modules", name);
    if (fs.existsSync(path.join(candidate, "package.json"))) return fs.realpathSync(candidate);
    if (dir === path.dirname(dir)) throw new Error(`package not found from ${from}: ${name}`);
  }
}

/**
 * slide.config.ts をブラウザ向けにもう一度バンドルする。config が import している Layout と、
 * その依存(three.js やチャートのライブラリなど)がそのまま入る。
 * - `@yadeck/slide-core` は、Node 専用の処理を含まない runtime に差し替える
 * - react / react-dom / zod は deck 側の実体に寄せ、プラグインとの間で 2 つにならないようにする
 * - file:// でも読めるよう、モジュールではなく即時実行の形式で出す
 */
async function buildClientBundle(project: Project): Promise<void> {
  const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
  const entry = path.join(project.cacheDir, "client-entry.js");
  writeFile(
    entry,
    `import config from ${JSON.stringify(project.configFile)};\nimport { mount } from ${JSON.stringify(here("./client/mount.js"))};\nmount(config);\n`,
  );
  const coreDir = path.dirname(fileURLToPath(import.meta.url));
  await esbuild({
    entryPoints: [entry],
    outfile: path.join(project.outDir, CLIENT_BUNDLE),
    bundle: true,
    platform: "browser",
    format: "iife",
    target: "es2022",
    minify: true,
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    alias: {
      "@yadeck/slide-core": here("./runtime.js"),
      "@yadeck/slide-schema": findPackageDir(coreDir, "@yadeck/slide-schema"),
      react: findPackageDir(project.cwd, "react"),
      "react-dom": findPackageDir(project.cwd, "react-dom"),
      zod: findPackageDir(project.cwd, "zod"),
    },
    logLevel: "silent",
  });
}

function indexPage(result: BuildResult, extraScripts: string[], credit: boolean): string {
  const items = result.pages
    .map((p) => `<li><a href="./${encodeURIComponent(p.name)}.html">${escapeHtml(p.title)}</a> <small>${escapeHtml(p.name)}</small></li>`)
    .join("\n");
  const errors = result.errors
    .map((e) => `<li><b>${escapeHtml(e.file)}</b><pre>${escapeHtml(e.error.message)}</pre></li>`)
    .join("\n");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>decks</title><meta name="generator" content="YADECK">
<style>body{font-family:sans-serif;max-width:720px;margin:40px auto;padding:0 16px}pre{background:#fee;padding:8px;white-space:pre-wrap}.yd-credit{margin-top:48px;font-size:13px;color:#666}.yd-credit a{color:inherit}</style>
</head><body><h1>decks</h1><ul>${items}</ul>${errors ? `<h2>errors</h2><ul>${errors}</ul>` : ""}
${credit ? creditHtml() : ""}
${extraScripts.map((s) => `<script>${s}</script>`).join("\n")}</body></html>`;
}

function report(result: BuildResult): void {
  for (const p of result.pages) console.log(`  ✓ ${p.name}.html  (${p.title})`);
  for (const e of result.errors) console.error(`  ✗ ${e.file}\n${indent(e.error.message)}`);
}

const indent = (s: string) => s.split("\n").map((l) => `      ${l}`).join("\n");

async function build(options: CliOptions): Promise<void> {
  const project = await prepare(options);
  const result = await buildAll(project);
  report(result);
  console.log(`schema: ${path.relative(options.cwd, project.schemaPath)}`);
  if (result.errors.length > 0) throw new Error(`${result.errors.length} deck(s) failed`);
}

async function validate(options: CliOptions): Promise<void> {
  const project = await prepare(options);
  emitSchema(project);
  let failed = 0;
  for (const file of listDecks(project.decksDir)) {
    try {
      assertValidDeck(project.container, loadDeckFile(file));
      console.log(`  ✓ ${path.basename(file)}`);
    } catch (error) {
      failed++;
      console.error(`  ✗ ${path.basename(file)}\n${indent((error as Error).message)}`);
    }
  }
  if (failed > 0) throw new Error(`${failed} deck(s) invalid`);
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
};

function contentType(file: string): string {
  return MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}

const RELOAD_SCRIPT = `new EventSource('/__yadeck').addEventListener('reload', function () { location.reload(); });`;

/** 変更を監視して再ビルドし、SSE でブラウザを再読込させる */
async function dev(options: CliOptions): Promise<void> {
  let project = await prepare(options);
  const port = options.port ?? project.config.port ?? 3000;
  const clients = new Set<http.ServerResponse>();

  const rebuild = async (reloadConfig: boolean) => {
    try {
      if (reloadConfig) project = await prepare(options);
      const result = await buildAll(project, [RELOAD_SCRIPT], false);
      console.log(`[${new Date().toLocaleTimeString()}] rebuilt`);
      report(result);
    } catch (error) {
      console.error((error as Error).message);
    }
    for (const c of clients) c.write("event: reload\ndata: 1\n\n");
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname === "/__yadeck") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
      res.write(":\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    const rel = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const file = path.join(project.outDir, rel);
    if (!file.startsWith(project.outDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": contentType(file) });
    fs.createReadStream(file).pipe(res);
  });

  const ignored = [project.outDir, path.join(options.cwd, "node_modules"), path.dirname(project.schemaPath), path.join(options.cwd, ".git")];
  let timer: NodeJS.Timeout | undefined;
  let pendingConfig = false;
  const onChange = (root: string) => (_event: fs.WatchEventType, filename: string | Buffer | null) => {
    if (!filename) return;
    const full = path.join(root, filename.toString());
    if (ignored.some((dir) => full.startsWith(dir + path.sep) || full === dir)) return;
    pendingConfig ||= !full.startsWith(project.decksDir + path.sep);
    clearTimeout(timer);
    timer = setTimeout(() => {
      const reloadConfig = pendingConfig;
      pendingConfig = false;
      void rebuild(reloadConfig);
    }, 100);
  };
  const roots = [options.cwd];
  for (const extra of project.config.watch ?? []) {
    const dir = path.resolve(options.cwd, extra);
    if (fs.existsSync(dir)) roots.push(dir);
    else console.warn(`watch: not found ${dir}`);
  }
  for (const root of roots) fs.watch(root, { recursive: true }, onChange(root));
  // Linux の再帰 fs.watch は上書き保存の change を取りこぼすことがあるので、mtime のポーリングも併用する
  const mtimes = new Map<string, number>();
  // 監視先(プラグインの dist など)はクリーンビルドの間だけ消えることがあるので、見つからないものは飛ばす
  const scan = (dir: string, cb: (file: string, mtime: number) => void) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (ignored.some((d) => full === d || full.startsWith(d + path.sep))) continue;
      if (e.isDirectory()) scan(full, cb);
      else if (e.isFile()) {
        try {
          cb(full, fs.statSync(full).mtimeMs);
        } catch {
          // 読む直前に消えたファイル
        }
      }
    }
  };
  let primed = false;
  setInterval(() => {
    for (const root of roots) {
      scan(root, (file, mtime) => {
        const prev = mtimes.get(file);
        mtimes.set(file, mtime);
        if (primed && prev !== mtime) onChange(root)("change", path.relative(root, file));
      });
    }
    primed = true;
  }, 500);

  await rebuild(false);
  server.listen(port, () => console.log(`dev server: http://localhost:${port}/`));
  await new Promise(() => {});
}

/** 補完用 JSON Schema だけを生成する。使える tags とフィールドの一覧として読める */
/** check / png の共通部分: ビルドしてから、対象 deck を 1 つのブラウザで順に描画する */
async function renderDecks(
  options: CliOptions,
  each: (session: ShotSession, project: Project, deck: string, htmlFile: string) => Promise<SlideReport[]>,
): Promise<{ deck: string; reports: SlideReport[] }[]> {
  const project = await prepare(options);
  const result = await buildAll(project);
  for (const e of result.errors) console.error(`  ✗ ${e.file}\n${indent(e.error.message)}`);
  const unknown = options.decks.filter((d) => !result.pages.some((p) => p.name === d));
  if (unknown.length > 0) throw new Error(`deck not found: ${unknown.join(", ")}`);
  const targets = result.pages.filter((p) => options.decks.length === 0 || options.decks.includes(p.name));
  const session = await ShotSession.open();
  try {
    const out: { deck: string; reports: SlideReport[] }[] = [];
    for (const p of targets) out.push({ deck: p.name, reports: await each(session, project, p.name, path.join(project.outDir, `${p.name}.html`)) });
    return out;
  } finally {
    await session.close();
  }
}

const pngDirOf = (project: Project, deck: string) => path.join(project.outDir, "png", deck);

/** check の結果の行頭。名前を付けたページは「#名前 (p.9)」、それ以外は「#s9」 */
const slideLabel = (r: { id: string; page: number }) => (r.id === `s${r.page}` ? `#${r.id}` : `#${r.id} (p.${r.page})`);

async function check(options: CliOptions): Promise<void> {
  const results = await renderDecks(options, (session, project, deck, htmlFile) =>
    session.run({ htmlFile, slides: options.slides, pngDir: options.png ? pngDirOf(project, deck) : undefined, pngOnlyIssues: true }),
  );
  let errors = 0;
  let warns = 0;
  for (const { deck, reports } of results) {
    const bad = reports.filter((r) => r.issues.length > 0);
    console.log(`${bad.length === 0 ? "  ✓" : "  !"} ${deck}  (${reports.length} slides)`);
    for (const r of bad) {
      for (const i of r.issues) {
        if (i.level === "error") errors++;
        else warns++;
        console.log(`      ${slideLabel(r)}  ${i.level === "error" ? "error" : "warn "}  ${i.message}`);
      }
      if (r.png) console.log(`             png: ${path.relative(options.cwd, r.png)}`);
    }
  }
  console.log(`${errors} error(s), ${warns} warning(s)`);
  if (errors > 0) throw new Error(`${errors} layout error(s)`);
}

async function png(options: CliOptions): Promise<void> {
  const results = await renderDecks(options, (session, project, deck, htmlFile) =>
    session.run({ htmlFile, slides: options.slides, pngDir: pngDirOf(project, deck), scale: options.scale }),
  );
  for (const { deck, reports } of results) {
    console.log(`  ✓ ${deck}  ${reports.length} png`);
    if (reports[0]?.png) console.log(`      ${path.relative(options.cwd, path.dirname(reports[0].png))}/`);
  }
}

async function schema(options: CliOptions): Promise<void> {
  const project = await prepare(options);
  emitSchema(project);
  console.log(path.relative(options.cwd, project.schemaPath));
}

export async function main(argv: string[]): Promise<void> {
  const { command, options } = parseArgs(argv);
  switch (command) {
    case "schema":
      return schema(options);
    case "build":
      return build(options);
    case "dev":
      return dev(options);
    case "validate":
      return validate(options);
    case "check":
      return check(options);
    case "png":
      return png(options);
    default:
      throw new Error(USAGE);
  }
}
