import { z } from "zod";
import { BlockLayout, DeckLayout, SlideLayout, type Stage } from "@yadeck/slide-schema";
import type { Binding, Container } from "./container.js";

type JsonSchema = Record<string, unknown>;

const IFACE = { deck: DeckLayout, slide: SlideLayout, block: BlockLayout } as const;
const CHILD: Record<Stage, Stage | undefined> = { deck: "slide", slide: "block", block: undefined };
const CHILD_KEY: Record<Stage, string | undefined> = { deck: "$slides", slide: "$items", block: undefined };
const DOLLAR_KEYS = new Set(["tags", "text", "meta", "version"]);

const dollar = (k: string) => (DOLLAR_KEYS.has(k) ? `$${k}` : k);

/** YAML フル記述では構造キーに `$` を付ける。id は loader が付与するので補完には出さない */
function fullForm(binding: Binding, stage: Stage): JsonSchema {
  const json = z.toJSONSchema(binding.schema, { target: "draft-2020-12", unrepresentable: "any" }) as JsonSchema;
  const props = (json.properties as Record<string, JsonSchema>) ?? {};
  const required = ((json.required as string[] | undefined) ?? []).filter((k) => k !== "id" && k !== "tags");
  const out: Record<string, JsonSchema> = {};
  for (const [k, v] of Object.entries(props)) {
    if (k === "id") continue;
    out[dollar(k)] = v;
  }
  out.$tags = tagsSchema(binding.tags);
  const childKey = CHILD_KEY[stage];
  if (childKey) out[childKey] = { type: "array", items: { $ref: `#/$defs/${CHILD[stage]}` } };
  return {
    type: "object",
    description: describe(binding),
    properties: out,
    required: required.map(dollar),
    additionalProperties: false,
  };
}

function describe(binding: Binding): string {
  const tags = binding.tags.length ? `tags: ${binding.tags.join(" ")}` : "tags なし(既定)";
  return binding.description ? `${tags} — ${binding.description}` : tags;
}

function tagsSchema(tags: string[]): JsonSchema {
  const base: JsonSchema = { type: "array", items: { type: "string" } };
  if (tags.length === 0) return base;
  return { ...base, allOf: tags.map((t) => ({ contains: { const: t } })) };
}

/** sugar: `{ "tag1 tag2": V }`。既知の tags 組み合わせはキー補完に出す */
function singleKeyForm(bindings: Binding[], stage: Stage): JsonSchema {
  const child = CHILD[stage];
  const valueFor = (b: Binding | undefined): JsonSchema => {
    const alts: JsonSchema[] = [{ type: "string" }, { type: "null" }];
    if (child) alts.push({ type: "array", items: { $ref: `#/$defs/${child}` } });
    if (b) {
      const fields = fullForm(b, stage);
      const { $tags: _omit, ...props } = fields.properties as Record<string, JsonSchema>;
      alts.push({ ...fields, properties: props });
    } else {
      alts.push({ type: "object" });
    }
    return { anyOf: alts };
  };
  const properties: Record<string, JsonSchema> = {};
  for (const b of bindings) {
    if (b.tags.length === 0) continue;
    properties[b.tags.join(" ")] = { description: describe(b), ...valueFor(b) };
  }
  return {
    type: "object",
    minProperties: 1,
    maxProperties: 1,
    properties,
    propertyNames: { pattern: "^[^$]" },
    additionalProperties: valueFor(undefined),
  };
}

function stageSchema(container: Container, stage: Stage): JsonSchema {
  const bindings = container.bindingsOf(IFACE[stage]) as Binding[];
  const child = CHILD[stage];
  const alts: JsonSchema[] = [];
  if (stage !== "deck") alts.push({ type: "string" });
  if (child) alts.push({ type: "array", items: { $ref: `#/$defs/${child}` } });
  alts.push(singleKeyForm(bindings, stage));
  alts.push(...bindings.map((b) => fullForm(b, stage)));
  return { anyOf: alts };
}

/**
 * 補完用の JSON Schema。各段の Layout を `tags.contains` 付きの候補として合成する。
 * fallback(tags: [])の bind が全ノードに適合するため oneOf ではなく anyOf で束ねる。
 * 正の検証は zod(validate)で行う。
 */
export function emitJsonSchema(container: Container): JsonSchema {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "YADECK deck",
    $ref: "#/$defs/deck",
    $defs: {
      deck: stageSchema(container, "deck"),
      slide: stageSchema(container, "slide"),
      block: stageSchema(container, "block"),
    },
  };
}
