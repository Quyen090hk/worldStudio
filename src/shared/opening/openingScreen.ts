import { getOpeningLocale, getSelectedOpeningQuote } from "./openingQuotes";

const minimumDisplayTime = 420;
const openingShownKey = "world-studio-opening-shown";

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

export function prepareOpeningScreen() {
  const locale = getOpeningLocale();
  const { quote } = getSelectedOpeningQuote(locale);
  document.documentElement.lang = locale;
  const localizedPanel = document.querySelector<HTMLElement>(
    locale === "zh-CN" ? ".opening-zh" : ".opening-en",
  );
  const quoteNode = localizedPanel?.querySelector<HTMLElement>("[data-opening-quote]");
  const sourceNode = localizedPanel?.querySelector<HTMLElement>("[data-opening-source]");
  if (quoteNode) quoteNode.textContent = quote.text;
  if (sourceNode) sourceNode.textContent = quote.source;
  return delay(minimumDisplayTime);
}

export async function waitForFonts() {
  if (!("fonts" in document)) return;
  await Promise.race([document.fonts.ready.then(() => undefined), delay(1_500)]);
}

export function waitForOpeningDismissal(readiness: Promise<unknown>) {
  const openingScreen = document.getElementById("opening-screen");
  if (!openingScreen) return readiness.then(() => undefined);

  return new Promise<void>((resolve, reject) => {
    let requested = false;
    let ready = false;

    const finish = () => {
      if (!ready) {
        requested = true;
        return;
      }
      window.removeEventListener("keydown", onKeyDown);
      openingScreen.removeEventListener("click", onPointer);
      resolve();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (["Control", "Meta", "Alt", "Shift"].includes(event.key)) return;
      if (event.key === " ") event.preventDefault();
      finish();
    };
    const onPointer = () => finish();

    window.addEventListener("keydown", onKeyDown);
    openingScreen.addEventListener("click", onPointer);

    readiness.then(
      () => requestAnimationFrame(() => {
        ready = true;
        openingScreen.dataset.ready = "true";
        for (const status of openingScreen.querySelectorAll<HTMLElement>(
          "[data-opening-status]",
        )) {
          status.textContent = status.dataset.readyText ?? status.textContent;
        }
        if (requested) finish();
      }),
      (error) => {
        window.removeEventListener("keydown", onKeyDown);
        openingScreen.removeEventListener("click", onPointer);
        reject(error);
      },
    );
  });
}

export function revealApplication() {
  const openingScreen = document.getElementById("opening-screen");
  const root = document.getElementById("root");
  root?.classList.add("app-entering");
  requestAnimationFrame(() => openingScreen?.classList.add("is-leaving"));
  window.setTimeout(() => openingScreen?.remove(), 520);
}

export function showOpeningError(error: unknown) {
  console.error("Application bootstrap failed", error);
  document.getElementById("opening-screen")?.setAttribute("data-error", "true");
}

export function shouldShowOpeningScreen() {
  try {
    return sessionStorage.getItem(openingShownKey) !== "true";
  } catch {
    return true;
  }
}

export function markOpeningScreenShown() {
  try {
    sessionStorage.setItem(openingShownKey, "true");
  } catch {
    // The launch experience still works without session persistence.
  }
}
