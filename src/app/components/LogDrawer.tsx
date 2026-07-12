import { Check, LoaderCircle, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import {
  loadGithubSettingsViaBackground,
  loadTrackerViaBackground,
  saveSessionViaBackground,
} from "../backgroundClient";
import { extractLeetCodeContext } from "../../features/leetcode/extractContext";
import {
  formatDurationInputValue,
  normalizeDurationSecondsInput,
  parseOptionalDurationSeconds,
} from "../../lib/duration";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerTitle,
} from "./ui/drawer";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import { Button } from "@/app/components/ui/button";
import {
  difficultyToggleBaseClass,
  leetcodeDifficultyClassName,
  personalDifficultyClassName,
  trackerTagClassName,
  trackerTagStyle,
} from "./ui/styles";
import type {
  GithubSettings,
  LeetCodeDifficulty,
  LeetCodePageContext,
  PersonalDifficulty,
  ProblemReviewFlag,
  SaveSessionInput,
  SolveOutcome,
} from "../../lib/model";
import {
  LEETCODE_DIFFICULTIES,
  LEETCODE_DIFFICULTY_LABELS,
  OUTCOME_LABELS,
  PERSONAL_DIFFICULTIES,
  PERSONAL_DIFFICULTY_LABELS,
  PROGRAMMING_LANGUAGES,
  PROBLEM_REVIEW_FLAGS,
  PROBLEM_REVIEW_FLAG_LABELS,
  SOLVE_OUTCOMES,
  normalizeTag,
  normalizeTags,
} from "../../lib/model";

const UNKNOWN_LANGUAGE_VALUE = "__unknown";
const NO_REVIEW_FLAG_VALUE = "__none";
const SUCCESS_CLOSE_DELAY_MS = 650;

type LogDrawerProps = {
  open: boolean;
  seedContext?: LeetCodePageContext;
  onClose: () => void;
};

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };
type GithubSettingsState =
  | { status: "idle" }
  | { status: "loaded"; settings: GithubSettings }
  | { status: "error" };

export function LogDrawer({ open, seedContext, onClose }: LogDrawerProps) {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const [context, setContext] = useState<LeetCodePageContext | null>(null);
  const [problemTitle, setProblemTitle] = useState("");
  const [leetcodeDifficulty, setLeetcodeDifficulty] = useState<
    LeetCodeDifficulty | ""
  >("");
  const [language, setLanguage] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [durationFocused, setDurationFocused] = useState(false);
  const [personalDifficulty, setPersonalDifficulty] = useState<
    PersonalDifficulty | ""
  >("");
  const [outcome, setOutcome] = useState<SolveOutcome>("independent");
  const [reviewFlag, setReviewFlag] = useState<ProblemReviewFlag | "">("");
  const [tags, setTags] = useState<string[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [codeText, setCodeText] = useState("");
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [githubSettingsState, setGithubSettingsState] =
    useState<GithubSettingsState>({ status: "idle" });

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextContext = seedContext ?? extractLeetCodeContext();
    setContext(nextContext);
    setProblemTitle(nextContext.title ?? "");
    setLeetcodeDifficulty(nextContext.difficulty ?? "");
    setLanguage(nextContext.language ?? "");
    setDurationSeconds(
      nextContext.elapsedSeconds && nextContext.elapsedSeconds > 0
        ? String(Math.round(nextContext.elapsedSeconds))
        : "",
    );
    setDurationFocused(false);
    setPersonalDifficulty("");
    setOutcome("independent");
    setReviewFlag("");
    setTags([]);
    setNotes("");
    setCodeText(nextContext.code ?? "");
    setSaveState({ status: "idle" });
  }, [open, seedContext]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    void loadGithubSettingsViaBackground()
      .then((settings) => {
        if (!cancelled) {
          setGithubSettingsState({ status: "loaded", settings });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGithubSettingsState({ status: "error" });
        }
      });

    void loadTrackerViaBackground()
      .then(({ tracker }) => {
        if (cancelled) return;

        setExistingTags(
          normalizeTags(
            Object.values(tracker.problems).flatMap((problem) => problem.tags),
          ).sort((a, b) => a.localeCompare(b)),
        );
      })
      .catch(() => {
        if (!cancelled) setExistingTags([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const durationDisplayValue = useMemo(
    () => formatDurationInputValue(durationSeconds, durationFocused),
    [durationFocused, durationSeconds],
  );
  const submitState =
    saveState.status === "saving"
      ? "saving"
      : saveState.status === "success"
        ? "success"
        : "idle";
  const githubSettingsMissing =
    githubSettingsState.status !== "loaded" ||
    hasMissingGithubSettings(githubSettingsState.settings);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const activeContext = context ?? extractLeetCodeContext();
    const title = problemTitle.trim() || activeContext.title;
    const input: SaveSessionInput = {
      context: {
        ...activeContext,
        title,
        difficulty: leetcodeDifficulty || undefined,
      },
      language: language.trim() || activeContext.language || "Unknown",
      outcome,
      tags,
      personalDifficulty: personalDifficulty || undefined,
      reviewFlag: reviewFlag || undefined,
      notes: notes.trim() || undefined,
      duration: parseOptionalDurationSeconds(durationSeconds),
      code: codeText.trim() || undefined,
    };

    setSaveState({ status: "saving" });

    try {
      await saveSessionViaBackground(input);
      setSaveState({
        status: "success",
        message: "Saved!",
      });
      setTimeout(() => {
        onClose();
      }, SUCCESS_CLOSE_DELAY_MS);
    } catch (error) {
      setSaveState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save the attempt.",
      });
    }
  }

  return (
    <>
      <div ref={setPortalContainer} />
      <Drawer
        direction="right"
        open={open}
        container={portalContainer}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            onClose();
          }
        }}
      >
        <DrawerContent className="flex h-svh max-h-svh w-[460px] max-w-[460px] flex-col overflow-hidden rounded-none border-l border-solid border-lc-border bg-lc-surface text-lc-text">
          <form
            className="flex min-h-0 flex-1 flex-col"
            data-vaul-no-drag=""
            onSubmit={handleSubmit}
          >
            <div
              className="min-h-0 flex-1 overflow-y-auto p-4"
              data-vaul-no-drag=""
              onWheel={(event) => event.stopPropagation()}
            >
              <FieldGroup>
                <FieldSet>
                  <FieldLegend>Log Solution</FieldLegend>

                  <FieldDescription>
                    Log your LeetCode submission details
                  </FieldDescription>

                  {githubSettingsMissing ? (
                    <p className="rounded-md border border-lc-warning-border bg-lc-warning-soft px-3 py-2 text-xs text-lc-warning">
                      Add GitHub settings from the dashboard Settings tab before
                      saving.
                    </p>
                  ) : null}

                  <Field>
                    <FieldLabel>Problem</FieldLabel>
                    <Input
                      placeholder="1. Two Sum"
                      value={problemTitle}
                      onChange={(event) => setProblemTitle(event.target.value)}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Leetcode Difficulty</FieldLabel>
                    <DifficultyToggleGroup
                      value={leetcodeDifficulty}
                      values={LEETCODE_DIFFICULTIES}
                      labels={LEETCODE_DIFFICULTY_LABELS}
                      getClassName={leetcodeDifficultyClassName}
                      onValueChange={(value) => {
                        setLeetcodeDifficulty(value as LeetCodeDifficulty | "");
                        setPersonalDifficulty(value as PersonalDifficulty | "");
                      }}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Personal Difficulty</FieldLabel>
                    <DifficultyToggleGroup
                      value={personalDifficulty}
                      values={PERSONAL_DIFFICULTIES}
                      labels={PERSONAL_DIFFICULTY_LABELS}
                      getClassName={personalDifficultyClassName}
                      onValueChange={(value) =>
                        setPersonalDifficulty(value as PersonalDifficulty | "")
                      }
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel>Language</FieldLabel>
                      <NativeSelect
                        aria-label="Language"
                        value={language || UNKNOWN_LANGUAGE_VALUE}
                        onChange={(event) =>
                          setLanguage(
                            event.target.value === UNKNOWN_LANGUAGE_VALUE
                              ? ""
                              : event.target.value,
                          )
                        }
                      >
                        <NativeSelectOption value={UNKNOWN_LANGUAGE_VALUE}>
                          Unknown
                        </NativeSelectOption>

                        {PROGRAMMING_LANGUAGES.map((option) => (
                          <NativeSelectOption key={option} value={option}>
                            {option}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>

                    <Field>
                      <FieldLabel>Duration</FieldLabel>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        value={durationDisplayValue}
                        onFocus={() => setDurationFocused(true)}
                        onBlur={() => setDurationFocused(false)}
                        onChange={(event) =>
                          setDurationSeconds(
                            normalizeDurationSecondsInput(event.target.value),
                          )
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Outcome</FieldLabel>
                      <NativeSelect
                        value={outcome}
                        onChange={(event) =>
                          setOutcome(event.target.value as SolveOutcome)
                        }
                      >
                        {SOLVE_OUTCOMES.map((value) => (
                          <NativeSelectOption key={value} value={value}>
                            {OUTCOME_LABELS[value]}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>

                    <Field>
                      <FieldLabel>Review Flag</FieldLabel>
                      <NativeSelect
                        value={reviewFlag || NO_REVIEW_FLAG_VALUE}
                        onChange={(event) =>
                          setReviewFlag(
                            event.target.value === NO_REVIEW_FLAG_VALUE
                              ? ""
                              : (event.target.value as ProblemReviewFlag),
                          )
                        }
                      >
                        <NativeSelectOption value={NO_REVIEW_FLAG_VALUE}>
                          None
                        </NativeSelectOption>

                        {PROBLEM_REVIEW_FLAGS.map((flag) => (
                          <NativeSelectOption key={flag} value={flag}>
                            {PROBLEM_REVIEW_FLAG_LABELS[flag]}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel>Tags</FieldLabel>
                    <TagEditor
                      value={tags}
                      suggestions={existingTags}
                      onChange={setTags}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Notes</FieldLabel>
                    <Textarea
                      placeholder="What stood out?"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="min-h-24 resize-none bg-lc-dark/25 border-lc-border"
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Code</FieldLabel>
                    <Textarea
                      className="min-h-24 resize-none font-mono text-[12px]! leading-5 bg-lc-dark/25 border-lc-border"
                      spellCheck={false}
                      value={codeText}
                      onChange={(event) => setCodeText(event.target.value)}
                      placeholder="No editor code was detected yet."
                    />
                  </Field>
                </FieldSet>
              </FieldGroup>
            </div>

            <DrawerFooter className="shrink-0 border-lc-border bg-lc-surface px-4 pb-4 pt-3">
              {saveState.status === "error" && (
                <p className="text-xs text-lc-danger">{saveState.message}</p>
              )}

              <Button
                type="submit"
                disabled={saveState.status === "saving"}
                className="py-5 bg-lc-dark/25 border-lc-border flex items-center gap-2 hover:bg-lc-dark/50 text-lc-text disabled:opacity-100"
              >
                <span className="lst-submit-icon-stack" aria-hidden="true">
                  <span
                    className="lst-submit-icon"
                    data-active={submitState === "idle"}
                  >
                    <Save size={15} />
                  </span>
                  <span
                    className="lst-submit-icon"
                    data-active={submitState === "saving"}
                  >
                    <LoaderCircle className="lst-submit-spinner" size={16} />
                  </span>
                  <span
                    className="lst-submit-icon"
                    data-active={submitState === "success"}
                  >
                    <Check size={16} />
                  </span>
                </span>
                {saveState.status === "success"
                  ? saveState.message
                  : saveState.status === "saving"
                    ? "Saving"
                    : "Save"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function DifficultyToggleGroup<TValue extends string>({
  value,
  values,
  labels,
  getClassName,
  onValueChange,
}: {
  value: TValue | "";
  values: readonly TValue[];
  labels: Record<TValue, string>;
  getClassName: (value: TValue, active: boolean) => string;
  onValueChange: (value: TValue | "") => void;
}) {
  return (
    <div
      className="grid w-full gap-2"
      style={{
        gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))`,
      }}
    >
      {values.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          className={`${difficultyToggleBaseClass} px-0 ${getClassName(
            option,
            value === option,
          )}`}
          onClick={() => onValueChange(value === option ? "" : option)}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}

function TagEditor({
  value,
  suggestions,
  onChange,
}: {
  value: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const query = normalizeTag(inputValue);
  const suggestionOptions = useMemo(
    () =>
      suggestions
        .filter((tag) => !hasTag(value, tag))
        .filter(
          (tag) => !query || tag.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 8),
    [query, suggestions, value],
  );

  function addTags(rawTags: readonly string[]) {
    const nextTags = normalizeTags([
      ...value,
      ...rawTags.map((tag) => canonicalizeTag(tag, suggestions)),
    ]);
    onChange(nextTags);
    setInputValue("");
  }

  function addInputValue() {
    const nextTags = splitTagInput(inputValue);
    if (nextTags.length === 0) return;
    addTags(nextTags);
  }

  function removeTag(tag: string) {
    onChange(value.filter((candidate) => tagKey(candidate) !== tagKey(tag)));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Tab" && inputValue.trim() && suggestionOptions[0]) {
      event.preventDefault();
      addTags([suggestionOptions[0]]);
      return;
    }

    if (event.key === "Enter" || event.key === ",") {
      if (inputValue.trim()) {
        event.preventDefault();
        addInputValue();
      }
      return;
    }

    if (event.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div
      className="space-y-2"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setSuggestionsOpen(false);
        }
      }}
    >
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-lc-border bg-lc-dark/25 p-1.5 transition-colors focus-within:border-lc-border-hover">
        {value.map((tag) => (
          <TagPill key={tag} tag={tag} onRemove={() => removeTag(tag)} />
        ))}
        <input
          className="min-w-[96px] flex-1 bg-transparent px-1 py-1 text-sm text-lc-text outline-none placeholder:text-lc-text/35"
          value={inputValue}
          placeholder={value.length ? "Add tag..." : "Add tags..."}
          onFocus={() => setSuggestionsOpen(true)}
          onClick={() => setSuggestionsOpen(true)}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addInputValue}
        />
      </div>

      {suggestionsOpen && suggestionOptions.length ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestionOptions.map((tag) => (
            <button
              key={tag}
              type="button"
              className="rounded-full focus:outline-none focus-visible:outline-none"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => addTags([tag])}
            >
              <TagPill tag={tag} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TagPill({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1 whitespace-nowrap rounded-full border border-solid px-2.5 py-0.5 text-xs font-medium ${trackerTagClassName(
        tag,
      )}`}
      style={trackerTagStyle(tag)}
    >
      {tag}
      {onRemove ? (
        <button
          type="button"
          className="-mr-1 inline-flex size-4 items-center justify-center rounded-full text-current/70 hover:bg-black/15 hover:text-current focus:outline-none"
          aria-label={`Remove ${tag}`}
          onClick={onRemove}
        >
          <X aria-hidden="true" size={11} />
        </button>
      ) : null}
    </span>
  );
}

function splitTagInput(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function hasMissingGithubSettings(settings: GithubSettings): boolean {
  return [settings.token, settings.owner, settings.repo, settings.branch].some(
    (value) => !value || value.startsWith("YOUR_"),
  );
}

function hasTag(tags: readonly string[], tag: string): boolean {
  return tags.some((candidate) => tagKey(candidate) === tagKey(tag));
}

function tagKey(tag: string): string {
  return normalizeTag(tag).toLowerCase();
}

function canonicalizeTag(tag: string, existingTags: readonly string[]): string {
  const normalized = normalizeTag(tag);
  const key = tagKey(normalized);
  return (
    existingTags.find((existingTag) => tagKey(existingTag) === key) ??
    normalized
  );
}
