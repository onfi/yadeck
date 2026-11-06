import { renderToStaticMarkup } from "react-dom/server";
import type { DeckNode } from "@yadeck/slide-schema";
import type { Container, RichTextOptions } from "./container.js";
import { Deck, DeckProvider, type RenderText } from "./react.js";
import { renderRichText } from "./richtext.js";

export interface RenderOptions {
  container: Container;
  richText?: RichTextOptions;
  /** RichText の変換結果を受け取る。ブラウザで描き直すページのために、結果を HTML に埋め込むのに使う */
  onRichText?: (text: string, html: string) => void;
}

/** deck の本体(DeckLayout 以下)を静的 HTML にする */
export function renderDeck(deck: DeckNode, { container, richText, onRichText }: RenderOptions): string {
  const renderText: RenderText = (text, options) => {
    const html = renderRichText(text, options);
    onRichText?.(text, html);
    return html;
  };
  return renderToStaticMarkup(
    <DeckProvider container={container} richText={richText} renderText={renderText}>
      <Deck data={deck} />
    </DeckProvider>,
  );
}
