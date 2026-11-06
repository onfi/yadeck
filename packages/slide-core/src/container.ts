import { z } from "zod";
import {
  BASE_SCHEMAS,
  type FieldsSchema,
  type Interface,
  type LayoutComponent,
  type PropsOf,
  type Stage,
  type Tags,
} from "@yadeck/slide-schema";
import type { FontSpec } from "./fonts.js";
import { bestIndex, sameTagSet, splitTags } from "./resolve.js";

export interface BindOptions<T extends FieldsSchema> {
  /** 自分のフィールドのみ。tags / children / text は core が規定する */
  type?: T;
  /** この Layout の用途。JSON Schema に出て、補完やエージェントが tags を選ぶ手がかりになる */
  description?: string;
  /**
   * true なら、この Layout を使うページをブラウザでも React で描き直す(WebGL、canvas、JS のアニメーションなど)。
   * build は config をブラウザ向けにもバンドルし、ページが表示されたときにマウントする
   */
  client?: boolean;
}

export interface Binding<P = unknown> {
  iface: Interface<P>;
  tags: Tags;
  component: LayoutComponent<P>;
  /** bind 時に渡された自分のフィールドの schema */
  type: FieldsSchema;
  /** 段の共通部 + type。validate と JSON Schema 合成に使う */
  schema: z.ZodObject<z.ZodRawShape>;
  description?: string;
  client?: boolean;
}

export class ConfigError extends Error {}

/**
 * Interface + tags で実装を解決する DI コンテナ。
 * 同じ Interface・同じ tags 集合への bind は後から登録した方で置き換える。
 */
export class Container {
  private readonly bindings = new Map<string, Binding[]>();
  private readonly styles: string[] = [];

  bind<I extends Interface<unknown, Stage>, T extends FieldsSchema = z.ZodObject<{}>>(
    iface: I,
    tags: Tags | string,
    component: LayoutComponent<PropsOf<I> & z.infer<T>>,
    options: BindOptions<T> = {},
  ): this {
    const tagList = typeof tags === "string" ? splitTags(tags) : [...tags];
    const type = options.type ?? (z.object({}) as unknown as T);
    const base = BASE_SCHEMAS[iface.stage] as z.ZodObject<z.ZodRawShape>;
    const binding: Binding = {
      iface,
      tags: tagList,
      component: component as LayoutComponent<unknown>,
      type,
      schema: base.extend(type.shape),
      description: options.description,
      client: options.client,
    };
    const list = this.bindings.get(iface.name) ?? [];
    const dup = list.findIndex((b) => sameTagSet(b.tags, tagList));
    if (dup >= 0) list.splice(dup, 1);
    list.push(binding);
    this.bindings.set(iface.name, list);
    return this;
  }

  /** CSS を deck の出力に同梱する。登録順に連結される */
  addStyle(css: string): this {
    this.styles.push(css);
    return this;
  }

  get css(): string {
    return this.styles.join("\n");
  }

  bindingsOf<I extends Interface<unknown, Stage>>(iface: I): Binding<PropsOf<I>>[] {
    return (this.bindings.get(iface.name) ?? []) as Binding<PropsOf<I>>[];
  }

  /** bind が1つでもあれば必ず返す。ゼロは構成エラー */
  resolve<I extends Interface<unknown, Stage>>(iface: I, tags: Tags): Binding<PropsOf<I>> {
    const list = this.bindingsOf(iface);
    const idx = bestIndex(list, (b) => b.tags, tags, "last");
    if (idx < 0) {
      throw new ConfigError(
        `No binding for ${iface.name}. Register at least one plugin that binds it (e.g. the basic plugin).`,
      );
    }
    return list[idx]!;
  }
}

export type Plugin = (c: Container) => void;

/** 利用者が書くプラグインの定義。型付けのための identity */
export function definePlugin(plugin: Plugin): Plugin {
  return plugin;
}

export interface RichTextOptions {
  /** markdown を解釈する。既定 true */
  markdown?: boolean;
  /** 生 HTML を通す(sanitize はされる)。既定 true */
  html?: boolean;
}

export interface SlideConfig {
  /** 配列順 = 登録順。後段は前段を黙って上書きする */
  plugins: Plugin[];
  /** deck ファイルのディレクトリ。既定 "decks" */
  decks?: string;
  /** 出力先。既定 "dist" */
  outDir?: string;
  /** そのまま出力先へコピーする静的ファイルのディレクトリ。既定 "public"。画像は `./name.png` で参照する */
  publicDir?: string;
  /** 補完用 JSON Schema の出力先。既定 ".slide/deck.schema.json" */
  schemaPath?: string;
  /** deck 単位の RichText 設定 */
  richText?: RichTextOptions;
  /**
   * テーマ CSS のパス。Tailwind v4 の記法で `@theme { --color-primary: ... }` のようにトークンを上書きする。
   * プラグインの既定テーマより後に読まれる
   */
  theme?: string;
  /** dev サーバのポート。既定 3000 */
  port?: number;
  /**
   * Google Fonts の指定。"Noto Sans JP:400,700" / "JetBrains Mono" の形。
   * dev では <link> で読み、build では使う文字を含む断片だけを data URI で埋め込む
   */
  fonts?: (string | FontSpec)[];
  /** build でフォントを埋め込むか。既定 true。false なら build でも <link> にする */
  embedFonts?: boolean;
  /** dev で追加監視するパス。file: 指定でリンクしたプラグインの dist など、リポジトリ外の変更を拾う */
  watch?: string[];
}

export function defineConfig(config: SlideConfig): SlideConfig {
  return config;
}

export function createContainer(plugins: Plugin[]): Container {
  const c = new Container();
  for (const p of plugins) p(c);
  return c;
}
