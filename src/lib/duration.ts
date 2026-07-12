export function hasDuration(seconds?: number): seconds is number {
  return typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0;
}

export function formatDuration(seconds?: number, fallback = "-"): string {
  if (!hasDuration(seconds)) return fallback;

  const roundedSeconds = Math.round(seconds);
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const remainingSeconds = roundedSeconds % 60;
  const parts = [
    hours ? `${hours}h` : "",
    minutes ? `${minutes}m` : "",
    remainingSeconds ? `${remainingSeconds}s` : "",
  ].filter(Boolean);

  return parts.length ? parts.join(" ") : fallback;
}

export function parseOptionalDurationSeconds(value: string): number | undefined {
  if (!value.trim()) return undefined;

  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function normalizeDurationSecondsInput(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatDurationInputValue(
  value: string,
  editing: boolean,
): string {
  if (editing) return value;
  if (value.trim() === "0") return "0";

  const seconds = parseOptionalDurationSeconds(value);
  return seconds ? formatDuration(seconds, "") : "";
}
