import { defineConfig } from "@yadeck/slide-core";
import basic from "@yadeck/slide-components-basic";
import { tTheme } from "./src/t-theme.js";

// 配列順 = 登録順。後のプラグインが同じ Interface + tags を bind すると前を上書きする
export default defineConfig({
  plugins: [basic, tTheme],
  // Tailwind v4 の CSS。@theme で色・フォント・文字サイズのトークンを上書きする
  theme: "./theme.css",
  // Google Fonts。dev は <link> で読み、build は使う文字を含む断片だけを埋め込む
  fonts: ["Noto Sans JP:400,700", "JetBrains Mono:400"],
  richText: { markdown: true, html: true },
});
