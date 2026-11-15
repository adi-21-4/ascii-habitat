/**
 * Page chrome shared by every scene: glass segmented choices and the chat composer.
 */
/** Mount the stable New Tab greeting and return a setter for the Tweaks name field. */
export function mountGreeting(name: string) {
  const el = document.querySelector<HTMLElement>(".greeting");
  if (!el) return (_name: string) => {};
  let currentName = name.trim() || "User";
  const update = () => (el.textContent = `Hello, ${currentName}`);
  update();
  return (nextName: string) => {
    currentName = nextName.trim() || "User";
    update();
  };
}

/** Show a locale-aware live clock and calendar date in the page chrome. */
export function mountClock() {
  const time = document.querySelector<HTMLTimeElement>(".clock-time");
  const date = document.querySelector<HTMLTimeElement>(".clock-date");
  if (!time || !date) return;
  const update = () => {
    const now = new Date();
    time.dateTime = now.toISOString();
    date.dateTime = now.toISOString().slice(0, 10);
    time.textContent = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(now);
    date.textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(now);
  };
  update();
  window.setInterval(update, 1000);
}

/** UI only: a submit fires a `chat:submit` event on the form for whatever backend gets wired up. */
export function mountComposer() {
  const form = document.querySelector<HTMLFormElement>(".composer")!;
  const prompt = form.querySelector<HTMLInputElement>('input[name="prompt"]')!;
  const send = form.querySelector<HTMLButtonElement>(".send")!;
  function updateButton() {
    send.disabled = prompt.value.trim() === "";
  }

  prompt.addEventListener("input", updateButton);
  // Ready to type on load where there's a mouse; on a phone that would throw the keyboard up.
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) prompt.focus({ preventScroll: true });
  prompt.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = prompt.value.trim();
    if (!text) return;
    form.dispatchEvent(new CustomEvent("chat:submit", { detail: { text } }));
    prompt.value = "";
    updateButton();
  });
}

export interface Choice {
  value: string;
  label: string;
  /** CSS colour for a dot before the label; none if left out. */
  swatch?: string;
}

/**
 * A glass segmented control in `host` (a radiogroup): every choice in a row, with a thumb that slides
 * under the current one. Arrow keys move between them; the row scrolls sideways if it doesn't fit.
 */
export function mountChoices(host: HTMLElement, choices: Choice[], current: string, onPick: (value: string) => void) {
  const switcher = host.closest<HTMLElement>(".animal-switcher");
  const trigger = switcher?.querySelector<HTMLButtonElement>(".animal-current");
  const currentName = trigger?.querySelector<HTMLElement>(".current-animal-name");
  const currentDot = trigger?.querySelector<HTMLElement>(".current-dot");
  const thumb = document.createElement("span");
  thumb.className = "thumb";
  thumb.setAttribute("aria-hidden", "true");
  host.append(thumb);

  const buttons = choices.map((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "radio");
    b.dataset.value = c.value;
    const dot = c.swatch ? document.createElement("span") : null;
    if (dot) { dot.className = "dot"; dot.setAttribute("aria-hidden", "true"); dot.style.setProperty("--swatch", c.swatch!); }
    if (dot) b.append(dot);
    const label = document.createElement("span");
    label.textContent = c.label;
    b.append(label);
    b.addEventListener("click", () => select(c.value, true));
    host.append(b);
    return b;
  });

  function place() {
    const b = buttons.find((x) => x.getAttribute("aria-checked") === "true");
    if (!b) return;
    thumb.style.translate = `${b.offsetLeft}px 0`;
    thumb.style.width = `${b.offsetWidth}px`;
  }

  const setOpen = (open: boolean) => {
    switcher?.classList.toggle("open", open);
    trigger?.setAttribute("aria-expanded", String(open));
    host.inert = !open;
  };

  trigger?.addEventListener("click", () => setOpen(trigger.getAttribute("aria-expanded") !== "true"));
  document.addEventListener("pointerdown", (event) => {
    if (switcher && !switcher.contains(event.target as Node)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && trigger?.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      trigger.focus();
    }
  });

  function select(value: string, pick: boolean) {
    const choice = choices.find((item) => item.value === value);
    for (const b of buttons) {
      const on = b.dataset.value === value;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
      if (on) b.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    if (choice) {
      if (currentName) currentName.textContent = choice.label;
      if (currentDot && choice.swatch) currentDot.style.setProperty("--swatch", choice.swatch);
    }
    place();
    if (pick) {
      onPick(value);
      setOpen(false);
      trigger?.focus();
    }
  }

  host.addEventListener("keydown", (e) => {
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0 || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    e.preventDefault();
    const next = buttons[(at + (e.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length];
    next.focus();
    select(next.dataset.value!, true);
  });

  select(current, false);
  // Labels change width once the webfont arrives, and when the window resizes.
  document.fonts?.ready.then(place);
  window.addEventListener("resize", place);
}
