import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import type { RichTextOptions } from "./container.js";
import { isInline } from "./inline.js";

export { isInline };

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    "img",
    "h1",
    "h2",
    "span",
    "del",
    "ins",
    "u",
    "mark",
    "small",
    "sup",
    "sub",
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "id", "title"],
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    code: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto", "data"],
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * RichText を HTML 文字列にする。markdown → html の順に処理し、最後に必ず sanitize する。
 * 1行のテキストはインライン(段落で包まない)として扱う。
 */
export function renderRichText(text: string, options: RichTextOptions = {}): string {
  const { markdown = true, html = true } = options;
  let out = html ? text : escapeHtml(text);
  if (markdown) {
    out = isInline(text)
      ? (marked.parseInline(out, { async: false }) as string)
      : (marked.parse(out, { async: false }) as string);
  }
  return sanitizeHtml(out, SANITIZE).trim();
}
