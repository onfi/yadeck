import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

/** Google Fonts の指定。文字列は "Noto Sans JP:400,700" / "JetBrains Mono" の形 */
export interface FontSpec {
  family: string;
  weights?: number[];
}

export function parseFontSpec(spec: string | FontSpec): FontSpec {
  if (typeof spec !== "string") return spec;
  const [family, w] = spec.split(":");
  const weights = w
    ?.split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
  return { family: family!.trim(), weights: weights?.length ? weights : undefined };
}

/** css2 API の URL。weights 無指定は 400 */
export function googleFontsUrl(specs: (string | FontSpec)[]): string {
  const families = specs.map(parseFontSpec).map((s) => {
    const name = s.family.replace(/ /g, "+");
    const weights = [...(s.weights ?? [400])].sort((a, b) => a - b);
    return weights.length === 1 && weights[0] === 400 ? `family=${name}` : `family=${name}:wght@${weights.join(";")}`;
  });
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

/** dev 用。ネットワーク前提で Google Fonts をそのまま読む */
export function fontLinkTags(specs: (string | FontSpec)[]): string {
  if (specs.length === 0) return "";
  return [
    `<link rel="preconnect" href="https://fonts.googleapis.com">`,
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
    `<link rel="stylesheet" href="${googleFontsUrl(specs)}">`,
  ].join("\n");
}

interface FontFace {
  family: string;
  style: string;
  weight: string;
  url: string;
  format: string;
  ranges: [number, number][];
}

/** woff2 と unicode-range 分割を返してもらうための UA */
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export function parseFontFaces(css: string): FontFace[] {
  const faces: FontFace[] = [];
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const body = m[1]!;
    const prop = (name: string) => body.match(new RegExp(`${name}\\s*:\\s*([^;]+);`))?.[1]?.trim();
    const src = prop("src") ?? "";
    const url = src.match(/url\(([^)]+)\)/)?.[1]?.replace(/["']/g, "");
    const format = src.match(/format\(["']?([^"')]+)["']?\)/)?.[1] ?? "woff2";
    if (!url) continue;
    faces.push({
      family: (prop("font-family") ?? "").replace(/["']/g, ""),
      style: prop("font-style") ?? "normal",
      weight: prop("font-weight") ?? "400",
      url,
      format,
      ranges: parseUnicodeRange(prop("unicode-range") ?? "U+0-10FFFF"),
    });
  }
  return faces;
}

export function parseUnicodeRange(s: string): [number, number][] {
  return s.split(",").map((part) => {
    const t = part.trim().replace(/^U\+/i, "");
    if (t.includes("-")) {
      const [a, b] = t.split("-");
      return [parseInt(a!, 16), parseInt(b!, 16)];
    }
    if (t.includes("?")) {
      return [parseInt(t.replace(/\?/g, "0"), 16), parseInt(t.replace(/\?/g, "F"), 16)];
    }
    const v = parseInt(t, 16);
    return [v, v];
  });
}

/** HTML のテキストに現れるコードポイント。タグを落とし、実体参照は復元する */
export function usedCodePoints(html: string[]): Set<number> {
  const set = new Set<number>();
  for (const h of html) {
    const text = h
      .replace(/<style[\s\S]*?<\/style>/g, "")
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&#x([0-9a-f]+);/gi, (_, x) => String.fromCodePoint(parseInt(x, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
      .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, n) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[n as string]!);
    for (const ch of text) set.add(ch.codePointAt(0)!);
  }
  return set;
}

function intersects(ranges: [number, number][], used: Set<number>): boolean {
  for (const cp of used) {
    for (const [a, b] of ranges) if (cp >= a && cp <= b) return true;
  }
  return false;
}

async function fetchCached(url: string, cacheDir: string, kind: "text" | "binary"): Promise<string | Buffer> {
  fs.mkdirSync(cacheDir, { recursive: true });
  const file = path.join(cacheDir, createHash("sha1").update(url).digest("hex"));
  if (fs.existsSync(file)) return kind === "text" ? fs.readFileSync(file, "utf8") : fs.readFileSync(file);
  const data = await retry(3, async () => {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (!res.ok) throw new Error(`font fetch failed: ${res.status} ${url}`);
    return Buffer.from(await res.arrayBuffer());
  });
  fs.writeFileSync(file, data);
  return kind === "text" ? data.toString("utf8") : data;
}

async function retry<T>(times: number, fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw last;
}

/** 同時接続を絞って順に処理する。gstatic への大量同時接続で失敗するのを避ける */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return out;
}

export interface EmbedFontsOptions {
  fonts: (string | FontSpec)[];
  /** 使う文字の抽出元 */
  html: string[];
  cacheDir: string;
}

/**
 * Google Fonts の CSS を取り、deck で使う文字を含む断片だけを data URI の @font-face にして返す。
 * 外部へ送るのは family 名だけで、本文は送らない。
 */
export async function embedFonts(options: EmbedFontsOptions): Promise<string> {
  if (options.fonts.length === 0) return "";
  const css = (await fetchCached(googleFontsUrl(options.fonts), options.cacheDir, "text")) as string;
  const used = usedCodePoints(options.html);
  const faces = parseFontFaces(css).filter((f) => intersects(f.ranges, used));
  const blocks = await mapLimit(faces, 4, async (f) => {
      const data = (await fetchCached(f.url, options.cacheDir, "binary")) as Buffer;
      const mime = f.format === "woff2" ? "font/woff2" : f.format === "woff" ? "font/woff" : "application/octet-stream";
      const range = f.ranges.map(([a, b]) => (a === b ? `U+${a.toString(16)}` : `U+${a.toString(16)}-${b.toString(16)}`)).join(", ");
      return `@font-face { font-family: "${f.family}"; font-style: ${f.style}; font-weight: ${f.weight}; font-display: swap; src: url(data:${mime};base64,${data.toString("base64")}) format("${f.format}"); unicode-range: ${range}; }`;
  });
  return blocks.join("\n");
}
