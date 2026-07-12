export const LEETCODE_DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

export type LeetCodeDifficulty = (typeof LEETCODE_DIFFICULTIES)[number];

export const LEETCODE_DIFFICULTY_LABELS: Record<LeetCodeDifficulty, string> = {
  Easy: "Easy",
  Medium: "Medium",
  Hard: "Hard"
};

export const PERSONAL_DIFFICULTIES = [
  "Easy-",
  "Easy",
  "Medium",
  "Hard",
  "Hard+"
] as const;

export type PersonalDifficulty = (typeof PERSONAL_DIFFICULTIES)[number];

export const PERSONAL_DIFFICULTY_LABELS: Record<PersonalDifficulty, string> = {
  "Easy-": "Easy-",
  Easy: "Easy",
  Medium: "Medium",
  Hard: "Hard",
  "Hard+": "Hard+"
};

export const SOLVE_OUTCOMES = [
  "independent",
  "hint",
  "suboptimal",
  "looked_up"
] as const;

export type SolveOutcome = (typeof SOLVE_OUTCOMES)[number];

export const OUTCOME_LABELS: Record<SolveOutcome, string> = {
  independent: "Independent",
  hint: "With Hint",
  suboptimal: "Suboptimal",
  looked_up: "Looked Up"
};

export const PROBLEM_REVIEW_FLAGS = ["review", "redo", "memorize"] as const;

export type ProblemReviewFlag = (typeof PROBLEM_REVIEW_FLAGS)[number];

export const PROBLEM_REVIEW_FLAG_LABELS: Record<ProblemReviewFlag, string> = {
  review: "Needs Review",
  redo: "Redo",
  memorize: "Memorize"
};

export const PROGRAMMING_LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "Python3",
  "Python",
  "Kotlin",
  "Pandas",
  "Oracle",
  "Erlang",
  "Elixir",
  "Racket",
  "MySQL",
  "MSSQL",
  "Swift",
  "Scala",
  "Ruby",
  "Rust",
  "Dart",
  "Bash",
  "Java",
  "C++",
  "C#",
  "PHP",
  "Go",
  "C"
] as const;

export type ProgrammingLanguage = (typeof PROGRAMMING_LANGUAGES)[number];

export type Problem = {
  slug: string;
  title: string;
  leetcodeDifficulty?: LeetCodeDifficulty;
  personalDifficulty?: PersonalDifficulty;
  tags: string[];
  reviewFlag?: ProblemReviewFlag;
  firstAttemptedAt?: string;
  lastAttemptedAt?: string;
  attempts: Attempt[];
};

export type Attempt = {
  solvedAt: string;
  language: string;
  outcome: SolveOutcome;
  duration?: number;
  notes?: string;
  codePath?: string;
};

export type GithubSettings = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  trackerPath?: string;
  solutionsDir?: string;
};

export const DEFAULT_GITHUB_SETTINGS: GithubSettings = {
  token: "",
  owner: "",
  repo: "",
  branch: "main",
  trackerPath: "tracker.json",
  solutionsDir: "solutions"
};

export type LeetCodePageContext = {
  slug: string;
  title?: string;
  url: string;
  difficulty?: LeetCodeDifficulty;
  language?: string;
  code?: string;
  elapsedSeconds?: number;
  extractedAt: string;
};

export type SaveSessionInput = {
  context: LeetCodePageContext;
  language: string;
  outcome: SolveOutcome;
  tags: string[];
  personalDifficulty?: PersonalDifficulty;
  reviewFlag?: ProblemReviewFlag;
  notes?: string;
  duration?: number;
  code?: string;
  solvedAt?: string;
};

export type TrackerDatabase = {
  problems: Record<string, Problem>;
};

export type SaveSessionResult = {
  problem: Problem;
  attempt: Attempt;
  trackerPath: string;
  codePath?: string;
  commitSha?: string;
};

export type LoadTrackerResult = {
  tracker: TrackerDatabase;
  trackerPath: string;
};

export type SaveSessionMessage = {
  type: "SAVE_SESSION";
  payload: SaveSessionInput;
};

export type LoadTrackerMessage = {
  type: "LOAD_TRACKER";
};

export type LoadGithubSettingsMessage = {
  type: "LOAD_GITHUB_SETTINGS";
};

export type SaveGithubSettingsMessage = {
  type: "SAVE_GITHUB_SETTINGS";
  payload: GithubSettings;
};

export type ExtensionMessage =
  | SaveSessionMessage
  | LoadTrackerMessage
  | LoadGithubSettingsMessage
  | SaveGithubSettingsMessage;

export type ExtensionResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function createEmptyTracker(): TrackerDatabase {
  return {
    problems: {}
  };
}

export function isLeetCodeDifficulty(
  value: string | undefined
): value is LeetCodeDifficulty {
  return LEETCODE_DIFFICULTIES.some((difficulty) => difficulty === value);
}

export function leetcodeProblemUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}

export function normalizeGithubSettings(
  settings: Partial<GithubSettings> = {}
): GithubSettings {
  return {
    token: settings.token?.trim() ?? DEFAULT_GITHUB_SETTINGS.token,
    owner: settings.owner?.trim() ?? DEFAULT_GITHUB_SETTINGS.owner,
    repo: settings.repo?.trim() ?? DEFAULT_GITHUB_SETTINGS.repo,
    branch: settings.branch?.trim() || DEFAULT_GITHUB_SETTINGS.branch,
    trackerPath:
      settings.trackerPath?.trim() || DEFAULT_GITHUB_SETTINGS.trackerPath,
    solutionsDir:
      settings.solutionsDir?.trim() || DEFAULT_GITHUB_SETTINGS.solutionsDir
  };
}

export function normalizeTag(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "";

  return normalized
    .split(" ")
    .map((word) => {
      if (word === "dfs" || word === "bfs") return word.toUpperCase();
      if (word === "dp") return "DP";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function normalizeTags(tags: readonly string[]): string[] {
  const normalized = tags.map((tag) => normalizeTag(tag)).filter(Boolean);
  const unique = new Map<string, string>();

  for (const tag of normalized) {
    unique.set(tag.toLowerCase(), tag);
  }

  return Array.from(unique.values());
}
