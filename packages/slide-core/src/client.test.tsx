import { describe, expect, it } from "vitest";
import { BlockLayout, DeckLayout, SlideLayout, type DeckNode } from "@yadeck/slide-schema";
import { Container } from "./container.js";
import { jsonForScript } from "./document.js";
import { loadDeckFromYaml } from "./loader.js";
import { Client, Slide } from "./react.js";
import { renderDeck } from "./render.js";

const Plain = () => <p>plain</p>;
const Canvasy = () => <canvas />;
const WithClient = () => (
  <Client>
    <canvas />
  </Client>
);

const container = new Container()
  .bind(DeckLayout, [], ({ slides }: DeckNode) => <main>{slides.map((s) => <Slide key={s.id} data={s} />)}</main>)
  .bind(SlideLayout, [], ({ items }: { items: unknown[] }) => <div>{items.length}</div>)
  .bind(SlideLayout, ["spin"], Canvasy, { client: true })
  .bind(SlideLayout, ["part"], WithClient)
  .bind(BlockLayout, [], Plain)
  .bind(BlockLayout, ["chart"], Plain, { client: true });

const render = (yaml: string) => renderDeck(loadDeckFromYaml(yaml), { container });
const frames = (html: string) => Array.from(html.matchAll(/<section[^>]*>/g), (m) => m[0]);

describe("ブラウザで描き直すページの印", () => {
  it("slide か items の Layout が client: true のページだけに data-yd-client を付ける", () => {
    const html = render(`
- - 本文
- spin: { $items: [] }
- - chart: x
`);
    expect(frames(html).map((f) => f.includes("data-yd-client"))).toEqual([false, true, true]);
  });

  it("<Client> は中身の前に template の印を置く", () => {
    expect(render(`- part: { $items: [] }`)).toContain('<template data-yd-client=""></template><canvas>');
  });
});

describe("jsonForScript", () => {
  it("</script> で閉じられないよう < をエスケープする", () => {
    const s = jsonForScript({ t: "</script><b>" });
    expect(s).not.toContain("<");
    expect(JSON.parse(s)).toEqual({ t: "</script><b>" });
  });
});
