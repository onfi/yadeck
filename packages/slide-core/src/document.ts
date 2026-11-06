import * as fs from "node:fs";
import type { DeckNode } from "@yadeck/slide-schema";
import type { Container, RichTextOptions } from "./container.js";
import { renderDeck } from "./render.js";

/**
 * 16:9 固定枠と print の土台。Layout はこの枠の内側を描く。
 * 画面では幅に合わせて縮小表示し、print では等倍で1枚1ページにする。
 */
export const BASE_CSS = `
:root { --yd-w: 1280px; --yd-h: 720px; --yd-scale: 1; }
html, body { margin: 0; padding: 0; }
body { background: #d9d9d9; }
.yd-deck { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 24px 0; }
.yd-slide-frame {
  width: calc(var(--yd-w) * var(--yd-scale));
  height: calc(var(--yd-h) * var(--yd-scale));
  box-shadow: 0 2px 12px rgba(0,0,0,.25);
}
.yd-slide {
  width: var(--yd-w); height: var(--yd-h);
  transform: scale(var(--yd-scale)); transform-origin: top left;
  overflow: hidden; position: relative; background: #fff; box-sizing: border-box;
}
@media print {
  @page { size: 1280px 720px; margin: 0; }
  body { background: none; }
  .yd-deck { display: block; padding: 0; }
  .yd-slide-frame { width: var(--yd-w); height: var(--yd-h); box-shadow: none; break-after: page; page-break-after: always; }
  .yd-slide-frame:last-child { break-after: auto; page-break-after: auto; }
  .yd-slide { transform: none; }
  .yd-toolbar, .yd-hint, .yd-pointer, .yd-credit { display: none !important; }
}

/* ---- presentation modes (client/present.ts が body にクラスを付ける) ---- */
.yd-toolbar { position: fixed; right: 16px; bottom: 16px; display: flex; gap: 8px; z-index: 10; }
.yd-toolbar button, .yd-footer button, .yd-footer select {
  font: 14px system-ui, sans-serif; padding: 6px 12px; border-radius: 6px; border: 1px solid #888; background: #fff; color: #222; cursor: pointer;
}
.yd-pointer { position: absolute; width: 20px; height: 20px; border-radius: 50%; background: rgba(255,40,40,.85); box-shadow: 0 0 8px rgba(255,0,0,.6); transform: translate(-50%,-50%); pointer-events: none; display: none; z-index: 5; }
.yd-hint { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); padding: 8px 16px; border-radius: 8px; background: rgba(0,0,0,.7); color: #fff; font: 14px system-ui, sans-serif; z-index: 10; }

/* 通常表示の末尾のクレジット。発表・発表者モードと印刷では出さない */
.yd-credit { text-align: center; padding: 8px 16px 32px; font: 13px system-ui, sans-serif; color: #666; }
.yd-credit a { color: inherit; text-decoration: underline; }
body.yd-present .yd-credit, body.yd-presenter .yd-credit { display: none; }
body.yd-present { background: #000; overflow: hidden; }
body.yd-present .yd-deck { height: 100vh; padding: 0; gap: 0; justify-content: center; cursor: none; }
body.yd-present .yd-slide-frame { display: none; box-shadow: none; }
body.yd-present .yd-slide-frame.yd-active { display: block; }
body.yd-black .yd-slide-frame.yd-active .yd-slide { visibility: hidden; }

body.yd-presenter { background: #1a1a1a; color: #eee; overflow: hidden; font: 14px system-ui, sans-serif; }
.yd-console { display: grid; grid-template-columns: 2fr 1fr; grid-template-rows: 1fr auto; gap: 16px; height: 100vh; padding: 16px; box-sizing: border-box; }
.yd-stage { position: relative; min-width: 0; min-height: 0; display: flex; align-items: center; justify-content: center; background: #000; }
.yd-stage .yd-deck { padding: 0; gap: 0; }
.yd-stage .yd-slide-frame, .yd-next .yd-slide-frame { display: none; box-shadow: none; }
.yd-stage .yd-slide-frame.yd-active, .yd-next .yd-slide-frame.yd-active { display: block; }
.yd-side { display: flex; flex-direction: column; gap: 8px; min-height: 0; }
.yd-label { color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
.yd-next { aspect-ratio: 16 / 9; width: 100%; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.yd-next .yd-slide { pointer-events: none; }
.yd-notes-panel { flex: 1; min-height: 0; overflow: auto; padding: 12px; background: #262626; border-radius: 8px; font-size: 20px; line-height: 1.6; }
.yd-notes-panel .yd-muted { color: #777; }
.yd-footer { grid-column: 1 / -1; display: flex; align-items: center; gap: 12px; }
.yd-footer .yd-spacer { flex: 1; }
.yd-footer .yd-timer { font-size: 28px; font-variant-numeric: tabular-nums; }
.yd-footer .yd-clock { color: #999; font-variant-numeric: tabular-nums; }
.yd-footer .yd-counter { font-size: 18px; min-width: 80px; }
`;

let clientScript: string | undefined;

/** tsc が dist/client/present.js に出力したクライアントを読み込む。src から直接実行するテストでは無い */
function loadClientScript(): string {
  if (clientScript === undefined) {
    try {
      clientScript = fs.readFileSync(new URL("./client/present.js", import.meta.url), "utf8");
    } catch {
      clientScript = "";
    }
  }
  return clientScript;
}

const SCALE_SCRIPT = `
(function () {
  function fit() {
    var s = Math.min(1, (window.innerWidth - 32) / 1280);
    document.documentElement.style.setProperty('--yd-scale', String(s));
  }
  window.addEventListener('resize', fit);
  fit();
})();
`;

export interface DocumentOptions {
  container: Container;
  richText?: RichTextOptions;
  /** Tailwind でコンパイル済みのスタイル。無ければプラグインの CSS をそのまま使う */
  css?: string;
  /** renderDeck 済みの本文。候補クラスの抽出に使った HTML を再利用するために渡す */
  body?: string;
  /** dev サーバが差し込む live reload 等の追加スクリプト */
  extraScripts?: string[];
  /** <head> に追加する HTML。フォントの <link> や埋め込み @font-face */
  extraHead?: string;
  /**
   * ブラウザで描き直すページがあるときの設定。data は deck と RichText の変換結果、
   * src は config をブラウザ向けにバンドルしたスクリプト(HTML からの相対パス)
   */
  client?: { data: unknown; src: string };
  /** 末尾に「Created with YADECK」を出すか。既定 true */
  credit?: boolean;
}

export const CREDIT_URL = "https://github.com/onfi/yadeck";

/** 通常表示と deck の一覧の末尾に置くクレジット */
export function creditHtml(): string {
  return `<footer class="yd-credit">Created with <a href="${CREDIT_URL}" target="_blank" rel="noopener">YADECK</a></footer>`;
}

/** <script> の中に JSON を安全に埋め込む(</script> などで閉じられないようにする) */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** SSG 用の完全な HTML ドキュメント */
export function renderDocument(deck: DeckNode, options: DocumentOptions): string {
  const { container, richText, extraScripts = [], extraHead = "" } = options;
  const body = options.body ?? renderDeck(deck, { container, richText });
  const css = options.css ?? container.css;
  const scripts = [SCALE_SCRIPT, ...extraScripts].map((s) => `<script>${s}</script>`).join("\n");
  const client = loadClientScript();
  const clientTag = client ? `<script type="module">${client}</script>` : "";
  // file:// でも読めるよう、モジュールではなく通常のスクリプトとして読み込む
  const islandTags = options.client
    ? `<script type="application/json" id="yd-data">${jsonForScript(options.client.data)}</script>\n<script src="${escapeHtml(options.client.src)}" defer></script>`
    : "";
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(deck.meta.title ?? "")}</title>
${extraHead}
<style>${BASE_CSS}</style>
<style>${css}</style>
</head>
<body>
${body}
${options.credit === false ? "" : creditHtml()}
${scripts}
${clientTag}
${islandTags}
</body>
</html>
`;
}
