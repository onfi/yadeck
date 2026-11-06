import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import { createRequire } from "node:module";
import * as path from "node:path";

const require = createRequire(import.meta.url);

export interface BuildCssOptions {
  /** 相対パス解決の基準。利用者リポジトリのルート */
  base: string;
  /** 利用者のテーマ CSS(絶対パス)。`@theme` でトークンを上書きする */
  themeFile?: string;
  /** プラグインが addStyle した CSS と既定テーマ。テーマ CSS より前に置く */
  pluginCss: string;
  /** 候補クラスを拾う HTML */
  html: string[];
}

/**
 * Tailwind v4 を JS API で実行する。自動スキャン(source)は切り、描画済み HTML から候補を渡す。
 * 入力の順序は tailwind → プラグイン CSS(既定テーマ含む) → 利用者テーマで、後の `@theme` が前を上書きする。
 */
export async function buildCss(options: BuildCssOptions): Promise<string> {
  const { base, themeFile, pluginCss, html } = options;
  const input = [
    `@import "tailwindcss" source(none);`,
    pluginCss,
    themeFile ? `@import "${toImportPath(themeFile)}";` : "",
  ].join("\n");

  const compiler = await compile(input, {
    base,
    onDependency: () => {},
    // tailwindcss 本体は利用者の node_modules に hoist されない構成もあるので core 側から解決する
    customCssResolver: async (id) => (id === "tailwindcss" ? require.resolve("tailwindcss/index.css") : undefined),
  });
  const scanner = new Scanner({ sources: [] });
  // React は属性値の & を &amp; にするので、`[&_.b-item]:text-center` のような候補を拾えるよう戻してから渡す
  const candidates = scanner.scanFiles(html.map((content) => ({ content: content.replace(/&amp;/g, "&"), extension: "html" })));
  return compiler.build(candidates);
}

function toImportPath(file: string): string {
  return path.resolve(file).replace(/\\/g, "/");
}
