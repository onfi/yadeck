import { Block, RichText, type BlockNode } from "@yadeck/slide-core";

/** スライド枠いっぱいに広げる共通のパディング付きコンテナ */
export const PAGE = "absolute inset-0 flex flex-col gap-6 px-20 py-14";

/**
 * スライド上部の見出し。accent の縦バーと primary の細い下線で、表紙と同じ文法にする。
 * slide の description があれば見出しの下に 1 行添える
 */
/** 見出しの表示幅(全角 2、半角 1)。長い見出しは 1 段小さくして 1 行に収める */
function headingWidth(text: string): number {
  let w = 0;
  for (const ch of text.replace(/[`*_]/g, "")) w += (ch.codePointAt(0) ?? 0) > 0x2e7f ? 2 : 1;
  return w;
}

export const SlideHeading = ({ block, description }: { block: BlockNode; description?: string }) => (
  <header className="flex flex-col gap-2">
    <div
      className={`flex items-center gap-4 border-b-2 border-primary/30 pb-3 ${
        headingWidth(block.text ?? "") > 44 ? "[&_.b-heading]:text-h3" : "[&_.b-heading]:text-h2"
      }`}
    >
      <span className="h-10 w-2 shrink-0 rounded-sm bg-accent" />
      <Block data={block} />
    </div>
    {description && <RichText as="p" className="m-0 pl-6 text-small leading-snug text-muted" text={description} />}
  </header>
);

/**
 * 発表者ノート(note の block)。画面と印刷には出ないが、発表者モードがページの中から読み取るので、
 * どの Layout も items のノートを必ず描く
 */
export const Notes = ({ items }: { items: BlockNode[] }) => (
  <>
    {items
      .filter((b) => b.tags.includes("note"))
      .map((b) => (
        <Block key={b.id} data={b} />
      ))}
  </>
);
