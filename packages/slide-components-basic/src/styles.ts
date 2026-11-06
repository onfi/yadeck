/**
 * basic の既定テーマ。Tailwind v4 の `@theme` トークンで、利用者は slide.config.ts の `theme` に
 * 指定した CSS で同名トークンを上書きして色・フォント・文字サイズを差し替える。
 * 色は `bg-primary` `text-ink`、フォントは `font-sans`、サイズは `text-h1` のように utility になる。
 */
export const DEFAULT_THEME = `
@theme {
  --color-primary: #2a5bd7;
  --color-primary-deep: #163a8f;
  --color-accent: #e8c547;
  --color-ink: #222222;
  --color-muted: #666666;
  --color-faint: #888888;
  --color-surface: #ffffff;
  --color-code: #1e1e1e;
  --color-code-ink: #eeeeee;

  --font-sans: "Helvetica Neue", Arial, "Hiragino Sans", "Noto Sans JP", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --text-body: 28px;
  --text-small: 22px;
  --text-h1: 64px;
  --text-h2: 44px;
  --text-h3: 34px;
  --text-h4: 30px;
  --text-display: 96px;
}
`;

/**
 * utility を付けられない要素(RichText が生成する markdown 由来の p / ul / code など)のための最小 CSS。
 * Layout 自体の見た目は layouts.tsx の className で持つ。
 */
export const BASIC_CSS = `
@layer components {
  .yd-slide { font-family: var(--font-sans); color: var(--color-ink); font-size: var(--text-body); line-height: 1.5; }
  .b-body p { margin: 0 0 .6em; }
  .b-body p:last-child { margin-bottom: 0; }
  .b-body ul { list-style: disc; padding-left: 1.2em; }
  .b-body ol { list-style: decimal; padding-left: 1.2em; }
  .b-body li::marker { color: var(--color-accent); }
  /* 本文中のコード。合字(-> が → になる等)は原文と違って見えるので切る */
  .yd-slide :not(pre) > code { font-family: var(--font-mono); font-size: .9em; font-variant-ligatures: none; background: color-mix(in srgb, var(--color-ink) 8%, transparent); padding: 0 .3em; border-radius: 4px; }
  .b-body a { color: var(--color-primary); text-decoration: underline; }

  /* code: pane の寸法(--pane-w / --pane-h)と行数・最大行長から、収まる最大のフォントサイズを選ぶ */
  .yd-slide { --pane-w: 1120px; --pane-h: 500px; }
  .b-code {
    font-size: max(14px, min(
      var(--text-body),
      calc((var(--pane-w) - 48px) / var(--code-cols, 40) / 0.62),
      calc((var(--pane-h) - var(--code-chrome, 40px)) / var(--code-rows, 10) / 1.375),
      var(--code-fit, 9999px)
    ));
    /* 下限まで縮めても入らない長い行は折り返す。はみ出して読めないよりよい */
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-variant-ligatures: none;
  }
  .b-code .hljs { color: var(--color-code-ink); }
  .hljs-comment, .hljs-quote { color: #8b949e; font-style: italic; }
  .hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-type, .hljs-built_in, .hljs-doctag, .hljs-meta { color: #ff7b72; }
  .hljs-string, .hljs-regexp, .hljs-addition, .hljs-attr, .hljs-meta .hljs-string { color: #a5d6ff; }
  .hljs-number, .hljs-symbol, .hljs-bullet, .hljs-link, .hljs-variable, .hljs-template-variable { color: #79c0ff; }
  .hljs-title, .hljs-section, .hljs-name, .hljs-selector-id, .hljs-selector-class, .hljs-function .hljs-title { color: #d2a8ff; }
  .hljs-attribute, .hljs-params, .hljs-property { color: #ffa657; }
  .hljs-emphasis { font-style: italic; }
  .hljs-strong { font-weight: bold; }
  .hljs-deletion { color: #ffa198; }

  /* ---- flow(手順)。https://www.ameamelog.com/css-flow/ の 5 パターンを移植。寸法はスライド向けに 1.5 倍 ---- */
  .b-flow { --flow-grad: linear-gradient(to right, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 55%, white) 100%); margin: auto 0; padding: 0; list-style: none; width: 100%; }
  .b-flow > li { list-style: none; }
  .b-flow dl, .b-flow dd { margin: 0; }
  .b-flow dt { font-size: var(--text-h4); font-weight: 700; color: var(--color-primary); line-height: 1.3; }
  .b-flow dd { font-size: var(--text-small); color: color-mix(in srgb, var(--color-ink) 80%, transparent); line-height: 1.45; }
  .b-flow .phase { display: inline-block; margin-left: .6em; padding: .1em .7em; border-radius: 999px; background: color-mix(in srgb, var(--color-primary) 10%, transparent); font-size: var(--text-small); font-weight: 700; color: var(--color-primary); vertical-align: middle; }
  .b-flow .via { font-family: var(--font-mono); font-size: var(--text-small); font-weight: 700; color: var(--color-primary); white-space: nowrap; }
  .b-flow .icon { font-size: 18px; font-weight: 700; color: #fff; background: var(--flow-grad); }
  .b-flow.has-focus > li:not(.is-focus) { opacity: .35; }
  .b-flow > li.is-focus .icon { background: var(--color-accent); color: var(--color-ink); }
  .b-flow > li.is-focus dt { color: var(--color-ink); }

  /* 1 カラム構成: 左に STEP ピル、縦レール、点と点線、右に見出しと説明 */
  .b-flow-rail { padding-left: 180px; position: relative; }
  .b-flow-rail::before { content: ""; width: 22px; height: 100%; background: color-mix(in srgb, var(--color-ink) 7%, transparent); margin-left: -11px; display: block; position: absolute; top: 0; left: 180px; }
  .b-flow-rail > li { position: relative; }
  .b-flow-rail > li:not(:last-child) { margin-bottom: 60px; }
  .b-flow-rail > li .icon { padding: 10px 28px; display: block; position: absolute; top: 0; left: -180px; z-index: 2; }
  .b-flow-rail > li .icon::after { content: ""; border-style: solid; border-width: 8px 0 8px 14px; border-color: transparent transparent transparent color-mix(in srgb, var(--color-primary) 55%, white); position: absolute; top: 50%; left: 100%; transform: translateY(-50%); }
  .b-flow-rail > li.is-focus .icon::after { border-left-color: var(--color-accent); }
  .b-flow-rail > li .via { position: absolute; top: -30px; left: 28px; transform: translateY(-50%); }
  .b-flow-rail > li dl { padding-left: 100px; position: relative; }
  .b-flow-rail > li dl::before, .b-flow-rail > li dl::after { content: ""; display: block; position: absolute; top: 24px; }
  .b-flow-rail > li dl::before { width: 11px; height: 11px; margin-top: -5px; background: var(--color-primary); border-radius: 50%; left: -6px; z-index: 1; }
  .b-flow-rail > li.is-focus dl::before { background: var(--color-accent); }
  .b-flow-rail > li dl::after { width: 72px; border-bottom: 2px dashed color-mix(in srgb, var(--color-ink) 40%, transparent); left: 8px; }
  .b-flow-rail > li dl dt { margin-bottom: 6px; }

  /* ポップ: 吹き出しの番号 + 枠カードを横に並べ、間に › */
  .b-flow-pop { --flow-gap: 56px; display: flex; justify-content: space-between; gap: var(--flow-gap); }
  .b-flow-pop > li { flex: 1 1 0; min-width: 0; position: relative; }
  .b-flow-pop > li .icon { font-family: var(--font-mono); font-size: 26px; line-height: 72px; width: 72px; background: var(--color-primary); margin: 0 auto 28px; display: block; border-radius: 50%; text-align: center; position: relative; letter-spacing: 2px; }
  .b-flow-pop > li .icon::before { content: ""; border: solid transparent; border-width: 12px; border-top-color: var(--color-primary); position: absolute; top: calc(100% - 3px); left: 50%; transform: translateX(-50%); }
  .b-flow-pop > li.is-focus .icon::before { border-top-color: var(--color-accent); }
  .b-flow-pop > li .via { position: absolute; top: 24px; right: calc(100% + var(--flow-gap) / 2 + 4px); transform: translateX(50%); }
  .b-flow-pop > li dl { padding: 32px 10px; word-break: auto-phrase; text-wrap: balance; border: 4px solid var(--color-primary); position: relative; text-align: center; height: calc(100% - 100px); }
  .b-flow-pop > li.is-focus dl { border-color: var(--color-accent); }
  /* 箱の間の ›。隙間(--flow-gap)の中央に置き、枠線に重ねない */
  .b-flow-pop > li:not(:last-child) dl::before { content: ""; width: 36px; height: 36px; display: block; border-top: 8px solid var(--color-primary); border-right: 8px solid var(--color-primary); position: absolute; top: 50%; left: calc(100% + var(--flow-gap) / 2 - 8px); transform: translate(-50%, -50%) rotate(45deg); }
  .b-flow-pop > li dl dt { margin-bottom: 10px; word-break: keep-all; }
  .b-flow-pop > li dl dt .phase { display: block; margin: 8px auto 0; padding: .15em .6em; font-size: 18px; width: fit-content; max-width: 100%; box-sizing: border-box; white-space: nowrap; }

  /* 枠線を使ったデザイン: 角丸の枠を縦に積み、点線と ▽ でつなぐ */
  .b-flow-boxed > li { position: relative; }
  .b-flow-boxed > li:not(:last-child) { margin-bottom: 40px; }
  .b-flow-boxed > li:not(:first-child)::before { content: ""; height: 60px; display: block; border-left: 5px dotted color-mix(in srgb, var(--color-ink) 15%, transparent); position: absolute; top: -40px; left: calc(12% + 40px); z-index: 1; }
  .b-flow-boxed > li .via { position: absolute; top: -20px; left: calc(12% + 72px); transform: translateY(-50%); }
  .b-flow-boxed > li dl { width: 100%; padding: 8px 36px; display: flex; align-items: center; border: 3px solid var(--color-primary); border-radius: 14px; position: relative; background: var(--color-surface); }
  .b-flow-boxed > li.is-focus dl { border-color: var(--color-accent); }
  .b-flow-boxed > li:not(:last-child) dl::before, .b-flow-boxed > li:not(:last-child) dl::after { content: ""; border: solid transparent; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); }
  .b-flow-boxed > li:not(:last-child) dl::before { border-width: 26px; border-top-color: var(--color-primary); }
  .b-flow-boxed > li.is-focus:not(:last-child) dl::before { border-top-color: var(--color-accent); }
  .b-flow-boxed > li:not(:last-child) dl::after { border-width: 23px; border-top-color: var(--color-surface); }
  .b-flow-boxed > li dl dt { flex: 0 0 24%; margin-right: 2vw; text-align: center; }
  .b-flow-boxed > li dl dt .icon { padding: 4px 14px; margin: 0 auto 6px; display: block; border-radius: 999px; width: fit-content; position: relative; z-index: 2; }
  .b-flow-boxed > li dl dd { flex: 1; }
  .b-flow-boxed > li dl dd .phase { display: block; width: fit-content; margin: 0 0 4px; }

  /* スタイリッシュ: 全体を 1 つの枠で囲み、区切り線に ▽ */
  .b-flow-framed { border: 4px solid var(--color-primary); }
  .b-flow-framed > li { padding: 12px 36px; position: relative; }
  .b-flow-framed > li:not(:last-child) { border-bottom: 4px solid var(--color-primary); }
  .b-flow-framed > li:not(:last-child)::before, .b-flow-framed > li:not(:last-child)::after { content: ""; border: solid transparent; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); z-index: 1; }
  .b-flow-framed > li:not(:last-child)::before { border-width: 26px; border-top-color: var(--color-primary); }
  .b-flow-framed > li:not(:last-child)::after { border-width: 21px; border-top-color: var(--color-surface); }
  .b-flow-framed > li .via { position: absolute; top: 0; left: calc(50% + 44px); transform: translateY(-50%); background: var(--color-surface); padding: 0 10px; z-index: 2; }
  .b-flow-framed > li dl { display: flex; align-items: center; }
  .b-flow-framed > li dl dt { flex: 0 0 24%; margin-right: 1vw; text-align: center; }
  .b-flow-framed > li dl dt .icon { padding: 4px 14px; margin: 0 auto 6px; display: block; border-radius: 999px; width: fit-content; }
  .b-flow-framed > li dl dd { flex: 1; }
  .b-flow-framed > li dl dd .phase { display: block; width: fit-content; margin: 0 0 4px; }

  /* 2 カラム構成: 右端が矢印の枠を 2 列に */
  .b-flow-grid { display: flex; flex-wrap: wrap; gap: 48px 4%; }
  .b-flow-grid > li { padding: 28px 44px 24px 36px; flex: 0 0 48%; border: 3px solid var(--color-primary); position: relative; background: var(--color-surface); }
  .b-flow-grid > li.is-focus { border-color: var(--color-accent); }
  .b-flow-grid > li:not(:last-child)::before, .b-flow-grid > li:not(:last-child)::after { content: ""; border: solid transparent; position: absolute; top: 50%; left: 100%; transform: translateY(-50%); }
  .b-flow-grid > li:not(:last-child)::before { border-width: 30px; border-left-color: var(--color-primary); }
  .b-flow-grid > li.is-focus:not(:last-child)::before { border-left-color: var(--color-accent); }
  .b-flow-grid > li:not(:last-child)::after { border-width: 27px; border-left-color: var(--color-surface); }
  .b-flow-grid > li .icon { padding: 7px 28px; display: block; border-radius: 999px; position: absolute; top: -18px; left: -14px; z-index: 2; }
  .b-flow-grid > li .via { display: none; }
  .b-flow-grid > li dl dt { margin-bottom: 6px; }
}
`;
