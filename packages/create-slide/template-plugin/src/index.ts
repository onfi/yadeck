import { SlideLayout, definePlugin } from "@yadeck/slide-core";
import { HeroSlide, heroType } from "./layouts.js";

/**
 * deck の slide.config.ts の plugins に足して使う(npx yadeck add で入る)。
 * description は schema に出て、AI が tags を選ぶ手がかりになる。見た目より先に「どういう内容のページで使うか」を書く
 */
export default definePlugin((c) => {
  c.bind(SlideLayout, ["hero"], HeroSlide, {
    type: heroType,
    description: "発表の核になる一言を、全面に大きく見せる。message に一言、items に補足を書く",
  });
});
