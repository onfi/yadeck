import { defineConfig } from "@yadeck/slide-core";
import basic from "@yadeck/slide-components-basic";
import plugin from "./src/index.js";

// example/ の見本をプレビューする設定(npm run dev / check / png)。npm に公開するのは dist と example だけで、この設定は含めない。
// 見本の HTML と PNG は、tsc の出力(dist/)と混ざらないよう .slide/preview/ に出す
export default defineConfig({
  plugins: [basic, plugin],
  decks: "example",
  outDir: ".slide/preview",
  fonts: ["Noto Sans JP:400,700", "JetBrains Mono:400"],
});
