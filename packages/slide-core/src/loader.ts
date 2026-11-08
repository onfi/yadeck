import { parse as parseYaml } from "yaml";
import {
  CHILDREN_KEY,
  SCHEMA_VERSION,
  type BlockNode,
  type DeckNode,
  type SlideNode,
  type Stage,
} from "@yadeck/slide-schema";
import { splitTags } from "./resolve.js";

export class LoadError extends Error {
  constructor(
    message: string,
    public readonly path: string,
  ) {
    super(`${path}: ${message}`);
  }
}

type Raw = unknown;
type RawMap = Record<string, Raw>;

const NEXT_STAGE: Record<Stage, Stage | undefined> = {
  deck: "slide",
  slide: "block",
  block: undefined,
};

/** 正規形でも構造を表すキー。sugar の単一キー map 判定で tag 名とは見なさない */
const STRUCT_KEYS = new Set(["tags", "slides", "items", "text", "meta", "version", "schema"]);

function isMap(v: Raw): v is RawMap {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isScalar(v: Raw): v is string | number | boolean {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

function isStructKey(k: string): boolean {
  return k.startsWith("$") || STRUCT_KEYS.has(k);
}

function stripDollar(k: string): string {
  return k.startsWith("$") ? k.slice(1) : k;
}

function childrenKeyOf(stage: Stage): "slides" | "items" | undefined {
  return stage === "block" ? undefined : CHILDREN_KEY[stage];
}

/**
 * YAML sugar を正規形へ展開する。段に依存しない規則で、
 * children は段ごとのキー(slides / items)に入れる。
 */
export function expand(v: Raw, stage: Stage, path = "$"): RawMap {
  const next = NEXT_STAGE[stage];
  const childKey = childrenKeyOf(stage);

  if (Array.isArray(v)) {
    if (!next || !childKey) throw new LoadError("block cannot be an array", path);
    return { tags: [], [childKey]: v.map((c, i) => expand(c, next, `${path}[${i}]`)) };
  }
  if (v === null || v === undefined) {
    return wrapToBlock({ tags: [] }, stage, path, {});
  }
  if (isScalar(v)) {
    return wrapToBlock({ tags: [], text: String(v) }, stage, path, {});
  }
  if (!isMap(v)) throw new LoadError(`unsupported value: ${typeof v}`, path);

  const keys = Object.keys(v);
  if (keys.length === 1 && !isStructKey(keys[0]!)) {
    const key = keys[0]!;
    const tags = splitTags(key);
    const value = v[key];
    const p = `${path}.${key}`;
    if (isMap(value)) {
      const node = normalizeMap(value, stage, p);
      node.tags = [...tags, ...(node.tags as string[])];
      return node;
    }
    if (Array.isArray(value)) {
      if (!next || !childKey) throw new LoadError("block cannot have children", p);
      return { tags, [childKey]: value.map((c, i) => expand(c, next, `${p}[${i}]`)) };
    }
    if (value === null || value === undefined) {
      return wrapToBlock({ tags: [] }, stage, p, { tags });
    }
    return wrapToBlock({ tags: [], text: String(value) }, stage, p, { tags });
  }
  return normalizeMap(v, stage, path);
}

/**
 * block 相当の値が上位の段に現れたとき、末端まで落として block を1個持つノードにする。
 * `outer` は最上位ノードに付ける tags
 */
function wrapToBlock(block: RawMap, stage: Stage, path: string, outer: RawMap): RawMap {
  if (stage === "block") return { ...block, ...outer, tags: [...(outer.tags as string[] ?? []), ...(block.tags as string[])] };
  let node: RawMap = block;
  let s: Stage = "block";
  while (s !== stage) {
    const parent = Object.entries(NEXT_STAGE).find(([, n]) => n === s)![0] as Stage;
    node = { tags: [], [childrenKeyOf(parent)!]: [node] };
    s = parent;
  }
  return { ...node, ...outer };
}

function normalizeMap(m: RawMap, stage: Stage, path: string): RawMap {
  const next = NEXT_STAGE[stage];
  const childKey = childrenKeyOf(stage);
  const node: RawMap = {};
  for (const [rawKey, value] of Object.entries(m)) {
    const key = stripDollar(rawKey);
    if (key === "schema") continue;
    if (key === "tags") {
      node.tags = typeof value === "string" ? splitTags(value) : value;
      continue;
    }
    if (key === "slides" || key === "items") {
      if (key !== childKey || !next) throw new LoadError(`"${rawKey}" is not allowed on ${stage}`, path);
      if (!Array.isArray(value)) throw new LoadError(`"${rawKey}" must be an array`, path);
      node[key] = value.map((c, i) => expand(c, next, `${path}.${key}[${i}]`));
      continue;
    }
    if (key === "text" && isScalar(value)) {
      node.text = String(value);
      continue;
    }
    node[key] = value;
  }
  if (!Array.isArray(node.tags)) node.tags = [];
  if (childKey && !Array.isArray(node[childKey])) node[childKey] = [];
  return node;
}

export interface LoadOptions {
  /** meta.title の補完に使う。拡張子は除いて渡す */
  name?: string;
}

/** `$id` の名前を確かめる。URL の # に使うので空白と # を含めず、ページ番号の形(s9)と重複は許さない */
function checkSlideId(id: unknown, page: number, named: Map<string, number>, path: string): string {
  if (typeof id !== "string" || !/^[^\s#]+$/.test(id)) throw new LoadError(`$id must be a string without spaces or "#"`, path);
  if (/^s\d+$/.test(id)) throw new LoadError(`$id "${id}" looks like a page number; choose another name`, path);
  const other = named.get(id);
  if (other !== undefined) throw new LoadError(`$id "${id}" is already used on page ${other}`, path);
  named.set(id, page);
  return id;
}

/** 正規形に id と meta / version の補完を施して DeckNode にする */
export function finalizeDeck(raw: RawMap, options: LoadOptions = {}): DeckNode {
  const named = new Map<string, number>();
  const slides = (raw.slides as RawMap[]).map((s, i): SlideNode => {
    // ページ番号は 1 始まり。右下の表示、check の --slide 9、PNG の s09.png、URL の #s9 がそろう。
    // `$id` で名前を付けたページは、ページを足し引きしても同じ名前で指せる(URL の #名前、--slide 名前)
    const page = i + 1;
    const sid = s.id === undefined ? `s${page}` : checkSlideId(s.id, page, named, `$.slides[${i}]`);
    const items = (s.items as RawMap[]).map((b, j): BlockNode => ({ ...b, id: `${sid}-b${j}` }) as BlockNode);
    return { ...s, id: sid, page, items } as SlideNode;
  });
  const version = raw.version === undefined ? SCHEMA_VERSION : String(raw.version);
  if (version !== SCHEMA_VERSION) {
    throw new LoadError(`unsupported version "${version}" (expected "${SCHEMA_VERSION}")`, "$.version");
  }
  const meta = isMap(raw.meta) ? { ...raw.meta } : {};
  if (typeof meta.title !== "string") {
    const header = slides.find((s) => s.tags.includes("header") && typeof s.title === "string");
    meta.title = header ? (header.title as string) : options.name ?? "untitled";
  }
  return { ...raw, id: "deck", version, meta, slides } as DeckNode;
}

export function loadDeckFromObject(data: Raw, options: LoadOptions = {}): DeckNode {
  return finalizeDeck(expand(data, "deck"), options);
}

export function loadDeckFromYaml(source: string, options: LoadOptions = {}): DeckNode {
  return loadDeckFromObject(parseYaml(source), options);
}

export function loadDeckFromJson(source: string, options: LoadOptions = {}): DeckNode {
  return loadDeckFromObject(JSON.parse(source), options);
}
