import { mountTweakPanel, type Control, type ControlKit } from "./panel";
import { ANIMAL_KEYS, ANIMALS, AnimalEngine, SHARED_CONTROLS, type AnimalKey, type KnobSpec, type Tuning } from "./src";
import { mountChoices, mountClock, mountComposer, mountGreeting } from "./ui";

/** Prefix for this extension's local settings. */
const STORE = "ascii-animals:";
if (/Chrome\//.test(navigator.userAgent)) document.documentElement.classList.add("liquid");

const params = new URLSearchParams(location.search);

// ?animal=koi picks the animal (otherwise the last one picked); ?count=60 pins how many. No count: sized to the screen.
const count = Number(params.get("count")) || undefined;
const isAnimal = (key: string | null): key is AnimalKey => key !== null && key in ANIMALS;
let saved: string | null = null;
try {
  saved = localStorage.getItem(STORE + "animal");
} catch {
  // Storage unavailable: start with butterflies.
}
let animal: AnimalKey = isAnimal(params.get("animal")) ? (params.get("animal") as AnimalKey) : isAnimal(saved) ? saved : "butterflies";

// Dark mode only: every animal is tuned to glow on black.
const engine = new AnimalEngine(document.querySelector("canvas")!, { animal, count, theme: "dark" });

// ── tweak panel: shared Movement and Look knobs around the animal's own ──

/** Each animal's tweaks are saved under their own key. */
const storageKey = (key: AnimalKey) => `${STORE}tweaks:${key}`;

function controlsFor(key: AnimalKey) {
  const a = ANIMALS[key];
  const hidden = new Set<string>(a.hide ?? []);
  return (kit: ControlKit<Tuning>): [string, Control[]][] => {
    const build = (spec: KnobSpec): Control => {
      if ("toggle" in spec) return kit.toggle(spec.key, spec.label, spec.hint);
      const knob = kit.knob(spec.key, spec.label, spec.min, spec.max, spec.step, spec.hint);
      const when = spec.disabledWhen;
      return when ? { ...knob, disabled: () => Boolean(engine.tuning[when]) } : knob;
    };
    const keep = (specs: KnobSpec[]) => specs.filter((s) => !hidden.has(s.key)).map(build);
    return [
      ["Movement", keep(SHARED_CONTROLS.movement)],
      ...a.controls.map(([title, specs]): [string, Control[]] => [title, specs.map(build)]),
      ["Look", keep(SHARED_CONTROLS.look)],
    ];
  };
}

let tweaks = mountTweakPanel(engine, ANIMALS[animal].defaults, controlsFor(animal), { storageKey: storageKey(animal) });

// Open in two tabs? When the other one saves tweaks for this animal, reload, so this tab never
// writes its stale settings back over the newer ones.
window.addEventListener("storage", (e) => {
  if (e.key === storageKey(animal)) location.reload();
});

// ── animal choices: every animal in the top bar, each with a dot of its own colour ──

const userNameKey = `${STORE}user-name`;
let userName = "User";
try { userName = localStorage.getItem(userNameKey)?.trim() || "User"; } catch { /* Use the default name. */ }
const updateGreeting = mountGreeting(userName);

function mountUserNameControl() {
  const body = document.querySelector<HTMLElement>(".tweaks-body");
  if (!body) return;
  const section = document.createElement("section");
  section.className = "tweaks-group personalization-group";
  const heading = document.createElement("h3");
  heading.textContent = "Personalization";
  const label = document.createElement("label");
  label.className = "name-setting";
  const caption = document.createElement("span");
  caption.textContent = "Name in greeting";
  const input = document.createElement("input");
  input.type = "text";
  input.name = "greeting-name";
  input.autocomplete = "name";
  input.maxLength = 24;
  input.placeholder = "User";
  input.value = userName === "User" ? "" : userName;
  input.setAttribute("aria-label", "Name in greeting");
  input.addEventListener("input", () => {
    userName = input.value.trim().slice(0, 24) || "User";
    updateGreeting(userName);
    try { localStorage.setItem(userNameKey, userName); } catch { /* Keep this visit's choice. */ }
  });
  label.append(caption, input);
  section.append(heading, label);
  body.prepend(section);
}

type QuickLink = { label: string; url: string };
const quickLinksKey = `${STORE}quick-links`;
const defaultQuickLinks: QuickLink[] = [
  { label: "Gmail", url: "https://mail.google.com/" },
  { label: "YouTube", url: "https://youtube.com/" },
  { label: "ChatGPT", url: "https://chatgpt.com/" },
  { label: "Slack", url: "https://slack.com/" },
  { label: "GitHub", url: "https://github.com/" },
  { label: "Notion", url: "https://notion.so/" },
];
let quickLinks = defaultQuickLinks;
try {
  const savedLinks = JSON.parse(localStorage.getItem(quickLinksKey) ?? "null");
  if (Array.isArray(savedLinks)) quickLinks = savedLinks.filter((link): link is QuickLink =>
    link && typeof link.label === "string" && typeof link.url === "string");
} catch { /* Start with the curated shortcuts. */ }

function saveQuickLinks() {
  try { localStorage.setItem(quickLinksKey, JSON.stringify(quickLinks)); } catch { /* Keep this visit's links. */ }
}

function renderQuickLinks() {
  const host = document.querySelector<HTMLElement>(".quick-links");
  if (!host) return;
  host.replaceChildren();
  for (const link of quickLinks) {
    const label = link.label.trim();
    if (!label) continue;
    let url: URL;
    try { url = new URL(link.url); } catch { continue; }
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;
    const anchor = document.createElement("a");
    anchor.href = url.href;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.textContent = label;
    anchor.title = label;
    anchor.setAttribute("aria-label", label);
    anchor.dataset.short = label.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    host.append(anchor);
  }
}

function mountQuickLinksControl() {
  const body = document.querySelector<HTMLElement>(".tweaks-body");
  if (!body) return;
  const section = document.createElement("section");
  section.className = "tweaks-group quicklink-settings";
  const heading = document.createElement("h3");
  heading.textContent = "Quick links";
  const help = document.createElement("p");
  help.className = "quicklink-help";
  help.textContent = "Edit the label and address, or add your own button.";
  const editor = document.createElement("div");
  editor.className = "quicklink-editor-list";

  const drawRows = () => {
    editor.replaceChildren();
    add.disabled = quickLinks.length >= 12;
    quickLinks.forEach((link, index) => {
      const row = document.createElement("div");
      row.className = "quicklink-editor-row";
      const label = document.createElement("input");
      label.type = "text";
      label.maxLength = 24;
      label.placeholder = "Button name";
      label.value = link.label;
      label.setAttribute("aria-label", `Button ${index + 1} name`);
      label.addEventListener("input", () => {
        quickLinks[index]!.label = label.value;
        saveQuickLinks();
        renderQuickLinks();
      });
      const url = document.createElement("input");
      url.type = "url";
      url.placeholder = "https://example.com";
      url.value = link.url;
      url.setAttribute("aria-label", `Button ${index + 1} address`);
      url.addEventListener("input", () => {
        quickLinks[index]!.url = url.value;
        saveQuickLinks();
        renderQuickLinks();
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "quicklink-remove";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove ${link.label || `button ${index + 1}`}`);
      remove.addEventListener("click", () => {
        quickLinks.splice(index, 1);
        saveQuickLinks();
        renderQuickLinks();
        drawRows();
      });
      row.append(label, remove, url);
      editor.append(row);
    });
  };
  const add = document.createElement("button");
  add.type = "button";
  add.className = "quicklink-add";
  add.textContent = "+ Add button";
  add.addEventListener("click", () => {
    if (quickLinks.length >= 12) return;
    quickLinks.push({ label: "New link", url: "https://example.com/" });
    saveQuickLinks();
    renderQuickLinks();
    drawRows();
    editor.querySelector<HTMLInputElement>(".quicklink-editor-row:last-child input")?.focus();
  });
  drawRows();
  section.append(heading, help, editor, add);
  body.append(section);
}

mountUserNameControl();
renderQuickLinks();
mountQuickLinksControl();

mountClock();

mountChoices(
  document.querySelector<HTMLElement>(".choices")!,
  ANIMAL_KEYS.map((key) => ({ value: key, label: ANIMALS[key].label, swatch: `rgb(${ANIMALS[key].swatch.join(",")})` })),
  animal,
  (value) => {
    animal = value as AnimalKey;
    engine.setAnimal(animal);
    tweaks.destroy();
    tweaks = mountTweakPanel(engine, ANIMALS[animal].defaults, controlsFor(animal), { storageKey: storageKey(animal) });
    mountUserNameControl();
    mountQuickLinksControl();
    try {
      localStorage.setItem(STORE + "animal", animal);
    } catch {
      // Not remembered across visits, that's all.
    }
  },
);

mountComposer();

// New Tab search: keep the familiar center input useful without requesting extension permissions.
document.querySelector<HTMLFormElement>(".composer")?.addEventListener("chat:submit", ((event: CustomEvent<{ text: string }>) => {
  const query = event.detail.text.trim();
  if (query) location.assign(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
}) as EventListener);
