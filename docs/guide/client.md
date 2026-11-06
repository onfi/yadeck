# npm のコンポーネントを使う

YADECK のテンプレートは普通の React コンポーネントです。チャート、3D、アニメーションなど、JSX のコンポーネントを提供している npm パッケージは、インストールしてテンプレートから import すれば使えます。

```sh
npm i three @react-three/fiber
```

```tsx
import { Canvas, useFrame } from "@react-three/fiber";
```

プラグインとして配布するときも、使うパッケージを dependencies に書くだけです。deck 側は、そのプラグインを入れれば同じものが使えます。

## 2 種類のコンポーネント

コンポーネントは、ブラウザで動かす必要があるかどうかで 2 種類に分かれます。

| 種類 | 例 | 書き方 |
|---|---|---|
| 描画時に HTML や SVG を出すだけのもの | アイコン、数式、サイズを固定した SVG のチャート | そのまま使う。build 時に静的な HTML になる |
| ブラウザで動いて初めて絵が出るもの | WebGL(three.js)、canvas のチャート、JS で動くアニメーション、要素の大きさを測るもの | Layout に「ブラウザで動かす」印を付ける |

前者は JavaScript なしで表示でき、印刷や PNG でも崩れません。チャートは、できるだけ前者の形で描くことをすすめます。

## ブラウザで動かす印

### Layout 全体を動かす: `client: true`

```tsx
c.bind(SlideLayout, ["model3d"], Model3dSlide, {
  type: model3dType,
  client: true,
  description: "3D の形を回して見せる(WebGL)",
});
```

この Layout を使うページ(または、この Layout の block を含むページ)が、ブラウザで描き直されます。

### 一部だけ動かす: `<Client>`

```tsx
import { Client } from "@yadeck/slide-core";

export const ChartSlide = (slide) => (
  <div className={PAGE}>
    <SlideHeading block={heading} />
    <Client>
      <LiveChart data={slide.series} />
    </Client>
  </div>
);
```

`<Client>` を含むページが、ブラウザで描き直されます。

## 例: three.js で 3D を回す

```tsx
// src/model3d.tsx
import { useRef } from "react";
import { z } from "zod";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { SlideLayout, definePlugin, pick, type SlideOf } from "@yadeck/slide-core";
import { PAGE, SlideHeading } from "@yadeck/slide-components-basic";

const model3dType = z.object({
  shape: z.enum(["torus-knot", "box"]).optional().describe("回して見せる形"),
});

function Spinner({ shape }: { shape: "torus-knot" | "box" }) {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.x += dt * 0.4;
    ref.current.rotation.y += dt * 0.6;
  });
  return (
    <mesh ref={ref}>
      {shape === "box" ? <boxGeometry args={[2.4, 2.4, 2.4]} /> : <torusKnotGeometry args={[1.3, 0.42, 200, 32]} />}
      <meshStandardMaterial color="#f59e0b" />
    </mesh>
  );
}

export const Model3dSlide = (slide: SlideOf<typeof model3dType>) => {
  const [heading] = pick(slide.items, ["heading"]);
  return (
    <div className={PAGE}>
      {heading && <SlideHeading block={heading} description={slide.description} />}
      <div className="relative min-h-0 flex-1">
        <Canvas resize={{ offsetSize: true }} camera={{ position: [0, 0, 6], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 4, 5]} intensity={1.6} />
          <Spinner shape={slide.shape ?? "torus-knot"} />
        </Canvas>
      </div>
    </div>
  );
};

export const model3d = definePlugin((c) => {
  c.bind(SlideLayout, ["model3d"], Model3dSlide, { type: model3dType, client: true, description: "3D の形を回して見せる(WebGL)" });
});
```

```yaml
- model3d:
    shape: torus-knot
    $items:
      - heading: 作り込みたいページは JSX で
```

AI が書く data は、ほかのページと同じです。3D のことを知らなくても `model3d` の tags とフィールドだけで書けます。

## 仕組み

1. build は、これまでどおり全ページを静的な HTML にします。印のあるページの枠には `data-yd-client` が付きます
2. 印のあるページを含む deck があると、build は `slide.config.ts` をブラウザ向けにもう一度バンドルし、`dist/yadeck.client.js` を出します。テンプレートが import しているパッケージも一緒に入ります
3. ブラウザでは、印のあるページが**画面に表示されたときに** React で描き直し、見えなくなったら静的な HTML に戻します。発表モードでは表示中の 1 ページだけが動きます

印のあるページが 1 つも無い deck は、これまでどおり HTML 1 ファイルで完結します。

## 注意すること

- **import した時点でブラウザの API に触るパッケージ**: `slide.config.ts` は build のために Node でも読み込まれます。モジュールの先頭で `window` や `document` に触るパッケージは、Node で失敗します。そのようなパッケージは、コンポーネントの中で `React.lazy` や `useEffect` 内の `import()` で遅れて読み込みます。three.js や多くのチャートのライブラリは、import だけなら問題ありません
- **大きさを測るコンポーネント**: スライドは CSS の `transform` で縮小して表示しています。`getBoundingClientRect` で大きさを測るコンポーネントは、縮小後の大きさを受け取ります。react-three-fiber の `Canvas` では、`resize` に `offsetSize: true` を渡して、縮小前の大きさで測らせます
- **表示されるたびに作り直される**: ページを離れるとアンマウントされ、戻ると最初から描き直します。状態を持ち越したい場合は、コンポーネントの外に置きます
- **バンドルの大きさ**: three.js のような大きなパッケージはそのまま `yadeck.client.js` に入ります
- **React の版**: ブラウザ向けのバンドルは deck 側の `react` と `react-dom` を使います。使うパッケージが対応している React の版を確かめます

## 印刷・PNG・検査

| 出力 | ブラウザで動くページの扱い |
|---|---|
| `yadeck png` | ページを表示し、マウントと最初の描画を待ってから撮る。WebGL もヘッドレスの Chromium で描ける |
| `yadeck check` | 静的な HTML の状態で検査する |
| 印刷して PDF | 印刷する時点で表示されていた状態になる。動きのある部分は崩れることがある |

PDF での見え方が大切なページは、静的に描ける形にしておくか、代わりの画像を用意して PDF 用にします。
