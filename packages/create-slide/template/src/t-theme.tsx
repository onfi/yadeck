import { z } from "zod";
import { Block, SlideLayout, definePlugin, pick, pickAll, type SlideOf } from "@yadeck/slide-core";

const sectionType = z.object({ number: z.string() });

const Number = ({ children }: { children: string }) => (
  <div className="flex items-center justify-center bg-accent text-[160px] font-extrabold text-ink">{children}</div>
);

/** `section-header t` の slide。number を大きく出し、heading と body を右に寄せる */
export const TSectionLayout = (slide: SlideOf<typeof sectionType>) => {
  const [heading, rest] = pick(slide.items, ["heading"]);
  const [bodies] = pickAll(rest, ["body"]);
  return (
    <div className="absolute inset-0 grid grid-cols-[320px_1fr] bg-ink text-surface [&_.b-heading]:text-[60px]">
      <Number>{slide.number}</Number>
      <div className="flex flex-col justify-center gap-6 p-20">
        {heading && <Block data={heading} />}
        {bodies.map((b) => (
          <Block key={b.id} data={b} />
        ))}
      </div>
    </div>
  );
};

export const tTheme = definePlugin((c) => {
  c.bind(SlideLayout, ["section-header", "t"], TSectionLayout, { type: sectionType });
});
