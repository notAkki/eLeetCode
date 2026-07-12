import {
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDuration, hasDuration } from "../../lib/duration";
import {
  OUTCOME_LABELS,
  PROBLEM_REVIEW_FLAGS,
  PROBLEM_REVIEW_FLAG_LABELS,
  SOLVE_OUTCOMES,
  leetcodeProblemUrl,
} from "../../lib/model";
import type {
  Attempt,
  GithubSettings,
  Problem,
  ProblemReviewFlag,
  SolveOutcome,
  TrackerDatabase,
} from "../../lib/model";
import {
  DEFAULT_GITHUB_SETTINGS,
  normalizeGithubSettings,
} from "../../lib/model";
import { cn } from "../../lib/utils";
import {
  loadGithubSettingsViaBackground,
  loadTrackerViaBackground,
  saveGithubSettingsViaBackground,
} from "../backgroundClient";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  dashboardCardClass,
  dashboardCardHeaderClass,
  dashboardControlClass,
  dashboardHeaderButtonClass,
  dashboardTableCellClass,
  dashboardTableHeaderCellClass,
  rateFillClass,
  rateTrackClass,
  trackerBadgeClassName,
  trackerTagClassName,
  trackerTagStyle,
  trackerToneStyle,
} from "./ui/styles";

type DashboardProps = { open: boolean; onClose: () => void };
type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; tracker: TrackerDatabase; trackerPath: string }
  | { status: "error"; message: string };
type SettingsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; settings: GithubSettings }
  | { status: "error"; message: string };
type SettingsSaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };
type DashboardTab = "problems" | "review" | "tags" | "settings";
type AttemptRow = Attempt & { problemSlug: string; problemTitle: string };
type ProblemFilters = {
  search: string;
  tags: string[];
  difficulties: string[];
  outcomes: string[];
  reviewFlags: string[];
  sort: "lastAttempted" | "title" | "attempts" | "difficulty";
};
type TagFilters = {
  search: string;
  difficulties: string[];
  sort: "weakest" | "mostPracticed" | "latest" | "fastest";
};
type TagAggregate = {
  tag: string;
  problems: Problem[];
  totalAttempts: number;
  uniqueProblems: number;
  reviewFlagCount: number;
  outcomeCounts: Record<SolveOutcome, number>;
  independentRate: number;
  hintRate: number;
  lookedUpRate: number;
  suboptimalRate: number;
  averageDuration?: number;
  latestAt?: string;
};
type TrainingSuggestion = {
  problem: Problem;
  latest?: AttemptRow;
  score: number;
  reasons: Array<{ label: string; tone?: string }>;
};
type DashboardStats = {
  problemTotal: number;
  outcomeCounts: Record<SolveOutcome, number>;
  reviewCounts: Record<ProblemReviewFlag, number>;
  tagStats: TagAggregate[];
  suggestions: TrainingSuggestion[];
  feltEasier: Problem[];
  feltHarder: Problem[];
};
type ChartSegment = {
  label: string;
  value: number;
  tone: string;
};
type RateTone = "independent" | "hint" | "looked_up" | "practiced";

const LC_DIFFICULTY_RANK: Record<string, number> = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
};
const PERSONAL_DIFFICULTY_RANK: Record<string, number> = {
  "Easy-": 0.5,
  Easy: 1,
  Medium: 2,
  Hard: 3,
  "Hard+": 4,
};
const EXPANDED_PROBLEM_ANIMATION_MS = 200;
const LOADING_INDICATOR_DELAY_MS = 180;
const emptyProblemFilters: ProblemFilters = {
  search: "",
  tags: [],
  difficulties: [],
  outcomes: [],
  reviewFlags: [],
  sort: "lastAttempted",
};
const NO_REVIEW_FLAG_FILTER = "__none";
const emptyTagFilters: TagFilters = {
  search: "",
  difficulties: [],
  sort: "weakest",
};

export function Dashboard({ open, onClose }: DashboardProps) {
  const dashboardRootRef = useRef<HTMLDivElement>(null);
  const dashboardContentRef = useRef<HTMLElement>(null);
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle" });
  const [settingsState, setSettingsState] = useState<SettingsState>({
    status: "idle",
  });
  const [selectPortalContainer, setSelectPortalContainer] = useState<
    Element | DocumentFragment | null
  >(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("problems");
  const [problemFilters, setProblemFilters] =
    useState<ProblemFilters>(emptyProblemFilters);
  const [tagFilters, setTagFilters] = useState<TagFilters>(emptyTagFilters);
  const [expandedSlug, setExpandedSlug] = useState<string | undefined>();
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [trackerRefreshing, setTrackerRefreshing] = useState(false);
  const [showInitialLoading, setShowInitialLoading] = useState(false);

  useEffect(() => {
    const rootNode = dashboardRootRef.current?.getRootNode();
    setSelectPortalContainer(rootNode instanceof ShadowRoot ? rootNode : null);
  }, []);

  useEffect(() => {
    if (!open) return;
    scrollDashboardContentToTop();
    void loadTracker();
  }, [open]);

  useEffect(() => {
    if (!open || settingsState.status !== "idle") return;
    void loadGithubSettings();
  }, [open, settingsState.status]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    const isInitialLoading =
      open &&
      activeTab !== "settings" &&
      (loadState.status === "idle" || loadState.status === "loading");
    if (!isInitialLoading) {
      setShowInitialLoading(false);
      return;
    }

    const timeout = window.setTimeout(
      () => setShowInitialLoading(true),
      LOADING_INDICATOR_DELAY_MS,
    );
    return () => {
      window.clearTimeout(timeout);
      setShowInitialLoading(false);
    };
  }, [activeTab, loadState.status, open]);

  async function loadTracker() {
    const previous =
      loadState.status === "loaded"
        ? { tracker: loadState.tracker, trackerPath: loadState.trackerPath }
        : undefined;

    if (previous) {
      setTrackerRefreshing(true);
    } else {
      setLoadState({ status: "loading" });
    }

    try {
      const result = await loadTrackerViaBackground();
      setLoadState({
        status: "loaded",
        tracker: result.tracker,
        trackerPath: result.trackerPath,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load tracker data.";
      if (previous) {
        setLoadState({ status: "loaded", ...previous });
      } else {
        setLoadState({ status: "error", message });
      }
    } finally {
      setTrackerRefreshing(false);
    }
  }

  async function loadGithubSettings() {
    setSettingsState({ status: "loading" });
    try {
      const settings = await loadGithubSettingsViaBackground();
      setSettingsState({ status: "loaded", settings });
    } catch (error) {
      setSettingsState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to load GitHub settings.",
      });
    }
  }

  async function saveGithubSettings(settings: GithubSettings) {
    const saved = await saveGithubSettingsViaBackground(settings);
    setSettingsState({ status: "loaded", settings: saved });
    return saved;
  }

  function scrollDashboardContentToTop() {
    const content = dashboardContentRef.current;
    if (!content) return;
    content.scrollTop = 0;
    content.scrollLeft = 0;
  }

  function changeTab(tab: DashboardTab) {
    if (tab === activeTab) return;
    scrollDashboardContentToTop();
    setActiveTab(tab);
  }

  function refreshCurrentTab() {
    scrollDashboardContentToTop();
    void (activeTab === "settings" ? loadGithubSettings() : loadTracker());
  }

  const tracker = loadState.status === "loaded" ? loadState.tracker : undefined;
  const problems = useMemo(
    () => Object.values(tracker?.problems ?? {}),
    [tracker],
  );
  const attempts = useMemo(() => flattenAttempts(problems), [problems]);
  const filterOptions = useMemo(() => buildFilterOptions(problems), [problems]);
  const stats = useMemo(
    () => buildDashboardStats(problems, attempts),
    [attempts, problems],
  );
  const filteredProblems = useMemo(
    () => filterProblems(problems, attempts, problemFilters),
    [attempts, problemFilters, problems],
  );
  const filteredTags = useMemo(
    () => filterTagStats(stats.tagStats, tagFilters),
    [stats.tagStats, tagFilters],
  );
  const activeTag = useMemo(
    () =>
      stats.tagStats.find((tag) => tag.tag === selectedTag) ??
      filteredTags[0] ??
      stats.tagStats[0],
    [filteredTags, selectedTag, stats.tagStats],
  );
  const trackerLoading = loadState.status === "loading" || trackerRefreshing;
  const refreshLoading =
    activeTab === "settings"
      ? settingsState.status === "loading"
      : trackerLoading;

  return (
    <>
      <div
        data-state={open ? "open" : "closed"}
        data-open={open ? "" : undefined}
        data-closed={!open ? "" : undefined}
        aria-hidden="true"
        className={`fixed inset-0 isolate z-50 bg-black/10 backdrop-blur-xs transition-opacity duration-100 ${open ? "opacity-100 pointer-events-auto ease-out" : "opacity-0 pointer-events-none ease-in"}`}
        onClick={onClose}
      />
      <div
        ref={dashboardRootRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        tabIndex={-1}
        data-state={open ? "open" : "closed"}
        data-open={open ? "" : undefined}
        data-closed={!open ? "" : undefined}
        className={`fixed top-1/2 left-1/2 z-50 grid h-[min(720px,calc(100vh-2rem))] w-[calc(100%-8rem)] -translate-x-1/2 -translate-y-1/2 origin-center grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden rounded-lg bg-lc-surface p-4 text-sm text-lc-text transition-[opacity,scale] duration-100 motion-reduce:transition-none border-solid border border-lc-border outline-none ${open ? "scale-100 opacity-100 pointer-events-auto ease-out" : "scale-[0.97] opacity-0 pointer-events-none ease-in"}`}
      >
        <header className="grid grid-cols-3 items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold leading-tight text-lc-text">
              eLeetCode
            </h2>
            <p className="text-xs text-lc-text/55">
              Your personal practice database
            </p>
          </div>
          <TabBar activeTab={activeTab} onChange={changeTab} />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="lg"
              className={`${dashboardHeaderButtonClass} text-xs`}
              type="button"
              disabled={refreshLoading}
              aria-label={
                activeTab === "settings"
                  ? "Refresh settings"
                  : "Refresh dashboard"
              }
              aria-busy={refreshLoading}
              onClick={refreshCurrentTab}
            >
              <RefreshCw
                size={12}
                aria-hidden="true"
                className={cn(refreshLoading && "animate-spin")}
              />
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              className={cn(
                dashboardHeaderButtonClass,
                activeTab === "settings" &&
                  "border-lc-border-hover bg-lc-control-hover text-lc-text",
              )}
              type="button"
              aria-label="Open settings"
              onClick={() => changeTab("settings")}
            >
              <SettingsIcon size={12} aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              className={dashboardHeaderButtonClass}
              type="button"
              aria-label="Close dashboard"
              onClick={onClose}
            >
              <X size={12} aria-hidden="true" />
            </Button>
          </div>
        </header>

        <section
          ref={dashboardContentRef}
          className="-mr-3 min-h-0 overflow-y-auto overscroll-contain pr-3 [scrollbar-gutter:stable]"
          onWheel={(event) => event.stopPropagation()}
        >
          {activeTab === "settings" ? (
            <SettingsView state={settingsState} onSave={saveGithubSettings} />
          ) : (
            <>
              {loadState.status === "loading" || loadState.status === "idle" ? (
                showInitialLoading ? (
                  <LoadingState />
                ) : null
              ) : null}
              {loadState.status === "error" ? (
                <EmptyState tone="error">{loadState.message}</EmptyState>
              ) : null}
              {loadState.status === "loaded" ? (
                <div className="space-y-3">
                  {activeTab === "problems" ? (
                    <ProblemsView
                      problems={filteredProblems}
                      attempts={attempts}
                      filters={problemFilters}
                      filterOptions={filterOptions}
                      expandedSlug={expandedSlug}
                      githubSettings={
                        settingsState.status === "loaded"
                          ? settingsState.settings
                          : undefined
                      }
                      selectPortalContainer={selectPortalContainer}
                      onToggleExpanded={(slug) =>
                        setExpandedSlug((current) =>
                          current === slug ? undefined : slug,
                        )
                      }
                      onChangeFilter={(key, value) =>
                        setProblemFilters((current) => ({
                          ...current,
                          [key]: value,
                        }))
                      }
                    />
                  ) : null}
                  {activeTab === "review" ? <ReviewView stats={stats} /> : null}
                  {activeTab === "tags" ? (
                    <TagsView
                      tags={filteredTags}
                      allTags={stats.tagStats}
                      activeTag={activeTag}
                      filters={tagFilters}
                      filterOptions={filterOptions}
                      selectPortalContainer={selectPortalContainer}
                      onSelectTag={setSelectedTag}
                      onChangeFilter={(key, value) =>
                        setTagFilters((current) => ({
                          ...current,
                          [key]: value,
                        }))
                      }
                    />
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </>
  );
}

function TabBar({
  activeTab,
  onChange,
}: {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}) {
  const tabs: Array<{ id: DashboardTab; label: string }> = [
    { id: "problems", label: "Problems" },
    { id: "review", label: "Review" },
    { id: "tags", label: "Tags" },
  ];
  return (
    <nav className="inline-flex items-center justify-self-center overflow-hidden rounded-lg border border-solid border-lc-border bg-lc-control">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={cn(
            "h-9 px-4 text-xs font-medium text-lc-text/55 transition last:border-r-0 hover:text-lc-text/70 focus:outline-none focus-visible:outline-none focus-visible:text-lc-text",
            tab.id === activeTab &&
              "text-lc-text shadow-[inset_0_-2px_0_var(--color-lc-orange)]",
          )}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

function DashboardSelect<TValue extends string>({
  ariaLabel,
  className,
  value,
  options,
  portalContainer,
  onValueChange,
}: {
  ariaLabel: string;
  className?: string;
  value: TValue;
  options: Array<{ value: TValue; label: string }>;
  portalContainer: Element | DocumentFragment | null;
  onValueChange: (value: TValue) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as TValue)}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          "h-8 justify-between gap-2 border-lc-border bg-lc-dark/25 px-2.5 text-sm text-lc-text/70 transition hover:border-lc-border-hover hover:bg-lc-dark/40 focus-visible:border-lc-border-hover [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate [&_svg]:text-lc-text/45",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        align="start"
        position="popper"
        portalContainer={portalContainer}
        className="z-100 rounded-lg border border-solid mt-1.5 border-lc-border bg-lc-surface p-2 text-lc-text shadow-xl shadow-black/30 ring-0"
      >
        <SelectGroup className="flex flex-col gap-1 p-0">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="rounded-md py-1.5 text-xs text-lc-text/70 focus:bg-lc-surface-hover/50 focus:text-lc-text data-[state=checked]:bg-lc-surface-hover/50 data-[state=checked]:text-lc-text"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function ProblemsView({
  problems,
  attempts,
  filters,
  filterOptions,
  expandedSlug,
  githubSettings,
  selectPortalContainer,
  onToggleExpanded,
  onChangeFilter,
}: {
  problems: Problem[];
  attempts: AttemptRow[];
  filters: ProblemFilters;
  filterOptions: ReturnType<typeof buildFilterOptions>;
  expandedSlug?: string;
  githubSettings?: GithubSettings;
  selectPortalContainer: Element | DocumentFragment | null;
  onToggleExpanded: (slug: string) => void;
  onChangeFilter: <K extends keyof ProblemFilters>(
    key: K,
    value: ProblemFilters[K],
  ) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className={cn(dashboardControlClass, "min-w-[240px] flex-1")}
          placeholder="Search problems..."
          value={filters.search}
          onChange={(event) => onChangeFilter("search", event.target.value)}
        />
        <MultiCheckboxFilter
          label="Tags"
          options={filterOptions.tags}
          selected={filters.tags}
          onChange={(value) => onChangeFilter("tags", value)}
        />
        <MultiCheckboxFilter
          label="Difficulty"
          options={filterOptions.difficulties}
          selected={filters.difficulties}
          onChange={(value) => onChangeFilter("difficulties", value)}
        />
        <MultiCheckboxFilter
          label="Outcome"
          options={SOLVE_OUTCOMES.map((outcome) => [
            outcome,
            OUTCOME_LABELS[outcome],
          ])}
          selected={filters.outcomes}
          onChange={(value) => onChangeFilter("outcomes", value)}
        />
        <MultiCheckboxFilter
          label="Review"
          options={[
            [NO_REVIEW_FLAG_FILTER, "None"],
            ...PROBLEM_REVIEW_FLAGS.map(
              (flag) =>
                [flag, PROBLEM_REVIEW_FLAG_LABELS[flag]] as [string, string],
            ),
          ]}
          selected={filters.reviewFlags}
          onChange={(value) => onChangeFilter("reviewFlags", value)}
        />
        <DashboardSelect<ProblemFilters["sort"]>
          ariaLabel="Sort problems"
          className="w-[170px] shrink-0"
          value={filters.sort}
          portalContainer={selectPortalContainer}
          options={[
            { value: "lastAttempted", label: "Last attempted" },
            { value: "title", label: "Title" },
            { value: "attempts", label: "Attempts" },
            { value: "difficulty", label: "Difficulty" },
          ]}
          onValueChange={(value) => onChangeFilter("sort", value)}
        />
      </div>
      <Card
        title="Problems"
        right={
          <span className="text-xs text-lc-text/55">
            Showing {problems.length} problem{problems.length === 1 ? "" : "s"}
          </span>
        }
      >
        <ProblemsTable
          problems={problems}
          attempts={attempts}
          expandedSlug={expandedSlug}
          githubSettings={githubSettings}
          onToggleExpanded={onToggleExpanded}
        />
      </Card>
    </div>
  );
}

function ProblemsTable({
  problems,
  attempts,
  expandedSlug,
  githubSettings,
  onToggleExpanded,
}: {
  problems: Problem[];
  attempts: AttemptRow[];
  expandedSlug?: string;
  githubSettings?: GithubSettings;
  onToggleExpanded: (slug: string) => void;
}) {
  if (problems.length === 0)
    return <EmptyState>No problems match these filters.</EmptyState>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1500px] border-collapse">
        <thead>
          <tr>
            <Th className="min-w-[280px]">Problem</Th>
            <Th>Difficulty</Th>
            <Th>Personal</Th>
            <Th className="whitespace-nowrap">Latest Outcome</Th>
            <Th>Review</Th>
            <Th className="min-w-[300px]">Tags</Th>
            <Th className="min-w-[460px]">Notes</Th>
            <Th>Attempts</Th>
            <Th className="whitespace-nowrap">Last Attempted</Th>
          </tr>
        </thead>
        <tbody>
          {problems.map((problem) => (
            <ProblemRow
              key={problem.slug}
              problem={problem}
              attempts={attemptsForSlug(attempts, problem.slug)}
              expanded={expandedSlug === problem.slug}
              githubSettings={githubSettings}
              onToggle={() => onToggleExpanded(problem.slug)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProblemRow({
  problem,
  attempts,
  expanded,
  githubSettings,
  onToggle,
}: {
  problem: Problem;
  attempts: AttemptRow[];
  expanded: boolean;
  githubSettings?: GithubSettings;
  onToggle: () => void;
}) {
  const latest = latestAttempt(attempts);
  const status = reviewStatus(problem, latest);
  const [detailsMounted, setDetailsMounted] = useState(expanded);
  const [detailsOpen, setDetailsOpen] = useState(expanded);

  useEffect(() => {
    if (expanded) {
      setDetailsMounted(true);

      if (!detailsMounted) {
        return undefined;
      }

      let openFrame: number | undefined;
      const mountFrame = window.requestAnimationFrame(() => {
        openFrame = window.requestAnimationFrame(() => {
          setDetailsOpen(true);
        });
      });

      return () => {
        window.cancelAnimationFrame(mountFrame);
        if (openFrame !== undefined) {
          window.cancelAnimationFrame(openFrame);
        }
      };
    }

    setDetailsOpen(false);
    if (!detailsMounted) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setDetailsMounted(false);
    }, EXPANDED_PROBLEM_ANIMATION_MS);

    return () => window.clearTimeout(timeout);
  }, [detailsMounted, expanded]);

  return (
    <>
      <tr
        onClick={(event) => {
          if (isInteractiveRowTarget(event.target)) return;
          onToggle();
        }}
        className={cn(
          detailsMounted
            ? "cursor-pointer bg-lc-dark/20 hover:bg-lc-dark/30 [&>td]:border-b-0"
            : "cursor-pointer transition hover:bg-lc-surface-hover/35",
        )}
      >
        <Td>
          <div className="flex items-start gap-2">
            <button
              type="button"
              className="-mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded text-lc-text/45 hover:bg-lc-surface-hover hover:text-lc-text focus:outline-none focus-visible:outline-none focus-visible:bg-lc-surface-hover focus-visible:text-lc-text"
              onClick={(event) => {
                event.stopPropagation();
                onToggle();
              }}
              aria-label={expanded ? "Collapse problem" : "Expand problem"}
            >
              <ChevronRight
                aria-hidden="true"
                size={14}
                className={cn(
                  "transition-transform duration-150",
                  expanded && "rotate-90",
                )}
              />
            </button>
            <a
              className="min-w-0 font-medium text-lc-text hover:text-lc-orange"
              href={leetcodeProblemUrl(problem.slug)}
              target="_blank"
              rel="noreferrer"
            >
              {problem.title}
            </a>
          </div>
        </Td>
        <Td>
          {problem.leetcodeDifficulty ? (
            <Badge tone={problem.leetcodeDifficulty}>
              {problem.leetcodeDifficulty}
            </Badge>
          ) : (
            <EmptyCell />
          )}
        </Td>
        <Td>
          {problem.personalDifficulty ? (
            <Badge tone={problem.personalDifficulty}>
              {problem.personalDifficulty}
            </Badge>
          ) : (
            <EmptyCell />
          )}
        </Td>
        <Td>
          {latest ? (
            <Badge tone={latest.outcome}>
              {OUTCOME_LABELS[latest.outcome]}
            </Badge>
          ) : (
            <EmptyCell />
          )}
        </Td>
        <Td>
          {status ? (
            <Badge tone={status.tone}>{status.label}</Badge>
          ) : (
            <EmptyCell />
          )}
        </Td>
        <Td>
          <Tags tags={problem.tags} />
        </Td>
        <Td>
          <span className="block whitespace-pre-wrap leading-relaxed text-lc-text/70">
            {latest?.notes || <EmptyCell />}
          </span>
        </Td>
        <Td className="tabular-nums">{attempts.length}</Td>
        <Td className="tabular-nums">
          {formatShortDate(problem.lastAttemptedAt ?? latest?.solvedAt)}
        </Td>
      </tr>
      {detailsMounted ? (
        <tr>
          <td
            colSpan={9}
            className={cn(
              "border-b border-lc-border bg-lc-dark/20 px-6 transition-[padding-bottom] duration-200 ease-out motion-reduce:transition-none",
              detailsOpen ? "pb-3" : "pb-0",
            )}
          >
            <div
              className={cn(
                "grid min-w-0 pl-5 transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
                detailsOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 min-w-0 overflow-hidden">
                <ExpandedProblem
                  attempts={attempts}
                  githubSettings={githubSettings}
                />
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function ExpandedProblem({
  attempts,
  githubSettings,
}: {
  attempts: AttemptRow[];
  githubSettings?: GithubSettings;
}) {
  const sorted = [...attempts].sort(
    (a, b) => timestamp(a.solvedAt) - timestamp(b.solvedAt),
  );
  if (sorted.length === 0)
    return <EmptyState>No attempts recorded.</EmptyState>;
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1080px] divide-y divide-lc-border/70 border-t border-lc-border/70">
        {[...sorted].reverse().map((attempt, index) => (
          <div
            className="grid grid-cols-[160px_110px_140px_64px_48px_minmax(360px,1fr)] items-start gap-4 py-3 text-[13px]"
            key={`${attempt.solvedAt}:${index}`}
          >
            <div className="tabular-nums text-lc-text/70">
              {formatDateTime(attempt.solvedAt)}
            </div>
            <div className="text-lc-text/70">
              {attempt.language || "Unknown"}
            </div>
            <div>
              <Badge tone={attempt.outcome}>
                {OUTCOME_LABELS[attempt.outcome]}
              </Badge>
            </div>
            <div className="tabular-nums text-lc-text/55">
              {hasDuration(attempt.duration) ? (
                formatDuration(attempt.duration)
              ) : (
                <EmptyCell />
              )}
            </div>
            <div>
              <CodeLink
                codePath={attempt.codePath}
                githubSettings={githubSettings}
              />
            </div>
            <div className="max-w-[760px] whitespace-pre-wrap leading-relaxed text-lc-text/70">
              {attempt.notes || <EmptyCell />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CodeLink({
  codePath,
  githubSettings,
}: {
  codePath?: string;
  githubSettings?: GithubSettings;
}) {
  if (!codePath) return <EmptyCell />;

  const url = githubBlobUrl(githubSettings, codePath);
  if (!url) return <span className="text-lc-text/55">Code</span>;

  return (
    <a
      className="text-lc-info hover:underline"
      href={url}
      title={codePath}
      target="_blank"
      rel="noreferrer"
    >
      Code
    </a>
  );
}

function ReviewView({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-3">
      <ReviewSummaryCharts stats={stats} />
      <Card
        title="Suggested Training"
        right={
          <span className="text-xs text-lc-text/55">
            Ranked by review state and latest outcome
          </span>
        }
      >
        <SuggestedTrainingTable suggestions={stats.suggestions} />
      </Card>
      <div className="grid gap-3 lg:grid-cols-2">
        <ProblemInsightList
          title="Felt Easier Than LC"
          problems={stats.feltEasier}
          empty="No easier-than-rating problems yet."
        />
        <ProblemInsightList
          title="Felt Harder Than LC"
          problems={stats.feltHarder}
          empty="No harder-than-rating problems yet."
        />
      </div>
    </div>
  );
}

function ReviewSummaryCharts({ stats }: { stats: DashboardStats }) {
  const outcomeTotal = SOLVE_OUTCOMES.reduce(
    (sum, outcome) => sum + stats.outcomeCounts[outcome],
    0,
  );
  const reviewTotal =
    stats.reviewCounts.review +
    stats.reviewCounts.redo +
    stats.reviewCounts.memorize;
  const reviewNoneTotal = Math.max(0, stats.problemTotal - reviewTotal);
  const outcomeSegments: ChartSegment[] = [
    {
      label: "Independent",
      value: stats.outcomeCounts.independent,
      tone: "independent",
    },
    {
      label: "Hint",
      value: stats.outcomeCounts.hint,
      tone: "hint",
    },
    {
      label: "Suboptimal",
      value: stats.outcomeCounts.suboptimal,
      tone: "suboptimal",
    },
    {
      label: "Looked Up",
      value: stats.outcomeCounts.looked_up,
      tone: "looked_up",
    },
  ];
  const reviewSegments: ChartSegment[] = [
    {
      label: "Review",
      value: stats.reviewCounts.review,
      tone: "review",
    },
    {
      label: "Redo",
      value: stats.reviewCounts.redo,
      tone: "redo",
    },
    {
      label: "Memorize",
      value: stats.reviewCounts.memorize,
      tone: "memorize",
    },
    {
      label: "None",
      value: reviewNoneTotal,
      tone: "none",
    },
  ];
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <SegmentedGaugeCard
        title="Solution Outcomes"
        centerValue={outcomeTotal}
        centerLabel="Attempts"
        footerLabel={`${stats.problemTotal} Problems`}
        segmentTotal={outcomeTotal}
        segments={outcomeSegments}
      />
      <SegmentedGaugeCard
        title="Review Flags"
        centerValue={reviewTotal}
        centerLabel="Review Flags"
        footerLabel={`${stats.problemTotal} Problems`}
        segmentTotal={stats.problemTotal}
        segments={reviewSegments}
      />
    </div>
  );
}

function SegmentedGaugeCard({
  title,
  centerValue,
  centerLabel,
  footerLabel,
  segmentTotal,
  segments,
}: {
  title: string;
  centerValue: number;
  centerLabel: string;
  footerLabel: string;
  segmentTotal: number;
  segments: ChartSegment[];
}) {
  const circumference = 100;
  let offset = 0;
  const visibleSegments = segmentTotal
    ? segments.filter((segment) => segment.value > 0)
    : [];
  return (
    <section className={dashboardCardClass}>
      <div className="grid grid-cols-[3fr_4fr] gap-5 p-4">
        <div className="relative grid place-items-center">
          <svg
            width="184"
            height="154"
            viewBox="0 0 156 134"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="overflow-visible"
            aria-label={`${title}: ${centerValue} ${centerLabel}`}
          >
            {visibleSegments.map((segment, i) => {
              const toneStyle = trackerToneStyle(segment.tone);
              const length = (segment.value / segmentTotal) * circumference;
              const isLast = i === visibleSegments.length - 1;
              const dashLength = isLast ? length : Math.max(0, length - 3);
              const dashOffset = -offset;
              offset += length;
              return (
                <g key={`${segment.label}-${segment.value}-${segmentTotal}`}>
                  <path
                    className="lst-gauge-segment"
                    d="M24.7725 132C10.7183 118.235 2 99.0612 2 77.8553C2 35.9616 36.0264 2 78 2C119.974 2 154 35.9616 154 77.8553C154 99.0612 145.282 118.235 131.227 132"
                    fill="none"
                    pathLength={circumference}
                    stroke={toneStyle.borderColor}
                    strokeDasharray={`${dashLength} ${circumference}`}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    strokeWidth="6"
                    strokeOpacity={1}
                    style={
                      {
                        filter: "var(--lst-tone-emphasis-filter)",
                        "--lst-gauge-dash": dashLength.toString(),
                        "--lst-gauge-delay": `${i * 45}ms`,
                      } as CSSProperties
                    }
                  ></path>
                </g>
              );
            })}
          </svg>
          <div className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="text-4xl font-medium leading-none tracking-normal text-lc-text tabular-nums">
              {centerValue}
            </div>
            <div className="mt-0.5 text-sm text-lc-text/70">{centerLabel}</div>
          </div>
          <div className="absolute left-1/2 -bottom-1 -translate-x-1/2  text-center">
            <div className="text-xs text-lc-text/55">{footerLabel}</div>
          </div>
        </div>
        <div className="min-w-0 self-center">
          {segments.map((segment) => (
            <div
              className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-lc-border py-2.5 last:border-b-0"
              key={segment.label}
            >
              <span
                className="size-[7px] rounded-full border-[1.5px] border-solid"
                style={{
                  ...segmentDotStyle(segment),
                  filter: "var(--lst-tone-emphasis-filter)",
                }}
              />
              <span className="min-w-0 truncate text-sm text-lc-text">
                {segment.label}
              </span>
              <span className="text-sm tabular-nums text-lc-text">
                {segment.value}
              </span>
              <span className="w-10 text-right text-xs tabular-nums text-lc-text/55">
                {percent(ratio(segment.value, segmentTotal))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SuggestedTrainingTable({
  suggestions,
}: {
  suggestions: TrainingSuggestion[];
}) {
  if (suggestions.length === 0)
    return <EmptyState>No review suggestions yet.</EmptyState>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] table-fixed border-collapse">
        <colgroup>
          <col className="w-[46%]" />
          <col className="w-[39%]" />
          <col className="w-[15%]" />
        </colgroup>
        <thead>
          <tr>
            <Th>Problem</Th>
            <Th>Reasons</Th>
            <Th>Last Attempted</Th>
          </tr>
        </thead>
      </table>
      <div className="max-h-[330px] overflow-y-auto">
        <table className="w-full min-w-[760px] table-fixed border-collapse">
          <colgroup>
            <col className="w-[46%]" />
            <col className="w-[39%]" />
            <col className="w-[15%]" />
          </colgroup>
          <tbody>
            {suggestions.map((suggestion) => (
              <tr
                className="transition hover:bg-lc-surface-hover/35"
                key={suggestion.problem.slug}
              >
                <Td>
                  <a
                    className="font-medium text-lc-text hover:text-lc-orange"
                    href={leetcodeProblemUrl(suggestion.problem.slug)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {suggestion.problem.title}
                  </a>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestion.reasons.map((reason) => (
                      <ReasonPill
                        key={`${suggestion.problem.slug}:${reason.label}`}
                        reason={reason}
                      />
                    ))}
                  </div>
                </Td>
                <Td className="tabular-nums">
                  {formatShortDate(
                    suggestion.problem.lastAttemptedAt ??
                      suggestion.latest?.solvedAt,
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProblemInsightList({
  title,
  problems,
  empty,
}: {
  title: string;
  problems: Problem[];
  empty: string;
}) {
  return (
    <Card title={title}>
      {problems.length ? (
        <div className="max-h-[230px] overflow-y-auto p-2.5 [scrollbar-gutter:stable]">
          <div className="divide-y divide-lc-border/70">
            {problems.map((problem) => (
              <div
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2 first:pt-0 last:pb-0"
                key={problem.slug}
              >
                <a
                  className="min-w-0 truncate text-sm font-medium text-lc-text hover:text-lc-orange"
                  href={leetcodeProblemUrl(problem.slug)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {problem.title}
                </a>
                <div className="flex shrink-0 items-center gap-1.5 text-xs text-lc-text/55">
                  {problem.leetcodeDifficulty ? (
                    <Badge tone={problem.leetcodeDifficulty}>
                      {problem.leetcodeDifficulty}
                    </Badge>
                  ) : null}
                  <span>/</span>
                  {problem.personalDifficulty ? (
                    <Badge tone={problem.personalDifficulty}>
                      {problem.personalDifficulty}
                    </Badge>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState>{empty}</EmptyState>
      )}
    </Card>
  );
}

function TagsView({
  tags,
  allTags,
  activeTag,
  filters,
  filterOptions,
  selectPortalContainer,
  onSelectTag,
  onChangeFilter,
}: {
  tags: TagAggregate[];
  allTags: TagAggregate[];
  activeTag?: TagAggregate;
  filters: TagFilters;
  filterOptions: ReturnType<typeof buildFilterOptions>;
  selectPortalContainer: Element | DocumentFragment | null;
  onSelectTag: (tag: string) => void;
  onChangeFilter: <K extends keyof TagFilters>(
    key: K,
    value: TagFilters[K],
  ) => void;
}) {
  const weakestTags = [...tags]
    .sort(
      (a, b) =>
        b.lookedUpRate - a.lookedUpRate ||
        a.independentRate - b.independentRate,
    )
    .slice(0, 5);
  const practicedTags = [...tags]
    .sort((a, b) => b.totalAttempts - a.totalAttempts)
    .slice(0, 5);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,1.2fr)]">
        <TagListCard
          title="Weakest Tags"
          tags={weakestTags}
          secondary="Looked up"
        />
        <TagListCard
          title="Most Practiced"
          tags={practicedTags}
          secondary="Problems"
          practiced
        />
        <TagDrilldown
          tag={activeTag}
          allTags={allTags}
          selectPortalContainer={selectPortalContainer}
          onSelectTag={onSelectTag}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className={cn(dashboardControlClass, "min-w-[240px] flex-1")}
          placeholder="Search tags..."
          value={filters.search}
          onChange={(event) => onChangeFilter("search", event.target.value)}
        />
        <MultiCheckboxFilter
          label="Difficulty"
          options={filterOptions.difficulties}
          selected={filters.difficulties}
          onChange={(value) => onChangeFilter("difficulties", value)}
        />
        <DashboardSelect<TagFilters["sort"]>
          ariaLabel="Sort tags"
          className="w-[180px] shrink-0"
          value={filters.sort}
          portalContainer={selectPortalContainer}
          options={[
            { value: "weakest", label: "Independent % asc" },
            { value: "mostPracticed", label: "Most practiced" },
            { value: "latest", label: "Latest activity" },
            { value: "fastest", label: "Fastest avg time" },
          ]}
          onValueChange={(value) => onChangeFilter("sort", value)}
        />
      </div>
      <Card
        title="Tag Performance"
        right={
          <span className="text-xs text-lc-text/55">
            Showing {tags.length} tag{tags.length === 1 ? "" : "s"}
          </span>
        }
      >
        <TagPerformanceTable tags={tags} onSelectTag={onSelectTag} />
      </Card>
    </div>
  );
}

function TagPerformanceTable({
  tags,
  onSelectTag,
}: {
  tags: TagAggregate[];
  onSelectTag: (tag: string) => void;
}) {
  if (tags.length === 0) return <EmptyState>No tag data yet.</EmptyState>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse">
        <thead>
          <tr>
            <Th>Tag</Th>
            <Th>Problems</Th>
            <Th>Review Flags</Th>
            <Th>Independent</Th>
            <Th>Hint</Th>
            <Th>Looked Up</Th>
            <Th>Avg Time</Th>
            <Th>Latest Activity</Th>
          </tr>
        </thead>
        <tbody>
          {tags.map((tag, index) => (
            <tr
              className="transition hover:bg-lc-surface-hover/35"
              key={tag.tag}
            >
              <Td>
                <button
                  type="button"
                  className="rounded-full focus:outline-none focus-visible:outline-none"
                  onClick={() => onSelectTag(tag.tag)}
                >
                  <TagChip tone={tag.tag}>{tag.tag}</TagChip>
                </button>
              </Td>
              <Td className="tabular-nums">{tag.uniqueProblems}</Td>
              <Td className="tabular-nums">{tag.reviewFlagCount}</Td>
              <Td>
                <Rate
                  value={tag.independentRate}
                  tone="independent"
                  delayMs={Math.min(index, 12) * 24}
                />
              </Td>
              <Td>
                <Rate
                  value={tag.hintRate}
                  tone="hint"
                  delayMs={Math.min(index, 12) * 24}
                />
              </Td>
              <Td>
                <Rate
                  value={tag.lookedUpRate}
                  tone="looked_up"
                  delayMs={Math.min(index, 12) * 24}
                />
              </Td>
              <Td className="tabular-nums">
                {hasDuration(tag.averageDuration) ? (
                  formatDuration(tag.averageDuration)
                ) : (
                  <EmptyCell />
                )}
              </Td>
              <Td className="tabular-nums">{formatShortDate(tag.latestAt)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TagListCard({
  title,
  tags,
  secondary,
  practiced = false,
}: {
  title: string;
  tags: TagAggregate[];
  secondary: string;
  practiced?: boolean;
}) {
  const maxAttempts = Math.max(...tags.map((tag) => tag.totalAttempts), 1);
  return (
    <Card
      title={title}
      right={<span className="text-xs text-lc-text/55">{secondary}</span>}
    >
      {tags.length ? (
        <div className="flex flex-col gap-3 p-3">
          {tags.map((tag, index) => {
            const weakValue = tag.lookedUpRate;
            return (
              <div
                className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-3"
                key={tag.tag}
              >
                <div className="min-w-0">
                  <div className="truncate mb-1 text-sm font-medium text-lc-text">
                    {tag.tag}
                  </div>
                  <Rate
                    value={
                      practiced ? tag.totalAttempts / maxAttempts : weakValue
                    }
                    compact
                    tone={practiced ? "practiced" : "looked_up"}
                    delayMs={index * 60}
                  />
                </div>
                <div className="text-right text-xs text-lc-text/55">
                  {practiced ? tag.uniqueProblems : percent(weakValue)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState>No tag data yet.</EmptyState>
      )}
    </Card>
  );
}

function TagDrilldown({
  tag,
  allTags,
  selectPortalContainer,
  onSelectTag,
}: {
  tag?: TagAggregate;
  allTags: TagAggregate[];
  selectPortalContainer: Element | DocumentFragment | null;
  onSelectTag: (tag: string) => void;
}) {
  const sortedTags = useMemo(
    () =>
      [...allTags].sort((a, b) =>
        a.tag.localeCompare(b.tag, undefined, { sensitivity: "base" }),
      ),
    [allTags],
  );

  return (
    <Card
      title="Tag Drilldown"
      right={
        sortedTags.length ? (
          <DashboardSelect<string>
            ariaLabel="Select tag"
            className="w-[150px] shrink-0 h-[26px]! mt-[-10px] mb-[-10px]"
            value={tag?.tag ?? sortedTags[0].tag}
            portalContainer={selectPortalContainer}
            options={sortedTags.map((item) => ({
              value: item.tag,
              label: item.tag,
            }))}
            onValueChange={onSelectTag}
          />
        ) : null
      }
    >
      {tag ? (
        <div className="space-y-3 p-3">
          <div className="grid grid-cols-3 gap-2">
            <MiniMetric
              label="Problems"
              value={tag.uniqueProblems.toString()}
            />
            <MiniMetric
              label="Review Flags"
              value={tag.reviewFlagCount.toString()}
            />
            <MiniMetric
              label="Independent"
              value={percent(tag.independentRate)}
            />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase text-lc-text/55">
              Top Problems
            </h3>
            <div className="flex flex-col gap-2">
              {tag.problems.slice(0, 3).map((problem) => {
                const latest = latestAttempt(problem.attempts);
                return (
                  <div
                    className="flex items-center justify-between gap-3 text-sm"
                    key={problem.slug}
                  >
                    <a
                      className="truncate text-lc-text hover:text-lc-orange"
                      href={leetcodeProblemUrl(problem.slug)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {problem.title}
                    </a>
                    {latest ? (
                      <Badge tone={latest.outcome}>
                        {OUTCOME_LABELS[latest.outcome]}
                      </Badge>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <EmptyState>No tag selected.</EmptyState>
      )}
    </Card>
  );
}

function MultiCheckboxFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Array<string | [string, string]>;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);
  const normalizedOptions = options.map((option) => {
    const [value, optionLabel] = Array.isArray(option)
      ? option
      : [option, option];
    return { value, label: optionLabel };
  });
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        className="inline-flex h-8 min-w-[150px] items-center justify-between gap-2 rounded-lg border border-lc-border bg-lc-dark/25 px-2.5 text-sm text-lc-text/70 transition hover:border-lc-border-hover hover:bg-lc-dark/40 focus:outline-none focus-visible:outline-none focus-visible:border-lc-border-hover"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        <span className="text-xs text-lc-text/45">
          {selected.length ? selected.length : "All"}
        </span>
      </button>
      {open ? (
        <div
          className="absolute left-0 top-[calc(100%+0.375rem)] z-100 max-h-64 overscroll-none w-60 isolate overflow-y-auto overscroll-contain rounded-lg border border-solid border-lc-border bg-lc-surface p-2 shadow-xl shadow-black/30"
          onPointerDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          {normalizedOptions.length ? (
            <div className="flex flex-col gap-1">
              {selected.length ? (
                <button
                  type="button"
                  className="mb-1 rounded-md px-2 py-1.5 text-left text-xs font-medium text-lc-text/70 hover:bg-lc-surface-hover/50 hover:text-lc-text focus:outline-none focus-visible:outline-none focus-visible:bg-lc-surface-hover/50"
                  onClick={() => onChange([])}
                >
                  Clear
                </button>
              ) : null}
              {normalizedOptions.map((option) => {
                const checked = selected.includes(option.value);
                return (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-lc-surface-hover/50 focus:outline-none focus-visible:outline-none focus-visible:bg-lc-surface-hover/50"
                    key={option.value}
                    onClick={() =>
                      onChange(
                        toggleArrayValue(selected, option.value, !checked),
                      )
                    }
                  >
                    <Checkbox
                      checked={checked}
                      tabIndex={-1}
                      aria-hidden="true"
                      className="pointer-events-none"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs text-lc-text/70">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-2 py-1.5 text-xs text-lc-text/45">
              No options yet
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SettingsView({
  state,
  onSave,
}: {
  state: SettingsState;
  onSave: (settings: GithubSettings) => Promise<GithubSettings>;
}) {
  const [draft, setDraft] = useState<GithubSettings>(DEFAULT_GITHUB_SETTINGS);
  const [saveState, setSaveState] = useState<SettingsSaveState>({
    status: "idle",
  });

  useEffect(() => {
    if (state.status !== "loaded") return;
    setDraft(normalizeGithubSettings(state.settings));
  }, [state]);

  if (state.status === "idle" || state.status === "loading") {
    return <LoadingState label="Loading settings..." />;
  }

  if (state.status === "error") {
    return (
      <Card title="GitHub Settings">
        <EmptyState tone="error">{state.message}</EmptyState>
      </Card>
    );
  }

  const inputClassName = cn(dashboardControlClass, "h-9");
  const savedToken = normalizeGithubSettings(state.settings).token;
  const showTokenInstructions =
    !savedToken || draft.token.trim() !== savedToken;

  function updateSetting<K extends keyof GithubSettings>(
    key: K,
    value: GithubSettings[K],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState({ status: "saving" });

    try {
      const saved = await onSave(normalizeGithubSettings(draft));
      setDraft(saved);
      setSaveState({
        status: "success",
        message: "GitHub settings saved.",
      });
    } catch (error) {
      setSaveState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save GitHub settings.",
      });
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <Card title="GitHub Settings">
        <div className="grid gap-3 p-3">
          <SettingsField
            label="Personal access token"
            description="Needs access to read and write the tracker repository."
          >
            <Input
              type="password"
              autoComplete="off"
              className={inputClassName}
              placeholder="github_pat_..."
              value={draft.token}
              onChange={(event) => updateSetting("token", event.target.value)}
            />
          </SettingsField>

          <div className="grid gap-3 md:grid-cols-2">
            <SettingsField label="Owner">
              <Input
                className={inputClassName}
                placeholder="github-user"
                value={draft.owner}
                onChange={(event) => updateSetting("owner", event.target.value)}
              />
            </SettingsField>
            <SettingsField label="Repository">
              <Input
                className={inputClassName}
                placeholder="leetcode-tracker"
                value={draft.repo}
                onChange={(event) => updateSetting("repo", event.target.value)}
              />
            </SettingsField>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <SettingsField label="Branch">
              <Input
                className={inputClassName}
                placeholder="main"
                value={draft.branch}
                onChange={(event) =>
                  updateSetting("branch", event.target.value)
                }
              />
            </SettingsField>
            <SettingsField label="Tracker path">
              <Input
                className={inputClassName}
                placeholder="tracker.json"
                value={draft.trackerPath ?? ""}
                onChange={(event) =>
                  updateSetting("trackerPath", event.target.value)
                }
              />
            </SettingsField>
            <SettingsField label="Solutions dir">
              <Input
                className={inputClassName}
                placeholder="solutions"
                value={draft.solutionsDir ?? ""}
                onChange={(event) =>
                  updateSetting("solutionsDir", event.target.value)
                }
              />
            </SettingsField>
          </div>
        </div>
      </Card>

      {showTokenInstructions ? <GithubTokenInstructions /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-h-5 text-xs">
          {saveState.status === "success" ? (
            <span className="text-lc-success">{saveState.message}</span>
          ) : null}
          {saveState.status === "error" ? (
            <span className="text-lc-danger">{saveState.message}</span>
          ) : null}
        </div>
        <Button
          type="submit"
          variant="outline"
          size="lg"
          disabled={saveState.status === "saving"}
          className={cn(dashboardHeaderButtonClass, "min-w-28")}
        >
          {saveState.status === "saving" ? "Saving" : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}

function GithubTokenInstructions() {
  const [open, setOpen] = useState(false);

  return (
    <section className={dashboardCardClass}>
      <button
        type="button"
        aria-expanded={open}
        className={cn(
          dashboardCardHeaderClass,
          "w-full text-left transition hover:bg-lc-dark/20 focus:outline-none focus-visible:outline-none focus-visible:bg-lc-dark/20",
          !open && "border-b-0",
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <ChevronRight
            size={14}
            aria-hidden="true"
            className={cn(
              "shrink-0 text-lc-text/45 transition-transform",
              open && "rotate-90",
            )}
          />
          <span className="truncate text-sm font-semibold text-lc-text">
            Need help creating a GitHub token?
          </span>
        </span>
        <span className="shrink-0 text-xs text-lc-text/45">
          <div>
            <a
              className="inline-flex items-center gap-1 text-lc-orange transition"
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noreferrer"
            >
              Open GitHub token settings
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>
        </span>
      </button>

      {open ? (
        <div className="grid gap-3 p-3 text-sm leading-relaxed text-lc-text ">
          <p>
            Create a fine-grained personal access token for the repository where
            eLeetCode should save your practice database.
          </p>
          <div className="grid gap-2.5">
            <InstructionStep number={1}>
              Open GitHub, then go to{" "}
              <GithubInstructionTag>Settings</GithubInstructionTag>,{" "}
              <GithubInstructionTag>Developer settings</GithubInstructionTag>,{" "}
              <GithubInstructionTag>
                Personal access tokens
              </GithubInstructionTag>
              , and{" "}
              <GithubInstructionTag>Fine-grained tokens</GithubInstructionTag>.
            </InstructionStep>
            <InstructionStep number={2}>
              Click{" "}
              <GithubInstructionTag>Generate new token</GithubInstructionTag>,
              name it <GithubInstructionTag>eLeetCode</GithubInstructionTag>,
              choose an expiration, and pick the resource owner.
            </InstructionStep>
            <InstructionStep number={3}>
              Under{" "}
              <GithubInstructionTag>Repository access</GithubInstructionTag>,
              choose{" "}
              <GithubInstructionTag>
                Only select repositories
              </GithubInstructionTag>{" "}
              and pick your tracker repository.
            </InstructionStep>
            <InstructionStep number={4}>
              Under{" "}
              <GithubInstructionTag>
                Repository permissions
              </GithubInstructionTag>
              , set <GithubInstructionTag>Contents</GithubInstructionTag> to{" "}
              <GithubInstructionTag>Read and write</GithubInstructionTag>. Leave
              other permissions at{" "}
              <GithubInstructionTag>No access</GithubInstructionTag> unless you
              specifically need them.
            </InstructionStep>
            <InstructionStep number={5}>
              Click <GithubInstructionTag>Generate token</GithubInstructionTag>,
              copy it immediately, and paste it into the token field above.
              GitHub only shows it once.
            </InstructionStep>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function InstructionStep({
  number,
  children,
}: {
  number: number;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-1">
      <span className="flex items-center justify-center">{number}.</span>
      <p>{children}</p>
    </div>
  );
}

function GithubInstructionTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-lc-border bg-lc-surface px-1.5 py-1 align-[0.08em] text-xs font-medium leading-none  text-lc-text whitespace-nowrap">
      {children}
    </span>
  );
}

function SettingsField({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-medium text-lc-text/70">
        {label}
      </span>
      {children}
      {description ? (
        <span className="mt-1.5 block text-xs leading-relaxed text-lc-text/45">
          {description}
        </span>
      ) : null}
    </label>
  );
}

function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="grid h-full min-h-[280px] place-items-center text-sm text-lc-text/45">
      {label}
    </div>
  );
}
function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={dashboardCardClass}>
      <div className={dashboardCardHeaderClass}>
        <h3 className="text-sm font-semibold text-lc-text">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}
function EmptyState({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      className={cn(
        "p-8 text-center text-sm",
        tone === "error" ? "text-lc-danger" : "text-lc-text/55",
      )}
    >
      {children}
    </div>
  );
}
function EmptyCell() {
  return <span className="font-sans text-lc-text/45">-</span>;
}
function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-lc-border bg-lc-dark/35 px-2.5 py-2">
      <div className="text-[11px] text-lc-text/45">{label}</div>
      <div className="mt-1 text-sm font-semibold text-lc-text">
        {value || <EmptyCell />}
      </div>
    </div>
  );
}
function Th({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th className={cn(dashboardTableHeaderCellClass, className)}>{children}</th>
  );
}
function Td({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cn(dashboardTableCellClass, className)}>{children}</td>;
}
const pillClassName =
  "inline-flex min-h-6 items-center whitespace-nowrap rounded-full border border-solid px-2.5 py-0.5 text-xs font-medium";
function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  return (
    <span className={cn(pillClassName, trackerBadgeClassName(tone))}>
      {children}
    </span>
  );
}
function TagChip({ children, tone }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className={cn(pillClassName, trackerTagClassName(tone))}
      style={trackerTagStyle(tone)}
    >
      {children}
    </span>
  );
}
function ReasonPill({ reason }: { reason: { label: string; tone?: string } }) {
  return isTagReason(reason.tone) ? (
    <TagChip tone={reason.tone}>{reason.label}</TagChip>
  ) : (
    <Badge tone={reason.tone}>{reason.label}</Badge>
  );
}
function Tags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <EmptyCell />;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <TagChip key={tag} tone={tag}>
          {tag}
        </TagChip>
      ))}
    </div>
  );
}
function Rate({
  value,
  compact = false,
  tone = "independent",
  delayMs = 0,
}: {
  value: number;
  compact?: boolean;
  tone?: RateTone;
  delayMs?: number;
}) {
  const bounded = Math.max(0, Math.min(1, value));
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        compact ? "min-w-0" : "min-w-[110px]",
      )}
    >
      {!compact ? (
        <span className="w-9 text-xs tabular-nums text-lc-text/70">
          {percent(bounded)}
        </span>
      ) : null}
      <span className={rateTrackClass}>
        <span
          key={`${tone}-${bounded}`}
          className={rateFillClass}
          style={
            {
              "--lst-rate-color": rateColor(bounded, tone),
              "--lst-rate-delay": `${delayMs}ms`,
              background: rateFillBackground(),
              width: rateWidth(bounded),
            } as CSSProperties
          }
        />
      </span>
    </div>
  );
}

function buildDashboardStats(
  problems: Problem[],
  attempts: AttemptRow[],
): DashboardStats {
  const outcomeCounts = emptyOutcomeCounts();
  const reviewCounts: Record<ProblemReviewFlag, number> = {
    review: 0,
    redo: 0,
    memorize: 0,
  };
  for (const attempt of attempts) outcomeCounts[attempt.outcome] += 1;
  for (const problem of problems)
    if (problem.reviewFlag) reviewCounts[problem.reviewFlag] += 1;
  return {
    problemTotal: problems.length,
    outcomeCounts,
    reviewCounts,
    tagStats: buildTagStats(problems),
    suggestions: buildTrainingSuggestions(problems, attempts),
    feltEasier: problems
      .filter((problem) => difficultyDelta(problem) < 0)
      .sort((a, b) => difficultyDelta(a) - difficultyDelta(b)),
    feltHarder: problems
      .filter((problem) => difficultyDelta(problem) > 0)
      .sort((a, b) => difficultyDelta(b) - difficultyDelta(a)),
  };
}
function buildTagStats(problems: Problem[]): TagAggregate[] {
  const buckets = new Map<string, TagAggregate & { durations: number[] }>();
  for (const problem of problems)
    for (const tag of problem.tags) {
      const key = tag.toLowerCase();
      const bucket = buckets.get(key) ?? {
        tag,
        problems: [],
        totalAttempts: 0,
        uniqueProblems: 0,
        reviewFlagCount: 0,
        outcomeCounts: emptyOutcomeCounts(),
        independentRate: 0,
        hintRate: 0,
        lookedUpRate: 0,
        suboptimalRate: 0,
        latestAt: undefined,
        durations: [],
      };
      bucket.problems.push(problem);
      bucket.uniqueProblems += 1;
      if (problem.reviewFlag) bucket.reviewFlagCount += 1;
      if (
        problem.lastAttemptedAt &&
        timestamp(problem.lastAttemptedAt) > timestamp(bucket.latestAt)
      )
        bucket.latestAt = problem.lastAttemptedAt;
      for (const attempt of problem.attempts) {
        bucket.totalAttempts += 1;
        bucket.outcomeCounts[attempt.outcome] += 1;
        if (
          typeof attempt.duration === "number" &&
          Number.isFinite(attempt.duration)
        )
          bucket.durations.push(attempt.duration);
      }
      buckets.set(key, bucket);
    }
  return Array.from(buckets.values())
    .map((bucket) => ({
      tag: bucket.tag,
      problems: bucket.problems.sort(
        (a, b) => timestamp(b.lastAttemptedAt) - timestamp(a.lastAttemptedAt),
      ),
      totalAttempts: bucket.totalAttempts,
      uniqueProblems: bucket.uniqueProblems,
      reviewFlagCount: bucket.reviewFlagCount,
      outcomeCounts: bucket.outcomeCounts,
      independentRate: ratio(
        bucket.outcomeCounts.independent,
        bucket.totalAttempts,
      ),
      hintRate: ratio(bucket.outcomeCounts.hint, bucket.totalAttempts),
      lookedUpRate: ratio(bucket.outcomeCounts.looked_up, bucket.totalAttempts),
      suboptimalRate: ratio(
        bucket.outcomeCounts.suboptimal,
        bucket.totalAttempts,
      ),
      averageDuration: average(bucket.durations),
      latestAt: bucket.latestAt,
    }))
    .sort((a, b) => b.totalAttempts - a.totalAttempts);
}
function buildTrainingSuggestions(
  problems: Problem[],
  attempts: AttemptRow[],
): TrainingSuggestion[] {
  return problems
    .map((problem) => {
      const latest = latestAttempt(attemptsForSlug(attempts, problem.slug));
      const reasons: TrainingSuggestion["reasons"] = [];
      let score = 0;
      if (problem.reviewFlag) {
        reasons.push({
          label: PROBLEM_REVIEW_FLAG_LABELS[problem.reviewFlag],
          tone: problem.reviewFlag,
        });
        score +=
          problem.reviewFlag === "redo"
            ? 60
            : problem.reviewFlag === "review"
              ? 40
              : 25;
      }
      if (latest && latest.outcome !== "independent") {
        reasons.push({
          label: OUTCOME_LABELS[latest.outcome],
          tone: latest.outcome,
        });
        score +=
          latest.outcome === "looked_up"
            ? 55
            : latest.outcome === "suboptimal"
              ? 45
              : latest.outcome === "hint"
                ? 25
                : 0;
      }
      if (difficultyDelta(problem) > 0) {
        reasons.push({ label: "Felt harder", tone: "Hard" });
        score += 18;
      }
      if (problem.tags[0])
        reasons.push({ label: problem.tags[0], tone: problem.tags[0] });
      score += Math.min(daysSinceLastAttempt(problem), 21) / 3;
      return { problem, latest, score, reasons };
    })
    .filter(
      (suggestion) =>
        suggestion.problem.reviewFlag ||
        Boolean(
          suggestion.latest && suggestion.latest.outcome !== "independent",
        ),
    )
    .filter((suggestion) => suggestion.score > 0)
    .sort((a, b) => b.score - a.score);
}
function buildFilterOptions(problems: Problem[]) {
  return {
    tags: unique(problems.flatMap((problem) => problem.tags)),
    difficulties: unique(
      problems
        .map((problem) => problem.leetcodeDifficulty)
        .filter(Boolean) as string[],
    ),
    personalDifficulties: unique(
      problems
        .map((problem) => problem.personalDifficulty)
        .filter(Boolean) as string[],
    ),
  };
}
function filterProblems(
  problems: Problem[],
  attempts: AttemptRow[],
  filters: ProblemFilters,
): Problem[] {
  const search = filters.search.trim().toLowerCase();
  return problems
    .filter((problem) => {
      const latest = latestAttempt(attemptsForSlug(attempts, problem.slug));
      return (
        (!search ||
          problem.title.toLowerCase().includes(search) ||
          problem.slug.toLowerCase().includes(search) ||
          problem.tags.some((tag) => tag.toLowerCase().includes(search))) &&
        matchesSelected(problem.tags, filters.tags) &&
        matchesSelected(
          problem.leetcodeDifficulty ? [problem.leetcodeDifficulty] : [],
          filters.difficulties,
        ) &&
        matchesSelected(latest ? [latest.outcome] : [], filters.outcomes) &&
        matchesSelected(
          [problem.reviewFlag ?? NO_REVIEW_FLAG_FILTER],
          filters.reviewFlags,
        )
      );
    })
    .sort((a, b) => compareProblems(a, b, attempts, filters.sort));
}
function filterTagStats(
  tags: TagAggregate[],
  filters: TagFilters,
): TagAggregate[] {
  const search = filters.search.trim().toLowerCase();
  return tags
    .filter(
      (tag) =>
        (!search || tag.tag.toLowerCase().includes(search)) &&
        (filters.difficulties.length === 0 ||
          tag.problems.some(
            (problem) =>
              problem.leetcodeDifficulty &&
              filters.difficulties.includes(problem.leetcodeDifficulty),
          )),
    )
    .sort((a, b) => {
      if (filters.sort === "mostPracticed")
        return b.totalAttempts - a.totalAttempts;
      if (filters.sort === "latest")
        return timestamp(b.latestAt) - timestamp(a.latestAt);
      if (filters.sort === "fastest")
        return (
          (a.averageDuration ?? Number.MAX_SAFE_INTEGER) -
          (b.averageDuration ?? Number.MAX_SAFE_INTEGER)
        );
      return (
        a.independentRate - b.independentRate || b.lookedUpRate - a.lookedUpRate
      );
    });
}
function compareProblems(
  a: Problem,
  b: Problem,
  attempts: AttemptRow[],
  sort: ProblemFilters["sort"],
): number {
  if (sort === "title") return a.title.localeCompare(b.title);
  if (sort === "attempts")
    return (
      attemptsForSlug(attempts, b.slug).length -
      attemptsForSlug(attempts, a.slug).length
    );
  if (sort === "difficulty")
    return (
      difficultyRank(b.leetcodeDifficulty) -
      difficultyRank(a.leetcodeDifficulty)
    );
  return timestamp(b.lastAttemptedAt) - timestamp(a.lastAttemptedAt);
}
function reviewStatus(
  problem: Problem,
  latest?: Attempt,
): { label: string; tone?: string } | undefined {
  if (problem.reviewFlag)
    return {
      label: PROBLEM_REVIEW_FLAG_LABELS[problem.reviewFlag],
      tone: problem.reviewFlag,
    };
  if (!latest) return undefined;
  if (latest.outcome === "independent")
    return { label: "Done", tone: "independent" };
  if (latest.outcome === "hint") return { label: "Review", tone: "hint" };
  return { label: "Redo", tone: "redo" };
}
function difficultyDelta(problem: Problem): number {
  if (!problem.leetcodeDifficulty || !problem.personalDifficulty) return 0;
  return (
    personalDifficultyRank(problem.personalDifficulty) -
    difficultyRank(problem.leetcodeDifficulty)
  );
}
function daysSinceLastAttempt(problem: Problem): number {
  const value =
    problem.lastAttemptedAt ?? latestAttempt(problem.attempts)?.solvedAt;
  if (!value) return 0;
  return Math.max(0, Math.floor((Date.now() - timestamp(value)) / 86_400_000));
}
function flattenAttempts(problems: Problem[]): AttemptRow[] {
  return problems.flatMap((problem) =>
    problem.attempts.map((attempt) => ({
      ...attempt,
      problemSlug: problem.slug,
      problemTitle: problem.title,
    })),
  );
}
function attemptsForSlug(attempts: AttemptRow[], slug: string): AttemptRow[] {
  return attempts
    .filter((attempt) => attempt.problemSlug === slug)
    .sort((a, b) => timestamp(b.solvedAt) - timestamp(a.solvedAt));
}
function isInteractiveRowTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "a,button,input,select,textarea,[role='button'],[role='link']",
      ),
    )
  );
}
function latestAttempt<T extends Attempt>(attempts: T[]): T | undefined {
  return [...attempts].sort(
    (a, b) => timestamp(b.solvedAt) - timestamp(a.solvedAt),
  )[0];
}
function emptyOutcomeCounts(): Record<SolveOutcome, number> {
  return SOLVE_OUTCOMES.reduce(
    (counts, outcome) => ({ ...counts, [outcome]: 0 }),
    {} as Record<SolveOutcome, number>,
  );
}
function matchesSelected(values: string[], selected: string[]): boolean {
  if (selected.length === 0) return true;
  return values.some((value) => selected.includes(value));
}
function toggleArrayValue(
  values: string[],
  value: string,
  checked: boolean,
): string[] {
  if (checked) return values.includes(value) ? values : [...values, value];
  return values.filter((candidate) => candidate !== value);
}
function difficultyRank(value?: string): number {
  return value ? (LC_DIFFICULTY_RANK[value] ?? 0) : 0;
}
function personalDifficultyRank(value?: string): number {
  return value ? (PERSONAL_DIFFICULTY_RANK[value] ?? 0) : 0;
}
function timestamp(value?: string): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}
function ratio(count: number, total: number): number {
  return total === 0 ? 0 : count / total;
}
function rateColor(value: number, tone: RateTone): string {
  if (tone === "practiced") return "var(--lst-lc-practiced)";
  const score = tone === "independent" ? value : 1 - value;
  const hue = score < 0.5 ? score * 96 : 48 + (score - 0.5) * 180;
  return `hsl(${Math.round(hue)} var(--lst-rate-saturation) var(--lst-rate-lightness))`;
}
function rateFillBackground(): string {
  return "linear-gradient(90deg, color-mix(in oklab, var(--lst-rate-color) 88%, var(--color-lc-surface) 12%), var(--lst-rate-color))";
}
function rateWidth(value: number): string {
  return value <= 0 ? "0%" : `${Math.max(5, Math.round(value * 100))}%`;
}
function segmentDotStyle(segment: ChartSegment): CSSProperties {
  const toneStyle = trackerToneStyle(segment.tone);
  return {
    backgroundColor: toneStyle.backgroundColor,
    borderColor: toneStyle.borderColor,
  };
}
function isTagReason(tone?: string): boolean {
  if (!tone) return false;
  const normalized = tone.replace(/_/g, "-").toLowerCase();
  return ![
    "easy",
    "easy-",
    "medium",
    "hard",
    "hard+",
    "independent",
    "memorize",
    "done",
    "hint",
    "with-hint",
    "suboptimal",
    "looked-up",
    "redo",
    "review",
    "needs-review",
  ].includes(normalized);
}
function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function unique(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}
function formatShortDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}
function formatDateTime(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
function githubBlobUrl(
  settings: GithubSettings | undefined,
  path: string,
): string | undefined {
  if (!settings?.owner || !settings.repo || !settings.branch) return undefined;

  return `https://github.com/${encodeURIComponent(
    settings.owner,
  )}/${encodeURIComponent(settings.repo)}/blob/${encodeURIComponent(
    settings.branch,
  )}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
