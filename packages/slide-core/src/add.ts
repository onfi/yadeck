import { BlockLayout, DeckLayout, SlideLayout } from "@yadeck/slide-schema";
import type { Container } from "./container.js";

/**
 * `yadeck add <package>` の中身のうち、ファイルやプロセスに触らない部分。
 * slide.config.ts の書き換えと、プラグインを足して増えた tags の洗い出し
 */

/** npm に渡す指定(`@scope/name@1.2.0`、`name@latest`)からパッケージ名を取る。パスや URL なら undefined */
export function packageNameOf(spec: string): string | undefined {
  if (/^(\.|\/|file:|git[+:]|https?:|github:)/.test(spec)) return undefined;
  const m = /^(@[^/@]+\/[^/@]+|[^/@]+)(@.*)?$/.exec(spec);
  return m?.[1];
}

/**
 * import に使う変数名。`@acme/yadeck-plugin-chart` → `chart`。
 * 決まった接頭辞を外して camelCase にし、config の中で使われている名前とぶつかれば番号を付ける
 */
export function pluginIdent(name: string, source: string): string {
  const base = name
    .replace(/^@[^/]+\//, "")
    .replace(/^(yadeck-plugin-|yadeck-theme-|slide-components-|yadeck-)/, "")
    .replace(/[^A-Za-z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/[^A-Za-z0-9]/g, "");
  const ident = /^[A-Za-z_$]/.test(base) ? base : `plugin${base.charAt(0).toUpperCase()}${base.slice(1)}`;
  const taken = (id: string) => new RegExp(`\\b${id}\\b`).test(source);
  if (!taken(ident)) return ident;
  for (let i = 2; ; i++) if (!taken(`${ident}${i}`)) return `${ident}${i}`;
}

export interface ConfigEdit {
  source: string;
  ident: string;
  /** 既に import されていて、書き換えなかった */
  alreadyAdded: boolean;
}

/**
 * slide.config.ts に `import x from "<name>"` を足し、`plugins: [...]` の最後に x を足す。
 * 最後に置くのは、後から登録したプラグインが同じ tags の Layout を上書きできるようにするため。
 * 形を読み取れないときは例外にして、利用者に手で足してもらう
 */
export function addPluginToConfig(source: string, name: string): ConfigEdit {
  const existing = new RegExp(`^import\\s+(\\w+)\\s+from\\s+["']${name.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}["'];?\\s*$`, "m").exec(source);
  if (existing) return { source, ident: existing[1]!, alreadyAdded: true };

  const plugins = /plugins\s*:\s*\[([\s\S]*?)\]/.exec(source);
  if (!plugins) throw new Error("slide.config.ts に `plugins: [...]` が見つかりません");
  const ident = pluginIdent(name, source);

  const inner = plugins[1]!;
  const trimmed = inner.replace(/\s+$/, "");
  const trailing = inner.slice(trimmed.length);
  const items = trimmed.replace(/,$/, "");
  const nextInner = items.trim() === "" ? ident : `${items}, ${ident}${trimmed.endsWith(",") ? "," : ""}${trailing}`;
  const start = plugins.index + plugins[0].indexOf("[") + 1;
  let out = source.slice(0, start) + nextInner + source.slice(start + inner.length);

  const imports = [...out.matchAll(/^import[^\n]*\n/gm)];
  const importLine = `import ${ident} from "${name}";\n`;
  if (imports.length > 0) {
    const last = imports[imports.length - 1]!;
    const at = last.index + last[0].length;
    out = out.slice(0, at) + importLine + out.slice(at);
  } else {
    out = importLine + out;
  }
  return { source: out, ident, alreadyAdded: false };
}

export interface AddedLayout {
  stage: "deck" | "slide" | "block";
  tags: string[];
  description?: string;
  /** 既にあった同じ tags の Layout を置き換えた */
  replaced: boolean;
}

const IFACES = [DeckLayout, SlideLayout, BlockLayout] as const;

/** プラグインを足す前と後のコンテナを比べ、新しく使えるようになった(または置き換わった)Layout を返す */
export function diffLayouts(before: Container, after: Container): AddedLayout[] {
  const key = (tags: string[]) => [...tags].sort().join(" ");
  const out: AddedLayout[] = [];
  for (const iface of IFACES) {
    const old = new Map(before.bindingsOf(iface).map((b) => [key(b.tags), b]));
    for (const b of after.bindingsOf(iface)) {
      const prev = old.get(key(b.tags));
      if (prev && prev.component === b.component) continue;
      out.push({ stage: iface.stage, tags: b.tags, description: b.description, replaced: prev !== undefined });
    }
  }
  return out;
}
