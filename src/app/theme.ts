type ThemeName = "dark" | "light";

const THEME_ATTRIBUTE = "data-lst-theme";

export function syncLeetCodeTheme(host: HTMLElement): () => void {
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  const sync = () => {
    host.setAttribute(THEME_ATTRIBUTE, detectTheme(media));
  };

  const observer = new MutationObserver(sync);
  const observedElements = existingElements([
    document.documentElement,
    document.body,
  ]);

  for (const element of observedElements) {
    observer.observe(element, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });
  }

  media?.addEventListener("change", sync);
  sync();

  return () => {
    observer.disconnect();
    media?.removeEventListener("change", sync);
  };
}

function detectTheme(media?: MediaQueryList): ThemeName {
  const explicitTheme = explicitPageTheme();
  if (explicitTheme) return explicitTheme;

  const computedTheme = computedPageTheme();
  if (computedTheme) return computedTheme;

  return media?.matches ? "dark" : "light";
}

function explicitPageTheme(): ThemeName | undefined {
  const elements = existingElements([document.documentElement, document.body]);

  for (const element of elements) {
    if (
      element.classList.contains("dark") ||
      element.dataset.theme === "dark" ||
      element.dataset.colorMode === "dark"
    ) {
      return "dark";
    }

    if (
      element.classList.contains("light") ||
      element.dataset.theme === "light" ||
      element.dataset.colorMode === "light"
    ) {
      return "light";
    }
  }

  if (document.querySelector(".dark")) return "dark";
  if (document.querySelector(".light")) return "light";

  return undefined;
}

function computedPageTheme(): ThemeName | undefined {
  const elements = existingElements([document.body, document.documentElement]);

  for (const element of elements) {
    const colorScheme = getComputedStyle(element).colorScheme;
    if (colorScheme.includes("dark") && !colorScheme.includes("light")) {
      return "dark";
    }
    if (colorScheme.includes("light") && !colorScheme.includes("dark")) {
      return "light";
    }

    const color = getComputedStyle(element).backgroundColor;
    const luminance = backgroundLuminance(color);
    if (luminance === undefined) continue;
    return luminance < 0.45 ? "dark" : "light";
  }

  return undefined;
}

function existingElements(
  elements: Array<HTMLElement | null | undefined>,
): HTMLElement[] {
  return elements.filter((element): element is HTMLElement => Boolean(element));
}

function backgroundLuminance(color: string): number | undefined {
  const match = color.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)$/i,
  );
  if (!match) return undefined;

  const [, red, green, blue, alpha = "1"] = match;
  if (Number(alpha) === 0) return undefined;

  return relativeLuminance([Number(red), Number(green), Number(blue)]);
}

function relativeLuminance([red, green, blue]: number[]): number {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
