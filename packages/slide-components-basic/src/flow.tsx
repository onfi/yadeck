import { z } from "zod";
import { RichText, type BlockOf } from "@yadeck/slide-core";

export const flowType = z.object({
  steps: z
    .array(
      z.object({
        label: z.string().describe("段の名前。見出しとして出す"),
        via: z.string().optional().describe("この段に入ってくる矢印のラベル(変換や処理の名前)"),
        phase: z.string().optional().describe("この段が属する段階の名前。見出しの横に小さく出す"),
        detail: z.string().optional().describe("この段で起きることの一言。説明として出す"),
      }),
    )
    .min(2)
    .describe("流れの各段。順番どおり"),
  focus: z
    .union([z.number().int().min(1), z.array(z.number().int().min(1))])
    .optional()
    .describe("焦点にする段の番号(1 始まり)。配列で複数可。他の段は薄くなる"),
  direction: z
    .enum(["row", "column"])
    .optional()
    .describe("row: 左から右、column: 上から下(既定)。見せ方の種類は block の tags(flow / flow boxed / flow framed / flow grid)で選ぶ"),
});

type FlowProps = BlockOf<typeof flowType>;

/**
 * 流れ(手順)。マークアップと CSS は https://www.ameamelog.com/css-flow/ の 5 パターンを移植したもので、
 * 色をテーマトークンに、寸法をスライド向けに直している(CSS は styles.ts の .b-flow-*)。
 * 構造は共通: ul.b-flow > li > .icon(番号) + dl > dt(見出し) / dd(説明)
 */
function FlowList({ block, variant, numbered }: { block: FlowProps; variant: string; numbered: "step" | "plain" }) {
  const focus = new Set(block.focus === undefined ? [] : Array.isArray(block.focus) ? block.focus : [block.focus]);
  // boxed / framed は原型どおり番号を dt の中(見出しの上)に置く
  const iconInTitle = variant === "boxed" || variant === "framed";
  return (
    <ul className={`b-flow b-flow-${variant} ${focus.size > 0 ? "has-focus" : ""}`}>
      {block.steps.map((st, i) => {
        const num = String(i + 1).padStart(2, "0");
        const icon = <span className="icon">{numbered === "step" ? `STEP.${num}` : num}</span>;
        return (
          <li key={i} className={focus.has(i + 1) ? "is-focus" : ""}>
            {!iconInTitle && icon}
            {st.via && (
              <span className="via">
                <RichText text={st.via} />
              </span>
            )}
            <dl>
              <dt>
                {iconInTitle && icon}
                <RichText text={st.label} />
                {st.phase && !iconInTitle && (
                  <span className="phase">
                    <RichText text={st.phase} />
                  </span>
                )}
              </dt>
              {(st.detail || (st.phase && iconInTitle)) && (
                <dd>
                  {st.phase && iconInTitle && (
                    <span className="phase">
                      <RichText text={st.phase} />
                    </span>
                  )}
                  {st.detail && <RichText text={st.detail} />}
                </dd>
              )}
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

/** `flow`: 縦は 1 カラム構成(STEP ピル + レール + 点線)、横(direction: row)はポップ(吹き出し番号 + 枠カード + ›) */
export const FlowBlock = (block: FlowProps) =>
  block.direction === "row" ? <FlowList block={block} variant="pop" numbered="plain" /> : <FlowList block={block} variant="rail" numbered="step" />;

/** `flow boxed`: 枠線を使ったデザイン。角丸の枠を縦に積み、点線と ▽ でつなぐ */
export const FlowBoxed = (block: FlowProps) => <FlowList block={block} variant="boxed" numbered="step" />;

/** `flow framed`: スタイリッシュ。全体を 1 つの枠で囲み、区切り線に ▽ の切り込み */
export const FlowFramed = (block: FlowProps) => <FlowList block={block} variant="framed" numbered="step" />;

/** `flow grid`: 2 カラム構成。右端が矢印の枠を 2 列に */
export const FlowGrid = (block: FlowProps) => <FlowList block={block} variant="grid" numbered="step" />;
