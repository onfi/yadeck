/**
 * Layout(プラグイン)が使う API のうち、ブラウザでも動くものだけを集めた入口。
 * ブラウザ向けのバンドルでは `@yadeck/slide-core` をこのモジュールに差し替える。
 * Node 専用の処理(Tailwind、フォント、ファイル、静的な書き出し)はここに入れない。
 */
export * from "@yadeck/slide-schema";
export {
  Container,
  ConfigError,
  createContainer,
  defineConfig,
  definePlugin,
  type BindOptions,
  type Binding,
  type Plugin,
  type RichTextOptions,
  type SlideConfig,
} from "./container.js";
export { pick, pickAll } from "./pick.js";
export { bestIndex, score, splitTags, type Score, type TieBreak } from "./resolve.js";
export { isInline } from "./inline.js";
export {
  Block,
  Client,
  Deck,
  DeckProvider,
  RichText,
  Slide,
  SlideBody,
  isClientSlide,
  type DeckProviderProps,
  type RenderText,
  type RichTextProps,
} from "./react.js";
