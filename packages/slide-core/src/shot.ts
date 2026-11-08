import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * ビルド済みの deck HTML を headless Chromium で開き、スライドごとに
 * - はみ出し・切れの検査(inspect)
 * - PNG の書き出し
 * を行う。playwright は任意依存なので、使うときだけ読み込む。
 *
 * スライドは print 用の CSS(等倍で縦に並ぶ)で描画するので、1 枚 = 1280x720 の .yd-slide をそのまま測れる。
 * 装飾として意図的に枠外へ出す要素は、Layout 側で aria-hidden="true" を付けて検査から外す。
 * 出典(.yd-sources)も、下端の余白に置いて省略記号で切る前提なので検査しない。
 */

export type IssueLevel = "error" | "warn";

export interface SlideIssue {
  level: IssueLevel;
  message: string;
}

export interface SlideReport {
  /** スライドの id。`$id` で付けた名前か、s1, s2, ...。URL の # と同じ */
  id: string;
  /** 1 始まりのページ番号。右下の表示と同じ */
  page: number;
  issues: SlideIssue[];
  png?: string;
}

export interface ShotOptions {
  /** 検査する deck の HTML */
  htmlFile: string;
  /** PNG の出力先ディレクトリ。省略すると書き出さない */
  pngDir?: string;
  /** true なら問題のあったスライドだけ PNG にする */
  pngOnlyIssues?: boolean;
  /** 対象のページ。ページ番号(9 / s9)か `$id` の名前。省略で全部 */
  slides?: string[];
  /** PNG の倍率 */
  scale?: number;
}

/** スライドの端からこの距離までを「余白」とみなし、内容が入ったら警告する */
const SAFE_MARGIN = 32;
/** basic の code の下限フォントサイズ。ここまで縮んだら警告する */
const MIN_CODE_FONT = 14;

type Playwright = typeof import("playwright");

async function loadPlaywright(): Promise<Playwright> {
  try {
    return await import("playwright");
  } catch {
    throw new Error(
      "playwright が見つかりません。deck リポジトリで次を実行してください:\n  npm i -D playwright && npx playwright install chromium",
    );
  }
}

type Browser = Awaited<ReturnType<Playwright["chromium"]["launch"]>>;

/** 1 つのブラウザで複数 deck を処理するためのセッション */
export class ShotSession {
  private constructor(private readonly browser: Browser) {}

  static async open(): Promise<ShotSession> {
    const { chromium } = await loadPlaywright();
    return new ShotSession(await chromium.launch());
  }

  async close(): Promise<void> {
    await this.browser.close();
  }

  async run(options: ShotOptions): Promise<SlideReport[]> {
    const context = await this.browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: options.scale ?? 1 });
    try {
      const page = await context.newPage();
      await page.emulateMedia({ media: "print" });
      await page.goto(pathToFileURL(options.htmlFile).href, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const reports = (await page.evaluate(inspectSlides, { safe: SAFE_MARGIN, minCode: MIN_CODE_FONT })) as SlideReport[];
      const selected = options.slides && options.slides.length > 0 ? selectSlides(reports, options.slides) : reports;
      if (options.pngDir) {
        fs.mkdirSync(options.pngDir, { recursive: true });
        const slides = page.locator(".yd-slide");
        for (const r of selected) {
          if (options.pngOnlyIssues && r.issues.length === 0) continue;
          const index = reports.indexOf(r);
          const file = path.join(options.pngDir, `${pngName(r.page)}.png`);
          await waitForClient(page, r.id);
          await slides.nth(index).screenshot({ path: file });
          r.png = file;
        }
      }
      return selected;
    } finally {
      await context.close();
    }
  }
}

/** ブラウザで描き直すページなら、表示してからマウントと数フレームの描画を待つ(WebGL などが絵を出すまで) */
async function waitForClient(page: import("playwright").Page, id: string): Promise<void> {
  const frame = page.locator(`[id="${id}"]`);
  const isClient = await frame.evaluate((el) => el.hasAttribute("data-yd-client") || el.querySelector("template[data-yd-client]") !== null);
  if (!isClient) return;
  await frame.scrollIntoViewIfNeeded();
  try {
    await page.waitForSelector(`[id="${id}"][data-yd-mounted]`, { timeout: 10_000 });
  } catch {
    return;
  }
  await page.waitForTimeout(CLIENT_SETTLE_MS);
}

/** マウント後、アニメーションや WebGL の最初の描画を待つ時間 */
const CLIENT_SETTLE_MS = 800;

/** 9 → s09。ファイル名で並べたときにスライド順になるよう 2 桁にそろえる */
export function pngName(page: number): string {
  return `s${String(page).padStart(2, "0")}`;
}

/** --slide の指定(9 / s9 / 名前)でページを選ぶ。どれにも当たらない指定はエラーにする */
export function selectSlides<T extends { id: string; page: number }>(reports: T[], wanted: string[]): T[] {
  const hit = (r: T, w: string) => r.id === w || String(r.page) === w.replace(/^s(?=\d+$)/, "");
  const missing = wanted.filter((w) => !reports.some((r) => hit(r, w)));
  if (missing.length > 0) throw new Error(`--slide に当たるページがありません: ${missing.join(", ")}`);
  return reports.filter((r) => wanted.some((w) => hit(r, w)));
}

/**
 * ブラウザ内で実行する検査。外の変数を参照しないこと(page.evaluate でシリアライズされる)。
 * - テキストがスライドの外、または overflow を切る祖先の外に出ていれば error
 * - 枠や背景を持つ箱・画像・コードがスライドの外に出ていれば error
 * - それらが端から safe px 以内の余白に入っていれば warn(端に接して敷いた帯や背景は除く)
 * - code が下限サイズまで縮んでいる、行が折り返している場合は warn
 */
function inspectSlides({ safe, minCode }: { safe: number; minCode: number }): SlideReport[] {
  const frames = Array.from(document.querySelectorAll<HTMLElement>(".yd-slide-frame"));
  const snippet = (el: Element) => {
    const t = ((el as HTMLElement).innerText ?? el.textContent ?? "").replace(/\s+/g, " ").trim();
    return t.length > 24 ? `${t.slice(0, 24)}…` : t;
  };
  const describe = (el: Element) => {
    const cls = Array.from(el.classList).find((c) => c.startsWith("b-")) ?? el.tagName.toLowerCase();
    const t = snippet(el);
    return t ? `${cls} 「${t}」` : cls;
  };
  // 出典は下端の余白に置き、長い題名は省略記号で切る前提なので、余白と切れの検査から外す
  const skip = (el: Element) => !!el.closest('[aria-hidden="true"], .yd-notes, .yd-sources');
  const outside = (r: DOMRect, b: DOMRect, m = 0) =>
    r.left < b.left + m - 0.5 || r.top < b.top + m - 0.5 || r.right > b.right - m + 0.5 || r.bottom > b.bottom - m + 0.5;

  return frames.map((frame) => {
    const slide = frame.querySelector<HTMLElement>(".yd-slide")!;
    const sr = slide.getBoundingClientRect();
    const issues: SlideIssue[] = [];
    const seen = new Set<string>();
    const add = (level: IssueLevel, message: string) => {
      if (seen.has(message)) return;
      seen.add(message);
      issues.push({ level, message });
    };

    // テキスト: 文字の矩形で測る
    const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || !n.textContent?.trim() || skip(el)) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
      if (rects.length === 0) continue;
      const block = el.closest("p, li, dt, dd, h1, h2, h3, h4, pre, figcaption, div") ?? el;
      if (rects.some((r) => outside(r, sr))) {
        add("error", `スライドの外にはみ出している: ${describe(block)}`);
        continue;
      }
      let clipped = false;
      for (let a = el.parentElement; a && a !== slide && !clipped; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
        const ar = a.getBoundingClientRect();
        if (rects.some((r) => outside(r, ar))) clipped = true;
      }
      if (clipped) add("error", `枠で切れて見えない: ${describe(block)}`);
      else if (rects.some((r) => outside(r, sr, safe))) add("warn", `端の余白に入っている: ${describe(block)}`);
    }

    // 箱: 枠線・背景・画像・コードを持つ要素。スライド全面の背景は除く
    for (const el of Array.from(slide.querySelectorAll<HTMLElement>("*"))) {
      if (skip(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width >= sr.width - 1 && r.height >= sr.height - 1) continue;
      const cs = getComputedStyle(el);
      const tag = el.tagName.toLowerCase();
      const visual = ["img", "svg", "video", "iframe", "pre"].includes(tag);
      const bg = cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent";
      const border = ["Top", "Right", "Bottom", "Left"].some(
        (s) => parseFloat(cs.getPropertyValue(`border-${s.toLowerCase()}-width`)) > 0 && cs.getPropertyValue(`border-${s.toLowerCase()}-style`) !== "none",
      );
      if (!visual && !bg && !border) continue;
      if (el.closest("pre") && tag !== "pre") continue;
      // 端にぴったり接して敷いた帯や背景は、意図した全面のデザインとみなして余白の警告から外す
      const flush = Math.abs(r.left - sr.left) < 0.5 || Math.abs(r.top - sr.top) < 0.5 || Math.abs(r.right - sr.right) < 0.5 || Math.abs(r.bottom - sr.bottom) < 0.5;
      if (outside(r, sr)) add("error", `スライドの外にはみ出している: ${describe(el)}`);
      else if (!flush && outside(r, sr, safe)) add("warn", `端の余白に入っている: ${describe(el)}`);
    }

    // コード: 下限サイズと折り返し
    for (const pre of Array.from(slide.querySelectorAll<HTMLElement>("pre.b-code"))) {
      if (skip(pre)) continue;
      const cs = getComputedStyle(pre);
      const fs = parseFloat(cs.fontSize);
      const lh = parseFloat(cs.lineHeight) || fs * 1.375;
      const rows = Array.from(pre.querySelectorAll<HTMLElement>("code > span"));
      const first = (rows[0]?.textContent ?? pre.textContent ?? "").trim();
      const name = `「${first.length > 24 ? `${first.slice(0, 24)}…` : first}」`;
      if (fs <= minCode + 0.01) add("warn", `コードが下限の ${minCode}px まで縮んでいる: ${name}`);
      if (rows.some((row) => row.getBoundingClientRect().height > lh * 1.5)) add("warn", `コードの行が折り返している: ${name}`);
    }

    return { id: frame.id, page: Number(frame.dataset.page), issues };
  });
}
