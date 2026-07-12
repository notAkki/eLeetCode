import type { LeetCodePageContext } from "../../lib/model";
import { extractLeetCodeContext } from "./extractContext";

export type AcceptedSubmissionEvent = {
  context: LeetCodePageContext;
  detectedAt: string;
};

const ACCEPTED_PATTERN = /\bAccepted\b/i;
const COOLDOWN_MS = 15_000;
const SUBMISSION_RESULT_SELECTOR = '[data-e2e-locator="submission-result"]';

export function watchAcceptedSubmissions(
  onAccepted: (event: AcceptedSubmissionEvent) => void
): () => void {
  let lastAcceptedAt = 0;
  let lastResultText = "";
  let scanQueued = false;

  const emitAccepted = () => {
    const now = Date.now();
    if (now - lastAcceptedAt < COOLDOWN_MS) {
      return;
    }

    lastAcceptedAt = now;
    onAccepted({
      context: extractLeetCodeContext(),
      detectedAt: new Date(now).toISOString()
    });
  };

  const scanSubmissionResult = () => {
    scanQueued = false;

    const result = document.querySelector<HTMLElement>(
      SUBMISSION_RESULT_SELECTOR
    );
    const resultText = normalizeWhitespace(result?.textContent ?? "");
    const changed = resultText !== lastResultText;

    lastResultText = resultText;

    if (changed && ACCEPTED_PATTERN.test(resultText)) {
      emitAccepted();
    }
  };

  const queueScan = () => {
    if (scanQueued) {
      return;
    }

    scanQueued = true;
    window.requestAnimationFrame(scanSubmissionResult);
  };

  const observer = new MutationObserver(queueScan);

  observer.observe(document.body, {
    childList: true,
    characterData: true,
    subtree: true
  });

  queueScan();

  return () => observer.disconnect();
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
