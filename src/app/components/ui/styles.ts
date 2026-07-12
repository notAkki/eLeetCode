import type { LeetCodeDifficulty, PersonalDifficulty } from "@/lib/model";
import type { CSSProperties } from "react";

export const floatingButtonClass =
  "inline-flex h-10 items-center justify-center rounded-full border border-solid border-lc-border bg-lc-surface text-lc-text transition-colors duration-150 hover:border-lc-border-hover hover:bg-lc-surface-hover focus:outline-none focus-visible:outline-none focus-visible:ring-0";

export const dashboardHeaderButtonClass =
  "h-9 border-lc-border bg-lc-control text-lc-text/70 hover:border-lc-border-hover hover:bg-lc-control-hover hover:text-lc-text active:!translate-x-0 active:!translate-y-0 focus-visible:border-lc-border-hover focus-visible:ring-0";

export const dashboardCardClass =
  "overflow-hidden rounded-lg border border-lc-border bg-lc-dark/20";

export const dashboardCardHeaderClass =
  "flex items-center justify-between gap-3 border-b border-lc-border px-3.5 py-2.5";

export const dashboardTableHeaderCellClass =
  "border-b border-lc-border px-3 py-2.5 text-left align-top text-[11px] font-semibold uppercase tracking-wide text-lc-text/45";

export const dashboardTableCellClass =
  "border-b border-lc-border px-3 py-2.5 align-top text-[13px] text-lc-text";

export const dashboardControlClass =
  "border-lc-border bg-lc-control text-lc-text placeholder:text-lc-text/35 focus-visible:border-lc-border-hover focus-visible:ring-0";

export const difficultyToggleBaseClass =
  "h-8 min-w-0 rounded-md border border-solid px-2 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:border-lc-border-hover focus-visible:ring-0";

export const rateTrackClass =
  "h-1.5 flex-1 overflow-hidden rounded-full border border-solid border-lc-border/70 bg-lc-control";

export const rateFillClass = "lst-rate-fill block h-full rounded-full";

export type TrackerToneStyle = {
  /** Soft surface/fill color, matching the pill background. */
  backgroundColor: string;
  /** Visual pill border color, matching the explicit HSL border token. */
  borderColor: string;
  /** Saturated foreground/accent color, matching the pill text. */
  textColor: string;
};

function makeToneStyle(
  backgroundColor: string,
  borderColor: string,
  textColor: string,
): TrackerToneStyle {
  return {
    backgroundColor,
    borderColor,
    textColor,
  };
}

const lcTone = {
  easy: {
    active: "border-lc-success-border bg-lc-success-soft text-lc-success",
    idle: "border-lc-border bg-lc-control text-lc-text/55 hover:border-lc-success-border hover:bg-lc-control-hover hover:text-lc-text/70",
    badge: "bg-lc-success-soft text-lc-success border border-lc-success-border",
    style: makeToneStyle(
      "var(--color-lc-success-soft)",
      "var(--color-lc-success-border)",
      "var(--color-lc-success)",
    ),
  },
  medium: {
    active: "border-lc-warning-border bg-lc-warning-soft text-lc-warning",
    idle: "border-lc-border bg-lc-control text-lc-text/55 hover:border-lc-warning-border hover:bg-lc-control-hover hover:text-lc-text/70",
    badge: "bg-lc-warning-soft text-lc-warning border border-lc-warning-border",
    style: makeToneStyle(
      "var(--color-lc-warning-soft)",
      "var(--color-lc-warning-border)",
      "var(--color-lc-warning)",
    ),
  },
  hard: {
    active: "border-lc-danger-border bg-lc-danger-soft text-lc-danger",
    idle: "border-lc-border bg-lc-control text-lc-text/55 hover:border-lc-danger-border hover:bg-lc-control-hover hover:text-lc-text/70",
    badge: "bg-lc-danger-soft text-lc-danger border border-lc-danger-border",
    style: makeToneStyle(
      "var(--color-lc-danger-soft)",
      "var(--color-lc-danger-border)",
      "var(--color-lc-danger)",
    ),
  },
  easyMinus: {
    active: "border-lc-teal-border bg-lc-teal-soft text-lc-teal",
    idle: "border-lc-border bg-lc-control text-lc-text/55 hover:border-lc-teal-border hover:bg-lc-control-hover hover:text-lc-text/70",
    badge: "bg-lc-teal-soft text-lc-teal border border-lc-teal-border",
    style: makeToneStyle(
      "var(--color-lc-teal-soft)",
      "var(--color-lc-teal-border)",
      "var(--color-lc-teal)",
    ),
  },
  orange: {
    active: "border-lc-orange-border bg-lc-orange-soft text-lc-orange",
    idle: "border-lc-border bg-lc-control text-lc-text/55 hover:border-lc-orange-border hover:bg-lc-control-hover hover:text-lc-text/70",
    badge: "bg-lc-orange-soft text-lc-orange border border-lc-orange-border",
    style: makeToneStyle(
      "var(--color-lc-orange-soft)",
      "var(--color-lc-orange-border)",
      "var(--color-lc-orange)",
    ),
  },
  review: {
    badge: "bg-lc-blue-soft text-lc-blue border border-lc-blue-border",
    style: makeToneStyle(
      "var(--color-lc-blue-soft)",
      "var(--color-lc-blue-border)",
      "var(--color-lc-blue)",
    ),
  },
  memorize: {
    badge: "bg-lc-purple-soft text-lc-purple border border-lc-purple-border",
    style: makeToneStyle(
      "var(--color-lc-purple-soft)",
      "var(--color-lc-purple-border)",
      "var(--color-lc-purple)",
    ),
  },
  hardPlus: {
    active: "border-lc-magenta-border bg-lc-magenta-soft text-lc-magenta",
    idle: "border-lc-border bg-lc-control text-lc-text/55 hover:border-lc-magenta-border hover:bg-lc-control-hover hover:text-lc-text/70",
    badge: "bg-lc-magenta-soft text-lc-magenta border border-lc-magenta-border",
    style: makeToneStyle(
      "var(--color-lc-magenta-soft)",
      "var(--color-lc-magenta-border)",
      "var(--color-lc-magenta)",
    ),
  },
  neutral: {
    badge: "bg-lc-surface-hover text-lc-text/70 border border-lc-border",
    style: {
      backgroundColor: "var(--color-lc-surface-hover)",
      borderColor: "var(--color-lc-border-hover)",
      textColor: "color-mix(in oklab, var(--color-lc-text) 70%, transparent)",
    },
  },
  success: {
    badge: "bg-lc-success-soft text-lc-success border border-lc-success-border",
    style: makeToneStyle(
      "var(--color-lc-success-soft)",
      "var(--color-lc-success-border)",
      "var(--color-lc-success)",
    ),
  },
  warning: {
    badge: "bg-lc-warning-soft text-lc-warning border border-lc-warning-border",
    style: makeToneStyle(
      "var(--color-lc-warning-soft)",
      "var(--color-lc-warning-border)",
      "var(--color-lc-warning)",
    ),
  },
  danger: {
    badge: "bg-lc-danger-soft text-lc-danger border border-lc-danger-border",
    style: makeToneStyle(
      "var(--color-lc-danger-soft)",
      "var(--color-lc-danger-border)",
      "var(--color-lc-danger)",
    ),
  },
} as const;

function toneKeyForValue(tone?: string): keyof typeof lcTone {
  const normalized = tone?.replace(/_/g, "-").toLowerCase();

  if (normalized === "easy-") return "easyMinus";
  if (normalized === "easy") return "easy";
  if (normalized === "medium") return "medium";
  if (normalized === "hard+") return "hardPlus";
  if (normalized === "hard") return "hard";
  if (
    normalized === "accent" ||
    normalized === "orange" ||
    normalized === "practiced" ||
    normalized === "hint" ||
    normalized === "with-hint"
  )
    return "orange";
  if (normalized === "suboptimal") return "warning";
  if (normalized === "memorize") return "memorize";
  if (normalized === "independent" || normalized === "done") return "success";
  if (normalized === "review" || normalized === "needs-review") return "review";
  if (normalized === "looked-up" || normalized === "redo") return "danger";

  return "neutral";
}

export function leetcodeDifficultyClassName(
  difficulty: LeetCodeDifficulty,
  active: boolean,
): string {
  switch (difficulty) {
    case "Easy":
      return active ? lcTone.easy.active : lcTone.easy.idle;
    case "Medium":
      return active ? lcTone.medium.active : lcTone.medium.idle;
    case "Hard":
      return active ? lcTone.hard.active : lcTone.hard.idle;
  }
}

export function personalDifficultyClassName(
  difficulty: PersonalDifficulty,
  active: boolean,
): string {
  switch (difficulty) {
    case "Easy-":
      return active ? lcTone.easyMinus.active : lcTone.easyMinus.idle;
    case "Easy":
      return active ? lcTone.easy.active : lcTone.easy.idle;
    case "Medium":
      return active ? lcTone.medium.active : lcTone.medium.idle;
    case "Hard":
      return active ? lcTone.hard.active : lcTone.hard.idle;
    case "Hard+":
      return active ? lcTone.hardPlus.active : lcTone.hardPlus.idle;
  }
}

export function trackerBadgeClassName(tone?: string): string {
  return lcTone[toneKeyForValue(tone)].badge;
}

export function trackerToneStyle(tone?: string): TrackerToneStyle {
  return lcTone[toneKeyForValue(tone)].style;
}

export function trackerTagClassName(_tag?: string): string {
  return "lst-tag-pill";
}

export function trackerTagStyle(tag?: string): CSSProperties | undefined {
  if (!tag) return undefined;
  const hue = hashString(tag) % 360;
  return { "--lst-tag-hue": hue } as CSSProperties;
}

function hashString(value: string): number {
  return [...value].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
}
