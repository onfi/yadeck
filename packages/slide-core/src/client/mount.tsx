import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type { DeckNode } from "@yadeck/slide-schema";
import { createContainer, type SlideConfig } from "../container.js";
import { DeckProvider, SlideBody, type RenderText } from "../react.js";

/**
 * ブラウザで描き直すページ(data-yd-client の枠、または <Client> を含む枠)を、
 * 表示されたときに React でマウントし、見えなくなったらアンマウントして静的な HTML に戻す。
 * build が config をブラウザ向けにバンドルし、この関数に渡して呼ぶ。
 *
 * - 発表モードでは表示中の 1 枚だけが見えるので、そのページだけが動く
 * - WebGL のコンテキスト数には上限があるため、見えないページは必ず片付ける
 * - 描き直しは同期で行い、静的な HTML から React の描画への切り替えでちらつかせない
 */

interface IslandData {
  deck: DeckNode;
  richText: Record<string, string>;
  richTextOptions?: SlideConfig["richText"];
  pageNumbers?: boolean;
}

export function mount(config: SlideConfig): void {
  const dataEl = document.getElementById("yd-data");
  if (!dataEl?.textContent) return;
  const data = JSON.parse(dataEl.textContent) as IslandData;
  const container = createContainer(config.plugins);
  const renderText: RenderText = (text) => data.richText[text] ?? text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const slides = new Map(data.deck.slides.map((s) => [s.id, s]));

  const roots = new Map<HTMLElement, { root: Root; html: string }>();

  const activate = (frame: HTMLElement) => {
    if (roots.has(frame)) return;
    const slide = slides.get(frame.id);
    const box = frame.querySelector<HTMLElement>(":scope > .yd-slide");
    if (!slide || !box) return;
    const html = box.innerHTML;
    box.replaceChildren();
    const root = createRoot(box);
    flushSync(() =>
      root.render(
        <DeckProvider container={container} richText={data.richTextOptions} renderText={renderText} pageNumbers={data.pageNumbers}>
          <SlideBody data={slide} />
        </DeckProvider>,
      ),
    );
    roots.set(frame, { root, html });
    frame.dataset.ydMounted = "";
  };

  const deactivate = (frame: HTMLElement) => {
    const entry = roots.get(frame);
    if (!entry) return;
    entry.root.unmount();
    const box = frame.querySelector<HTMLElement>(":scope > .yd-slide");
    if (box) box.innerHTML = entry.html;
    roots.delete(frame);
    delete frame.dataset.ydMounted;
  };

  const frames = Array.from(document.querySelectorAll<HTMLElement>(".yd-slide-frame[id]")).filter(
    (f) => f.hasAttribute("data-yd-client") || f.querySelector("template[data-yd-client]") !== null,
  );
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) (e.isIntersecting ? activate : deactivate)(e.target as HTMLElement);
    },
    { threshold: 0.01 },
  );
  for (const f of frames) observer.observe(f);
}
