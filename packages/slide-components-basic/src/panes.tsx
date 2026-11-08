import { z } from "zod";
import { Block, RichText, pick, type BlockNode, type SlideNode, type SlideOf } from "@yadeck/slide-core";
import type { CSSProperties, ReactNode } from "react";
import { Notes, PAGE, SlideHeading } from "./chrome.js";
import { codeChrome, codeSize } from "./layouts.js";

/**
 * tags 無しの slide の自動レイアウト。
 * 内容を pane に数え、数に応じて配置を決める。
 * - テキスト(body / list / tags 無し / その他の block)は全部まとめて 1 pane
 * - image / code / video は 1 つにつき 1 pane
 * 1: 全面、2: 左右、3: ト型(左 1 + 右 2)、4: 十字、5 以上: 左 floor(N/2) + 右 残り(8 まで)
 */

const SLIDE_W = 1280;
const SLIDE_H = 720;
const PAD_X = 80;
const PAD_Y = 56;
const HEADING_H = 69 + 24;
const DESCRIPTION_H = 36;
const GAP = 32;

/** 1 つで 1 pane になる block の tags */
const PANE_TAGS = ["image", "code", "video", "flow"];

type Pane = { kind: "text"; blocks: BlockNode[] } | { kind: "block"; block: BlockNode };

function isPaneBlock(b: BlockNode): boolean {
  return b.tags.some((t) => PANE_TAGS.includes(t));
}

/** 出現順を保ったまま pane に分ける。テキスト pane は最初のテキスト block の位置に置く */
export function toPanes(blocks: BlockNode[]): Pane[] {
  const panes: Pane[] = [];
  let text: Extract<Pane, { kind: "text" }> | undefined;
  for (const b of blocks) {
    if (b.tags.includes("note")) continue;
    if (isPaneBlock(b)) {
      panes.push({ kind: "block", block: b });
      continue;
    }
    if (!text) {
      text = { kind: "text", blocks: [] };
      panes.push(text);
    }
    text.blocks.push(b);
  }
  return panes;
}

/** pane を左右の列に振り分ける。戻り値は [左の pane 数, 右の pane 数] */
export function splitColumns(n: number): [number, number] {
  if (n <= 1) return [n, 0];
  const left = Math.floor(n / 2);
  return [left, n - left];
}

interface PaneBox {
  w: number;
  h: number;
  /** 縦に積んだときの高さの比(flex-grow) */
  grow?: number;
}


/**
 * 同じ slide に code が 2 つ以上あるとき、全部が収まる最小のフォントサイズを --code-fit で渡す。
 * pane ごとに最大サイズを選ぶと、並んだコードの文字の大きさが揃わないため。式は styles.ts の .b-code と同じ
 */
export function codeFitStyle(placed: { pane: Pane; box: PaneBox }[]): CSSProperties {
  const terms = placed.flatMap(({ pane, box }) => {
    if (pane.kind !== "block" || !pane.block.tags.includes("code")) return [];
    const { cols, rows } = codeSize(pane.block.text);
    const chrome = codeChrome(typeof pane.block.caption === "string" ? pane.block.caption : undefined);
    return [`calc((${Math.round(box.w)}px - 48px) / ${cols} / 0.62)`, `calc((${Math.round(box.h)}px - ${chrome}px) / ${rows} / 1.375)`];
  });
  return terms.length >= 4 ? ({ "--code-fit": `min(${terms.join(", ")})` } as CSSProperties) : {};
}

/**
 * 縦に積む pane の高さの比。全部が code なら「行数 + caption などの余白」の比で分け、
 * 行の多いコードが切れたり、短いコードの箱が間延びしたりしないようにする。それ以外は等分
 */
export function paneWeights(panes: Pane[]): number[] {
  const sizes = panes.map((p) =>
    p.kind === "block" && p.block.tags.includes("code")
      ? codeSize(p.block.text).rows + codeChrome(typeof p.block.caption === "string" ? p.block.caption : undefined) / 24
      : undefined,
  );
  return sizes.every((x) => x !== undefined) ? (sizes as number[]) : panes.map(() => 1);
}

/** 1 列に縦に積んだ pane の寸法 */
function columnBoxes(contentH: number, columnCount: number, column: Pane[]): PaneBox[] {
  const w = columnCount === 1 ? SLIDE_W - PAD_X * 2 : (SLIDE_W - PAD_X * 2 - GAP) / 2;
  const weights = paneWeights(column);
  const total = weights.reduce((a, b) => a + b, 0);
  const free = contentH - GAP * (column.length - 1);
  return weights.map((wt) => ({ w, h: (free * wt) / total, grow: wt }));
}

/** pane の寸法を CSS 変数で渡す。code の自動フォントサイズなどが参照する */
const PaneFrame = ({ box, children }: { box: PaneBox; children: ReactNode }) => (
  <div
    className="b-pane relative flex min-h-0 min-w-0 flex-1 flex-col"
    style={{ "--pane-w": `${Math.round(box.w)}px`, "--pane-h": `${Math.round(box.h)}px`, flexGrow: box.grow ?? 1, flexBasis: 0 } as CSSProperties}
  >
    {children}
  </div>
);

/** テキスト pane。body / list / tags 無しの block は行にまとめ、1 行なら中央に大きく、2 行以上なら箇条書きにする */
export const TextPane = ({ blocks }: { blocks: BlockNode[] }) => {
  const lines: ReactNode[] = [];
  const others: BlockNode[] = [];
  for (const b of blocks) {
    const isText = b.tags.length === 0 || b.tags.includes("body") || b.tags.includes("list");
    if (!isText) {
      others.push(b);
      continue;
    }
    for (const line of (b.text ?? "").split("\n")) {
      if (line.trim()) lines.push(<RichText key={`${b.id}-${lines.length}`} text={line} />);
    }
  }
  if (lines.length === 1 && others.length === 0) {
    return (
      <div className="b-center flex flex-1 items-center justify-center text-center text-h3 leading-relaxed">
        {lines[0]}
      </div>
    );
  }
  return (
    <div className="b-bullets flex flex-1 flex-col justify-center gap-5">
      {lines.length > 0 && (
        <ul className="m-0 list-disc pl-[1.2em] marker:text-accent">
          {lines.map((l, i) => (
            <li key={i} className="my-2">
              {l}
            </li>
          ))}
        </ul>
      )}
      {others.map((b) => (
        <Block key={b.id} data={b} />
      ))}
    </div>
  );
};

const PaneView = ({ pane, box }: { pane: Pane; box: PaneBox }) => (
  <PaneFrame box={box}>{pane.kind === "text" ? <TextPane blocks={pane.blocks} /> : <Block data={pane.block} />}</PaneFrame>
);

export const DefaultSlide = (slide: SlideNode) => {
  const [heading, rest] = pick(slide.items, ["heading"]);
  const panes = toPanes(rest);
  const contentH = SLIDE_H - PAD_Y * 2 - (heading ? HEADING_H : 0) - (heading && slide.description ? DESCRIPTION_H : 0);
  const [leftCount, rightCount] = splitColumns(panes.length);
  const left = panes.slice(0, leftCount);
  const right = panes.slice(leftCount);
  const columns = panes.length <= 1 ? [panes] : [left, right];
  const boxes = columns.map((column) => columnBoxes(contentH, columns.length, column));
  const placed = columns.flatMap((column, ci) => column.map((pane, i) => ({ pane, box: boxes[ci]![i]! })));

  return (
    <div className={`${PAGE} b-default`} style={codeFitStyle(placed)}>
      {heading && <SlideHeading block={heading} description={slide.description} />}
      {panes.length <= 1 ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {panes[0] && <PaneView pane={panes[0]} box={boxes[0]![0]!} />}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-8">
          {columns.map((column, ci) => (
            <div key={ci} className="flex min-h-0 min-w-0 flex-col gap-8">
              {column.map((pane, i) => (
                <PaneView key={i} pane={pane} box={boxes[ci]![i]!} />
              ))}
            </div>
          ))}
        </div>
      )}
      <Notes items={slide.items} />
    </div>
  );
};

/** columns の列数。4 までは横一列、5 以上は 3 列で折り返す */
export function columnsFor(n: number): number {
  return n <= 4 ? Math.max(1, n) : 3;
}

/**
 * 主役と従の比。黄金比 φ。columns の focus では主役の列を他の列の φ 倍に、
 * main-left / main-right では大きい区画と積む側を φ:1(約 62:38)に分ける
 */
export const PHI = (1 + Math.sqrt(5)) / 2;

export const columnsType = z.object({
  focus: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      "主役にする列の番号(1 始まり。テキストはまとめて 1 つ、code / image / video / flow は 1 つずつ数える)。主役の列を他の列の黄金比倍(約 1.6 倍)の幅にする",
    ),
});

/** 列の幅の比。focus の列だけ φ、他は 1 */
export function columnWeights(cols: number, focusColumn: number | undefined): number[] {
  return Array.from({ length: cols }, (_, i) => (i === focusColumn ? PHI : 1));
}

/**
 * `columns`。pane を横一列に並べる(4 まで。5 以上は 3 列で折り返す)。
 * 既定は等分。focus で主役を指定すると、主役の列を他の列の黄金比倍の幅にする
 */
export const ColumnsSlide = (slide: SlideOf<typeof columnsType>) => {
  const [heading, rest] = pick(slide.items, ["heading"]);
  const panes = toPanes(rest);
  const contentH = SLIDE_H - PAD_Y * 2 - (heading ? HEADING_H : 0) - (heading && slide.description ? DESCRIPTION_H : 0);
  const contentW = SLIDE_W - PAD_X * 2;
  const cols = columnsFor(panes.length);
  const rows = Math.max(1, Math.ceil(panes.length / cols));
  const focusColumn = slide.focus !== undefined && slide.focus <= panes.length ? (slide.focus - 1) % cols : undefined;
  const weights = columnWeights(cols, focusColumn);
  const total = weights.reduce((a, b) => a + b, 0);
  const freeW = contentW - GAP * (cols - 1);
  const h = (contentH - GAP * (rows - 1)) / rows;
  const boxOf = (i: number): PaneBox => ({ w: (freeW * weights[i % cols]!) / total, h });
  return (
    <div className={`${PAGE} b-columns`} style={codeFitStyle(panes.map((pane, i) => ({ pane, box: boxOf(i) })))}>
      {heading && <SlideHeading block={heading} description={slide.description} />}
      <div
        className="grid min-h-0 flex-1 gap-8"
        style={{
          gridTemplateColumns: weights.map((w) => `minmax(0, ${w}fr)`).join(" "),
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {panes.map((pane, i) => (
          <PaneView key={i} pane={pane} box={boxOf(i)} />
        ))}
      </div>
      <Notes items={slide.items} />
    </div>
  );
};

/** 縦に積んだ pane の寸法(高さは paneWeights の比で分ける) */
function stackBoxes(w: number, h: number, panes: Pane[]): PaneBox[] {
  const weights = paneWeights(panes);
  const total = weights.reduce((a, b) => a + b, 0);
  const free = h - GAP * (panes.length - 1);
  return weights.map((wt) => ({ w, h: (free * wt) / total, grow: wt }));
}

/**
 * `main-left` / `main-right`。1 つの区画を大きく置き、残りを反対側に縦に積む(ト型とその逆)。
 * main-left は最初の区画を左に、main-right は最後の区画を右に大きく置く(左から右へ読む順のまま)。
 * 大きい区画と積む側は黄金比(約 62:38)で分ける
 */
function MainSideSlide({ slide, side }: { slide: SlideNode; side: "left" | "right" }) {
  const [heading, rest] = pick(slide.items, ["heading"]);
  const panes = toPanes(rest);
  const contentH = SLIDE_H - PAD_Y * 2 - (heading ? HEADING_H : 0) - (heading && slide.description ? DESCRIPTION_H : 0);
  const free = SLIDE_W - PAD_X * 2 - GAP;
  const main = side === "left" ? panes[0] : panes[panes.length - 1];
  const others = side === "left" ? panes.slice(1) : panes.slice(0, -1);
  const mainBox: PaneBox = { w: (free * PHI) / (PHI + 1), h: contentH };
  const stack = stackBoxes(free - mainBox.w, contentH, others);
  const placed = [...(main ? [{ pane: main, box: mainBox }] : []), ...others.map((pane, i) => ({ pane, box: stack[i]! }))];
  const mainView = main && <PaneView pane={main} box={others.length > 0 ? mainBox : { w: free + GAP, h: contentH }} />;
  const stackView = (
    <div className="flex min-h-0 min-w-0 flex-col gap-8">
      {others.map((pane, i) => (
        <PaneView key={i} pane={pane} box={stack[i]!} />
      ))}
    </div>
  );
  const columns = others.length === 0 ? "minmax(0, 1fr)" : side === "left" ? `minmax(0, ${PHI}fr) minmax(0, 1fr)` : `minmax(0, 1fr) minmax(0, ${PHI}fr)`;
  return (
    <div className={`${PAGE} b-main-${side}`} style={codeFitStyle(placed)}>
      {heading && <SlideHeading block={heading} description={slide.description} />}
      <div className="grid min-h-0 flex-1 gap-8" style={{ gridTemplateColumns: columns }}>
        {side === "left" ? (
          <>
            {mainView}
            {others.length > 0 && stackView}
          </>
        ) : (
          <>
            {others.length > 0 && stackView}
            {mainView}
          </>
        )}
      </div>
      <Notes items={slide.items} />
    </div>
  );
}

export const MainLeftSlide = (slide: SlideNode) => <MainSideSlide slide={slide} side="left" />;
export const MainRightSlide = (slide: SlideNode) => <MainSideSlide slide={slide} side="right" />;
