/**
 * 生成 HTML に `<script type="module">` として同梱されるプレゼンテーション用クライアント。
 * サーバを前提にせず、静的 HTML だけで次の3モードを切り替える。
 * - 通常(スクロール閲覧)。ツールバーから他モードへ
 * - present: 聴衆向け。1枚ずつ全画面表示
 * - presenter: 発表者向け。現在/次のスライド、ノート、タイマー、投影先の選択
 * どちらのモードでも L でレーザーポインタに切り替わる。押している間だけ、押した位置に赤い点を出す。
 * 複数ウィンドウ間は同一オリジンの BroadcastChannel で同期する。
 */
export {};

type Msg =
  | { type: "goto"; index: number }
  | { type: "pointer"; x: number | null; y?: number }
  | { type: "black"; on: boolean }
  | { type: "laser"; on: boolean }
  | { type: "hello" }
  | { type: "state"; index: number; black: boolean; laser: boolean };

interface ScreenDetailed {
  availLeft: number;
  availTop: number;
  availWidth: number;
  availHeight: number;
  isPrimary: boolean;
  isInternal: boolean;
  label: string;
}

const SLIDE_W = 1280;
const SLIDE_H = 720;

const frames = Array.from(document.querySelectorAll<HTMLElement>(".yd-slide-frame"));
const deck = document.querySelector<HTMLElement>(".yd-deck");
const mode = new URLSearchParams(location.search).get("mode");
const channel = new BroadcastChannel(`yadeck:${location.pathname}`);

let index = indexFromHash();
let black = false;
let laser = false;

function indexFromHash(): number {
  const id = location.hash.slice(1);
  const i = frames.findIndex((f) => f.id === id);
  return i < 0 ? 0 : i;
}

function send(msg: Msg): void {
  channel.postMessage(msg);
}

function urlWithMode(m: string | null): string {
  const u = new URL(location.href);
  if (m) u.searchParams.set("mode", m);
  else u.searchParams.delete("mode");
  u.hash = frames[index]?.id ?? "";
  return u.toString();
}

function goto(i: number, broadcast = true): void {
  index = Math.max(0, Math.min(frames.length - 1, i));
  frames.forEach((f, k) => f.classList.toggle("yd-active", k === index));
  history.replaceState(null, "", `#${frames[index]?.id ?? ""}`);
  if (broadcast) send({ type: "goto", index });
  document.dispatchEvent(new CustomEvent("yd:goto", { detail: index }));
}

function setBlack(on: boolean, broadcast = true): void {
  black = on;
  document.body.classList.toggle("yd-black", on);
  if (broadcast) send({ type: "black", on });
}

/** レーザーポインタの切り替え。オンの間はクリックでページを送らない */
function setLaser(on: boolean, broadcast = true): void {
  laser = on;
  document.body.classList.toggle("yd-laser", on);
  if (!on) showPointer(null);
  if (broadcast) send({ type: "laser", on });
  document.dispatchEvent(new CustomEvent("yd:laser", { detail: on }));
}

/**
 * surface の上で押している間、表示中のスライド上の位置(0..1)にレーザーの点を出し、他のウィンドウにも送る。
 * pointer events なので、マウスでもタッチやペンでも動く
 */
function bindLaser(surface: HTMLElement): void {
  let down = false;
  const move = (e: PointerEvent) => {
    const r = frames[index]?.getBoundingClientRect();
    if (!r) return;
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      showPointer(null);
      send({ type: "pointer", x: null });
      return;
    }
    showPointer(x, y);
    send({ type: "pointer", x, y });
  };
  surface.addEventListener("pointerdown", (e) => {
    if (!laser) return;
    e.preventDefault();
    down = true;
    surface.setPointerCapture(e.pointerId);
    move(e);
  });
  surface.addEventListener("pointermove", (e) => {
    if (laser && down) move(e);
  });
  const up = () => {
    if (!down) return;
    down = false;
    showPointer(null);
    send({ type: "pointer", x: null });
  };
  surface.addEventListener("pointerup", up);
  surface.addEventListener("pointercancel", up);
}

function fitScale(el: HTMLElement, w: number, h: number): void {
  el.style.setProperty("--yd-scale", String(Math.min(w / SLIDE_W, h / SLIDE_H)));
}

function pointerDot(): HTMLElement {
  const active = frames[index]?.querySelector<HTMLElement>(".yd-slide");
  let dot = active?.querySelector<HTMLElement>(".yd-pointer");
  if (!dot && active) {
    dot = document.createElement("div");
    dot.className = "yd-pointer";
    active.appendChild(dot);
  }
  return dot!;
}

function showPointer(x: number | null, y = 0): void {
  document.querySelectorAll<HTMLElement>(".yd-pointer").forEach((d) => (d.style.display = "none"));
  if (x === null) return;
  const dot = pointerDot();
  dot.style.display = "block";
  dot.style.left = `${x * SLIDE_W}px`;
  dot.style.top = `${y * SLIDE_H}px`;
}

function bindNavigationKeys(): void {
  document.addEventListener("keydown", (e) => {
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
      case " ":
      case "Enter":
        e.preventDefault();
        goto(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
      case "Backspace":
        e.preventDefault();
        goto(index - 1);
        break;
      case "Home":
        goto(0);
        break;
      case "End":
        goto(frames.length - 1);
        break;
      case "b":
      case "B":
        setBlack(!black);
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
      case "l":
      case "L":
        setLaser(!laser);
        break;
    }
  });
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen().catch(() => {});
}

function listenChannel(onState?: () => void): void {
  channel.onmessage = (ev: MessageEvent<Msg>) => {
    const m = ev.data;
    if (m.type === "goto") goto(m.index, false);
    else if (m.type === "pointer") showPointer(m.x, m.y);
    else if (m.type === "black") setBlack(m.on, false);
    else if (m.type === "laser") setLaser(m.on, false);
    else if (m.type === "hello" && onState) onState();
    else if (m.type === "state") {
      goto(m.index, false);
      setBlack(m.black, false);
      setLaser(m.laser, false);
    }
  };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

// ---- 通常モード ----

function setupBrowse(): void {
  const bar = el("div", "yd-toolbar");
  const present = el("button", "", "▶ Present (P)");
  present.onclick = () => (location.href = urlWithMode("present"));
  const presenter = el("button", "", "🖥 Presenter (S)");
  presenter.onclick = () => window.open(urlWithMode("presenter"), "yadeck-presenter");
  bar.append(present, presenter);
  document.body.appendChild(bar);
  document.addEventListener("keydown", (e) => {
    if (e.key === "p" || e.key === "P") present.click();
    if (e.key === "s" || e.key === "S") presenter.click();
  });
  // 発表者ウィンドウからの goto に合わせてスクロール
  channel.onmessage = (ev: MessageEvent<Msg>) => {
    if (ev.data.type === "goto") frames[ev.data.index]?.scrollIntoView({ block: "center" });
  };
}

// ---- present(聴衆) ----

function setupPresent(): void {
  document.body.classList.add("yd-present");
  const fit = () => fitScale(document.documentElement, innerWidth, innerHeight);
  addEventListener("resize", fit);
  fit();
  goto(index, false);
  bindNavigationKeys();
  deck?.addEventListener("click", (e) => {
    if (!laser) goto(index + (e.shiftKey ? -1 : 1));
  });
  if (deck) bindLaser(deck);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !document.fullscreenElement) location.href = urlWithMode(null);
  });
  const hint = el("div", "yd-hint", "F: フルスクリーン / ← →: 送り / B: 暗転 / L: レーザー / Esc: 戻る");
  document.body.appendChild(hint);
  setTimeout(() => hint.remove(), 4000);
  listenChannel();
  send({ type: "hello" });
}

// ---- presenter(発表者) ----

function setupPresenter(): void {
  document.body.classList.add("yd-presenter");
  if (!deck) return;

  const console_ = el("div", "yd-console");
  const stage = el("div", "yd-stage");
  const side = el("div", "yd-side");
  const next = el("div", "yd-next");
  const notes = el("div", "yd-notes-panel");
  const footer = el("div", "yd-footer");
  const counter = el("span", "yd-counter");
  const timer = el("span", "yd-timer", "00:00");
  const clock = el("span", "yd-clock");
  const startBtn = el("button", "", "開始");
  const resetBtn = el("button", "", "リセット");
  const screenSelect = el("select", "yd-screens");
  const projectBtn = el("button", "", "投影ウィンドウを開く");
  const blackBtn = el("button", "", "暗転 (B)");
  const laserBtn = el("button", "", "レーザー (L)");
  const prevBtn = el("button", "", "◀");
  const nextBtn = el("button", "", "▶");

  stage.appendChild(deck);
  side.append(el("div", "yd-label", "次のスライド"), next, el("div", "yd-label", "ノート"), notes);
  footer.append(prevBtn, nextBtn, counter, blackBtn, laserBtn, el("span", "yd-spacer"), startBtn, resetBtn, timer, clock, screenSelect, projectBtn);
  console_.append(stage, side, footer);
  document.body.appendChild(console_);

  // 現在のスライドをステージに合わせて縮小し、次のスライドの複製を小さく出す。
  // 枠の大きさは CSS の grid(minmax(0, …))で決まり、中身の大きさには引っぱられない
  const fitAll = () => {
    const r = stage.getBoundingClientRect();
    fitScale(stage, r.width, r.height);
    const n = next.getBoundingClientRect();
    fitScale(next, n.width, n.height);
  };
  const ro = new ResizeObserver(fitAll);
  ro.observe(stage);
  ro.observe(next);

  const refresh = () => {
    counter.textContent = `${index + 1} / ${frames.length}`;
    next.replaceChildren();
    const nf = frames[index + 1];
    if (nf) {
      const clone = nf.cloneNode(true) as HTMLElement;
      clone.removeAttribute("id");
      clone.classList.add("yd-active");
      clone.querySelectorAll(".yd-pointer").forEach((d) => d.remove());
      next.appendChild(clone);
    }
    fitAll();
    const noteHtml = Array.from(frames[index]?.querySelectorAll(".yd-notes") ?? [])
      .map((n) => n.innerHTML)
      .join("");
    notes.innerHTML = noteHtml || "<p class='yd-muted'>(ノートなし)</p>";
  };
  document.addEventListener("yd:goto", refresh);
  goto(index, false);
  refresh();
  bindNavigationKeys();
  prevBtn.onclick = () => goto(index - 1);
  nextBtn.onclick = () => goto(index + 1);
  blackBtn.onclick = () => setBlack(!black);
  laserBtn.onclick = () => setLaser(!laser);
  document.addEventListener("yd:laser", () => laserBtn.classList.toggle("yd-on", laser));

  // レーザー: ステージ上で押している間、発表者側と投影側の同じ位置に赤い点を出す
  bindLaser(stage);

  // タイマー
  let elapsed = 0;
  let startedAt: number | null = null;
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };
  setInterval(() => {
    timer.textContent = fmt(elapsed + (startedAt ? Date.now() - startedAt : 0));
    clock.textContent = new Date().toLocaleTimeString();
  }, 500);
  startBtn.onclick = () => {
    if (startedAt) {
      elapsed += Date.now() - startedAt;
      startedAt = null;
      startBtn.textContent = "再開";
    } else {
      startedAt = Date.now();
      startBtn.textContent = "一時停止";
    }
  };
  resetBtn.onclick = () => {
    elapsed = 0;
    startedAt = null;
    startBtn.textContent = "開始";
  };

  // 投影先。Window Management API があればスクリーンを列挙し、全画面 popup で開く
  type ScreenDetails = { screens: ScreenDetailed[]; currentScreen: ScreenDetailed };
  const w = window as unknown as { getScreenDetails?: () => Promise<ScreenDetails> };
  let screens: ScreenDetailed[] = [];
  const fillScreens = async () => {
    screenSelect.replaceChildren();
    if (!w.getScreenDetails) {
      screenSelect.appendChild(new Option("このブラウザ(別ウィンドウ)", "-1"));
      return;
    }
    try {
      const details = await w.getScreenDetails();
      screens = details.screens;
      screens.forEach((s, i) => {
        const label = `${s.label || `Screen ${i + 1}`}${s.isPrimary ? " (主)" : ""}${s.isInternal ? " (内蔵)" : ""}`;
        const o = new Option(label, String(i), false, s !== details.currentScreen);
        screenSelect.appendChild(o);
      });
    } catch {
      screenSelect.appendChild(new Option("このブラウザ(別ウィンドウ)", "-1"));
    }
  };
  screenSelect.addEventListener("focus", () => void fillScreens(), { once: true });
  void fillScreens();

  projectBtn.onclick = () => {
    const s = screens[Number(screenSelect.value)];
    const features = s
      ? `popup,fullscreen,left=${s.availLeft},top=${s.availTop},width=${s.availWidth},height=${s.availHeight}`
      : "popup,width=1280,height=720";
    window.open(urlWithMode("present"), "yadeck-audience", features);
  };

  listenChannel(() => send({ type: "state", index, black, laser }));
}

if (mode === "present") setupPresent();
else if (mode === "presenter") setupPresenter();
else setupBrowse();
