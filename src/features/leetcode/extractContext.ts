import {
  LEETCODE_DIFFICULTIES,
  PROGRAMMING_LANGUAGES,
  type LeetCodeDifficulty,
  type LeetCodePageContext,
  isLeetCodeDifficulty,
  leetcodeProblemUrl,
} from "../../lib/model";

const PROBLEM_TITLE_SELECTOR = "div.text-title-large a[href^='/problems/']";
const DIFFICULTY_BADGE_SELECTOR = "[class*='text-difficulty-']";
const PRIMARY_LANGUAGE_SELECTOR =
  "button[aria-haspopup='dialog'][aria-controls^='radix-'][data-state]";
const LANGUAGE_MENU_SELECTORS = [
  PRIMARY_LANGUAGE_SELECTOR,
  "[data-cy*='lang'] button",
  "[data-e2e-locator*='lang'] button",
  "button[aria-haspopup='listbox']",
  "button[aria-haspopup='menu']",
  "button[id*='headlessui-listbox-button']",
];
const TIMER_CANDIDATE_SELECTORS = [
  "[role='button'][aria-label]",
  "button[aria-label]",
  "[aria-label]:has(svg[data-icon='stopwatch'])",
  "[aria-label]:has(.fa-stopwatch)",
];
// <div class="flex h-full cursor-pointer items-center rounded-sd hover:bg-sd-accent rounded-r-none" role="button" aria-label="00:02:34" data-state="closed"><div class="h-8 w-8 flex-none"><div><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32" width="32" height="32" preserveAspectRatio="xMidYMid meet" style="width: 100%; height: 100%; transform: translate3d(0px, 0px, 0px); content-visibility: visible;"><defs><clipPath id="__lottie_element_2"><rect width="32" height="32" x="0" y="0"></rect></clipPath><clipPath id="__lottie_element_4"><path d="M0,0 L14,0 L14,16 L0,16z"></path></clipPath><g id="__lottie_element_14"><g transform="matrix(1,0,0,1,0,0)" opacity="1" style="display: block;"><path fill="rgb(0,0,0)" fill-opacity="1" d=" M16.04,29.95 C20.73,29.95 25.01,27.48 27.39,23.37 C29.78,19.33 29.78,14.31 27.39,10.2 C25.01,6.16 20.73,3.61 16.04,3.61 C11.27,3.61 7,6.16 4.61,10.2 C2.22,14.31 2.22,19.33 4.61,23.37 C7,27.48 11.27,29.95 16.04,29.95 C16.04,29.95 16.04,29.95 16.04,29.95 C16.04,29.95 16.04,29.95 16.04,29.95z"></path><g opacity="0" transform="matrix(2.6338000297546387,0,0,2.6338000297546387,-1.079702377319336,-8.240400314331055)"></g></g></g><mask id="__lottie_element_14_1" mask-type="alpha"><use xlink:href="#__lottie_element_14"></use></mask><g id="__lottie_element_21"><g transform="matrix(1,0,0,1,0,0)" opacity="1" style="display: block;"><path fill="rgb(0,0,0)" fill-opacity="1" d=" M16.03,23.15 C18.33,23.15 20.42,21.94 21.59,19.93 C22.75,17.95 22.75,15.5 21.59,13.48 C20.42,11.51 18.33,10.26 16.03,10.26 C13.69,10.26 11.6,11.51 10.44,13.48 C9.27,15.5 9.27,17.95 10.44,19.93 C11.6,21.94 13.69,23.15 16.03,23.15 C16.03,23.15 16.03,23.15 16.03,23.15 C16.03,23.15 16.03,23.15 16.03,23.15z"></path><g opacity="0" transform="matrix(1.2889999151229858,0,0,1.2889999151229858,7.651501655578613,4.458001136779785)"></g></g></g><mask id="__lottie_element_21_1" mask-type="alpha"><use xlink:href="#__lottie_element_21"></use></mask></defs><g clip-path="url(#__lottie_element_2)"><g mask="url(#__lottie_element_21_1)" style="display: block;"><g transform="matrix(1,0,0,1,0,0)" opacity="1"><g opacity="0" transform="matrix(1.2889999151229858,0,0,1.2889999151229858,7.651501655578613,4.458001136779785)"><path stroke-linecap="butt" stroke-linejoin="miter" fill-opacity="0" stroke-miterlimit="4" stroke="rgb(26,144,255)" stroke-opacity="1" stroke-width="2" d=" M6.5,14.5 C8.281000137329102,14.5 9.904000282287598,13.562999725341797 10.8100004196167,12 C11.717000007629395,10.468999862670898 11.717000007629395,8.562999725341797 10.8100004196167,7 C9.904000282287598,5.468999862670898 8.281000137329102,4.5 6.5,4.5 C4.688000202178955,4.5 3.065999984741211,5.468999862670898 2.1600000858306885,7 C1.253999948501587,8.562999725341797 1.253999948501587,10.468999862670898 2.1600000858306885,12 C3.065999984741211,13.562999725341797 4.688000202178955,14.5 6.5,14.5 C6.5,14.5 6.5,14.5 6.5,14.5 C6.5,14.5 6.5,14.5 6.5,14.5z"></path></g></g></g><g mask="url(#__lottie_element_14_1)" style="display: block;"><g transform="matrix(1,0,0,1,0,0)" opacity="1"><g opacity="0" transform="matrix(2.6338000297546387,0,0,2.6338000297546387,-1.079702377319336,-8.240400314331055)"><path stroke-linecap="butt" stroke-linejoin="miter" fill-opacity="0" stroke-miterlimit="4" stroke="rgb(26,144,255)" stroke-opacity="1" stroke-width="6" d=" M6.5,14.5 C8.281000137329102,14.5 9.904000282287598,13.562999725341797 10.8100004196167,12 C11.717000007629395,10.468999862670898 11.717000007629395,8.562999725341797 10.8100004196167,7 C9.904000282287598,5.468999862670898 8.281000137329102,4.5 6.5,4.5 C4.688000202178955,4.5 3.065999984741211,5.468999862670898 2.1600000858306885,7 C1.253999948501587,8.562999725341797 1.253999948501587,10.468999862670898 2.1600000858306885,12 C3.065999984741211,13.562999725341797 4.688000202178955,14.5 6.5,14.5 C6.5,14.5 6.5,14.5 6.5,14.5 C6.5,14.5 6.5,14.5 6.5,14.5z"></path></g></g></g><g clip-path="url(#__lottie_element_4)" transform="matrix(1,0,0,1,9.520000457763672,7.199999809265137)" opacity="0.9614496749305409" style="display: block;"><g transform="matrix(1,0,0,1,0,0)" opacity="1" style="display: block;"><g opacity="1" transform="matrix(1,0,0,1,0,0)"><path fill="rgb(26,144,255)" fill-opacity="1" d=" M7.25,6.75 C7.25,7.833000183105469 7.25,8.916999816894531 7.25,10 C7.25,10.437999725341797 6.906000137329102,10.75 6.5,10.75 C6.061999797821045,10.75 5.75,10.437999725341797 5.75,10 C5.75,8.916999816894531 5.75,7.833000183105469 5.75,6.75 C5.75,6.343999862670898 6.061999797821045,6 6.5,6 C6.906000137329102,6 7.25,6.343999862670898 7.25,6.75 C7.25,6.75 7.25,6.75 7.25,6.75 C7.25,6.75 7.25,6.75 7.25,6.75z"></path></g></g><g transform="matrix(1,0,0,1,0,0)" opacity="1" style="display: block;"><g opacity="1" transform="matrix(1,0,0,1,0,0)"><path fill="rgb(26,144,255)" fill-opacity="1" d=" M4,0.75 C4,0.3440000116825104 4.311999797821045,0 4.75,0 C5.916999816894531,0 7.083000183105469,0 8.25,0 C8.656000137329102,0 9,0.3440000116825104 9,0.75 C9,1.187999963760376 8.656000137329102,1.5 8.25,1.5 C7.916999816894531,1.5 7.583000183105469,1.5 7.25,1.5 C7.25,2.0209999084472656 7.25,2.5390000343322754 7.25,3.059999942779541 C8.593999862670898,3.2160000801086426 9.810999870300293,3.7850000858306885 10.779999732971191,4.659999847412109 C11.093000411987305,4.3480000495910645 11.406999588012695,4.0320000648498535 11.720000267028809,3.7200000286102295 C12.00100040435791,3.438999891281128 12.468999862670898,3.438999891281128 12.75,3.7200000286102295 C13.062000274658203,4.0320000648498535 13.062000274658203,4.499000072479248 12.75,4.78000020980835 C12.427000045776367,5.103000164031982 12.102999687194824,5.427000045776367 11.779999732971191,5.75 C12.529999732971191,6.813000202178955 13,8.125 13,9.5 C13,13.093999862670898 10.062000274658203,16 6.5,16 C2.9059998989105225,16 0,13.093999862670898 0,9.5 C0,6.186999797821045 2.5,3.434999942779541 5.75,3.059999942779541 C5.75,2.5390000343322754 5.75,2.0209999084472656 5.75,1.5 C5.416999816894531,1.5 5.083000183105469,1.5 4.75,1.5 C4.311999797821045,1.5 4,1.187999963760376 4,0.75 C4,0.75 4,0.75 4,0.75 C4,0.75 4,0.75 4,0.75z M6.5,14.5 C8.281000137329102,14.5 9.904000282287598,13.562999725341797 10.8100004196167,12 C11.717000007629395,10.468999862670898 11.717000007629395,8.562999725341797 10.8100004196167,7 C9.904000282287598,5.468999862670898 8.281000137329102,4.5 6.5,4.5 C4.688000202178955,4.5 3.065999984741211,5.468999862670898 2.1600000858306885,7 C1.253999948501587,8.562999725341797 1.253999948501587,10.468999862670898 2.1600000858306885,12 C3.065999984741211,13.562999725341797 4.688000202178955,14.5 6.5,14.5 C6.5,14.5 6.5,14.5 6.5,14.5 C6.5,14.5 6.5,14.5 6.5,14.5z M7.25,6.75 C7.25,7.833000183105469 7.25,8.916999816894531 7.25,10 C7.25,10.437999725341797 6.906000137329102,10.75 6.5,10.75 C6.061999797821045,10.75 5.75,10.437999725341797 5.75,10 C5.75,8.916999816894531 5.75,7.833000183105469 5.75,6.75 C5.75,6.343999862670898 6.061999797821045,6 6.5,6 C6.906000137329102,6 7.25,6.343999862670898 7.25,6.75 C7.25,6.75 7.25,6.75 7.25,6.75 C7.25,6.75 7.25,6.75 7.25,6.75z"></path><g opacity="1" transform="matrix(1,0,0,1,0,0)"></g><g opacity="1" transform="matrix(1,0,0,1,0,0)"></g><g opacity="1" transform="matrix(1,0,0,1,0,0)"></g></g></g></g></g></svg></div></div></div>
// <div class="flex h-8 flex-none items-center p-1 text-sd-muted-foreground"><div class="flex h-full cursor-pointer items-center rounded-sd-sm px-px hover:bg-sd-accent" role="button" aria-label="Hide" data-state="closed"><div class="relative text-[14px] leading-[normal] before:block before:h-3.5 before:w-3.5"><svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="angle-left" class="svg-inline--fa fa-angle-left absolute h-[1em] -translate-x-1/2 -translate-y-1/2 align-[-0.125em] left-1/2 top-1/2" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path fill="currentColor" d="M47 239c-9.4 9.4-9.4 24.6 0 33.9L207 433c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9L97.9 256 241 113c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0L47 239z"></path></svg></div></div><div class="flex h-full cursor-pointer items-center gap-0.5 rounded-sd-sm p-0.5 hover:bg-sd-accent" role="button" aria-label="Pause" data-state="closed"><div class="relative text-[14px] leading-[normal] p-[1px] before:block before:h-3.5 before:w-3.5"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="pause" class="svg-inline--fa fa-pause absolute h-[1em] -translate-x-1/2 -translate-y-1/2 align-[-0.125em] left-1/2 top-1/2" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path fill="currentColor" d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z"></path></svg></div><div class="select-none text-sm text-sd-blue-400">00:04:48</div></div><div class="flex h-full cursor-pointer rounded-sd-sm p-1 hover:bg-sd-accent" role="button" aria-label="Reset" data-state="closed"><div class="relative text-[14px] leading-[normal] p-[1px] before:block before:h-3.5 before:w-3.5"><svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="arrows-rotate" class="svg-inline--fa fa-arrows-rotate absolute h-[1em] -translate-x-1/2 -translate-y-1/2 align-[-0.125em] left-1/2 top-1/2" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M496 200c0 13.3-10.7 24-24 24h0H360 328c-13.3 0-24-10.7-24-24s10.7-24 24-24h32 54.1l-52.1-52.1C333.8 95.8 295.7 80 256 80c-72.7 0-135.2 44.1-162 107.1c-5.2 12.2-19.3 17.9-31.5 12.7s-17.9-19.3-12.7-31.5C83.9 88.2 163.4 32 256 32c52.5 0 102.8 20.8 139.9 57.9L448 142.1V88l0-.4V56c0-13.3 10.7-24 24-24s24 10.7 24 24V200zM40 288H152c13.3 0 24 10.7 24 24s-10.7 24-24 24H97.9l52.1 52.1C178.2 416.2 216.3 432 256 432c72.6 0 135-43.9 161.9-106.8c5.2-12.2 19.3-17.8 31.5-12.6s17.8 19.3 12.6 31.5C427.8 424 348.5 480 256 480c-52.5 0-102.8-20.8-139.9-57.9L64 369.9V424c0 13.3-10.7 24-24 24s-24-10.7-24-24V312c0-13.3 10.7-24 24-24z"></path></svg></div></div></div>
const MONACO_TEXTAREA_SELECTOR = ".monaco-editor textarea.inputarea";
const MONACO_VIEW_LINE_SELECTOR = ".monaco-editor .view-lines .view-line";

export function extractLeetCodeContext(
  doc: Document = document,
  location: Location = window.location,
): LeetCodePageContext {
  const slug = extractSlug(location);

  return {
    slug,
    title: extractTitle(doc, slug),
    url: leetcodeProblemUrl(slug),
    difficulty: extractDifficulty(doc),
    language: extractLanguage(doc),
    code: extractEditorCode(doc),
    elapsedSeconds: extractElapsedSeconds(doc),
    extractedAt: new Date().toISOString(),
  };
}

function extractSlug(location: Location): string {
  const match = location.pathname.match(/\/problems\/([^/]+)/);
  if (match?.[1]) {
    return decodeURIComponent(match[1]);
  }

  return "unknown-problem";
}

function extractTitle(doc: Document, slug: string): string | undefined {
  const title = doc.querySelector<HTMLElement>(PROBLEM_TITLE_SELECTOR);
  const titleText = normalizeWhitespace(title?.textContent ?? "");
  if (titleText) {
    return titleText;
  }

  return titleFromSlug(slug);
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractDifficulty(doc: Document): LeetCodeDifficulty | undefined {
  const badge = doc.querySelector<HTMLElement>(DIFFICULTY_BADGE_SELECTOR);
  const badgeText = normalizeWhitespace(badge?.textContent ?? "");

  if (isLeetCodeDifficulty(badgeText)) {
    return badgeText;
  }

  const badgeClass = badge?.className.toString() ?? "";

  for (const difficulty of LEETCODE_DIFFICULTIES) {
    const classToken = `text-difficulty-${difficulty.toLowerCase()}`;
    if (badgeClass.includes(classToken)) {
      return difficulty;
    }
  }

  return undefined;
}

function extractLanguage(doc: Document): string | undefined {
  for (const selector of LANGUAGE_MENU_SELECTORS) {
    const language = extractLanguageFromElements(
      Array.from(doc.querySelectorAll<HTMLElement>(selector)),
    );

    if (language) {
      return language;
    }
  }

  return extractLanguageFromElements(
    Array.from(doc.querySelectorAll<HTMLElement>("button")),
  );
}

function extractLanguageFromElements(
  elements: HTMLElement[],
): string | undefined {
  for (const element of elements) {
    for (const value of languageCandidateValues(element)) {
      const language = normalizeLanguageLabel(value);
      if (language) {
        return language;
      }
    }
  }

  return undefined;
}

function languageCandidateValues(element: HTMLElement): string[] {
  return [
    element.textContent ?? "",
    element.getAttribute("aria-label") ?? "",
    element.getAttribute("title") ?? "",
    element.getAttribute("data-value") ?? "",
    element.getAttribute("value") ?? "",
  ];
}

function normalizeLanguageLabel(value: string): string | undefined {
  const label = normalizeWhitespace(value);

  if (!label || label.length > 80) {
    return undefined;
  }

  const exactMatch = PROGRAMMING_LANGUAGES.find(
    (language) => language.toLowerCase() === label.toLowerCase(),
  );
  if (exactMatch) {
    return exactMatch;
  }

  return PROGRAMMING_LANGUAGES.find((language) =>
    new RegExp(`(^|\\s)${escapeRegExp(language)}(\\s|$)`, "i").test(label),
  );
}

function extractEditorCode(doc: Document): string | undefined {
  const textArea = doc.querySelector<HTMLTextAreaElement>(
    MONACO_TEXTAREA_SELECTOR,
  );
  if (textArea?.value.trim()) {
    return textArea.value;
  }

  const monacoLines = Array.from(
    doc.querySelectorAll<HTMLElement>(MONACO_VIEW_LINE_SELECTOR),
  );
  if (monacoLines.length > 0) {
    const code = monacoLines
      .map((line) => line.textContent ?? "")
      .join("\n")
      .trimEnd();
    return code.trim() ? code : undefined;
  }

  return undefined;
}

function extractElapsedSeconds(doc: Document): number | undefined {
  const candidates = uniqueElements(
    TIMER_CANDIDATE_SELECTORS.flatMap((selector) =>
      Array.from(doc.querySelectorAll<HTMLElement>(selector)),
    ),
  );

  for (const candidate of candidates) {
    const seconds = timerCandidateValues(candidate)
      .map(parseTimerText)
      .find((value) => value !== undefined);

    if (seconds !== undefined) {
      return seconds;
    }
  }

  return undefined;
}

function timerCandidateValues(element: HTMLElement): string[] {
  return [
    element.textContent ?? "",
    element.getAttribute("aria-label") ?? "",
    element.getAttribute("title") ?? "",
  ].map(normalizeWhitespace);
}

function uniqueElements(elements: HTMLElement[]): HTMLElement[] {
  return Array.from(new Set(elements));
}

function parseTimerText(value: string): number | undefined {
  const text = normalizeWhitespace(value);
  const match = text.match(/(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/);
  if (!match) {
    return undefined;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds)
  ) {
    return undefined;
  }

  return hours * 3600 + minutes * 60 + seconds;
}
function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
