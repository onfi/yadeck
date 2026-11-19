import { z } from "zod";
import { Block, RichText, type SlideOf } from "@yadeck/slide-core";

/** hero の data。色や位置などの見た目は持たせず、何を伝えるかだけを書かせる */
export const heroType = z.object({
  message: z.string().describe("全面に大きく出す一言。markdown 可"),
});

/**
 * 一言を中央に大きく出し、items(補足や発表者ノート)をその下に描く。
 * 色や文字の大きさは deck のテーマのトークン(bg-primary、text-surface、text-display など)で指定し、テーマに従わせる
 */
export const HeroSlide = (slide: SlideOf<typeof heroType>) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-10 bg-primary px-20 py-14 text-center text-surface">
    <RichText as="p" className="m-0 text-display leading-tight font-bold" text={slide.message} />
    {slide.items.map((b) => (
      <Block key={b.id} data={b} />
    ))}
  </div>
);
