import type {
  Attempt,
  GithubSettings,
  LoadTrackerResult,
  Problem,
  SaveSessionInput,
  SaveSessionResult,
  TrackerDatabase
} from "../../lib/model";
import { createEmptyTracker, normalizeTags } from "../../lib/model";

const GITHUB_API_BASE = "https://api.github.com";
const DEFAULT_TRACKER_PATH = "tracker.json";
const DEFAULT_SOLUTIONS_DIR = "solutions";

type GithubContentFile = {
  type: "file";
  sha: string;
  content?: string;
  encoding?: string;
  path: string;
};

type GithubPutContentResponse = {
  content?: {
    path: string;
    sha: string;
  };
  commit?: {
    sha: string;
  };
};

type TextFile = {
  sha: string;
  text: string;
};

class GithubApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "GithubApiError";
  }
}

export async function loadTrackerFromGithub(
  settings: GithubSettings
): Promise<LoadTrackerResult> {
  assertGithubSettings(settings);

  const trackerPath = settings.trackerPath ?? DEFAULT_TRACKER_PATH;
  const existing = await getTextFile(settings, trackerPath);

  return {
    tracker: existing ? parseTracker(existing.text) : createEmptyTracker(),
    trackerPath
  };
}

export async function saveSessionToGithub(
  input: SaveSessionInput,
  settings: GithubSettings
): Promise<SaveSessionResult> {
  assertGithubSettings(settings);

  const trackerPath = settings.trackerPath ?? DEFAULT_TRACKER_PATH;
  const solvedAt = input.solvedAt ?? new Date().toISOString();
  const code = input.code ?? input.context.code;
  const codePath = code?.trim()
    ? await saveSolutionCode(input, settings, solvedAt, code)
    : undefined;

  for (let attemptIndex = 0; attemptIndex < 3; attemptIndex += 1) {
    const existing = await getTextFile(settings, trackerPath);
    const tracker = existing ? parseTracker(existing.text) : createEmptyTracker();
    const merged = mergeSessionIntoTracker(tracker, input, solvedAt, codePath);

    try {
      const response = await putTextFile(settings, {
        path: trackerPath,
        content: `${JSON.stringify(merged.tracker, null, 2)}\n`,
        message: `Log ${merged.problem.title}`,
        sha: existing?.sha
      });

      return {
        problem: merged.problem,
        attempt: merged.attempt,
        trackerPath,
        codePath,
        commitSha: response.commit?.sha
      };
    } catch (error) {
      if (isConflictError(error) && attemptIndex < 2) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to save tracker after retrying GitHub conflicts.");
}

async function saveSolutionCode(
  input: SaveSessionInput,
  settings: GithubSettings,
  solvedAt: string,
  code: string
): Promise<string> {
  const codePath = buildSolutionPath(settings, input, solvedAt);
  const existing = await getTextFile(settings, codePath);

  await putTextFile(settings, {
    path: codePath,
    content: ensureTrailingNewline(code),
    message: `Add ${input.context.slug} solution`,
    sha: existing?.sha
  });

  return codePath;
}

function mergeSessionIntoTracker(
  tracker: TrackerDatabase,
  input: SaveSessionInput,
  solvedAt: string,
  codePath: string | undefined
): {
  tracker: TrackerDatabase;
  problem: Problem;
  attempt: Attempt;
} {
  const slug = input.context.slug;
  const existingProblem = tracker.problems[slug];
  const title = input.context.title ?? existingProblem?.title ?? slug;
  const attempt: Attempt = {
    solvedAt,
    language: input.language,
    outcome: input.outcome,
    duration: input.duration,
    notes: input.notes,
    codePath
  };

  const problem: Problem = {
    slug,
    title,
    leetcodeDifficulty:
      input.context.difficulty ?? existingProblem?.leetcodeDifficulty,
    personalDifficulty:
      input.personalDifficulty ?? existingProblem?.personalDifficulty,
    tags: mergeTags(existingProblem?.tags ?? [], input.tags),
    reviewFlag: input.reviewFlag ?? existingProblem?.reviewFlag,
    firstAttemptedAt: existingProblem?.firstAttemptedAt ?? solvedAt,
    lastAttemptedAt: solvedAt,
    attempts: [...(existingProblem?.attempts ?? []), attempt]
  };

  return {
    tracker: {
      problems: {
        ...tracker.problems,
        [slug]: problem
      }
    },
    problem,
    attempt
  };
}

async function getTextFile(
  settings: GithubSettings,
  path: string
): Promise<TextFile | undefined> {
  const response = await fetch(contentUrl(settings, path, true), {
    cache: "no-store",
    headers: {
      ...githubHeaders(settings),
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
    }
  });

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw await githubError(response);
  }

  const body = (await response.json()) as GithubContentFile | GithubContentFile[];
  if (Array.isArray(body) || body.type !== "file") {
    throw new Error(`${path} is not a GitHub file.`);
  }

  return {
    sha: body.sha,
    text: decodeBase64(body.content ?? "")
  };
}

async function putTextFile(
  settings: GithubSettings,
  input: {
    path: string;
    content: string;
    message: string;
    sha?: string;
  }
): Promise<GithubPutContentResponse> {
  const response = await fetch(contentUrl(settings, input.path, false), {
    method: "PUT",
    headers: githubHeaders(settings),
    body: JSON.stringify({
      message: input.message,
      content: encodeBase64(input.content),
      branch: settings.branch,
      sha: input.sha
    })
  });

  if (!response.ok) {
    throw await githubError(response);
  }

  return (await response.json()) as GithubPutContentResponse;
}

function contentUrl(
  settings: GithubSettings,
  path: string,
  includeRef: boolean
): string {
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(
    settings.owner
  )}/${encodeURIComponent(settings.repo)}/contents/${encodeRepoPath(path)}`;

  return includeRef ? `${url}?ref=${encodeURIComponent(settings.branch)}` : url;
}

function githubHeaders(settings: GithubSettings): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${settings.token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

async function githubError(response: Response): Promise<GithubApiError> {
  let message = `GitHub request failed with ${response.status}.`;
  const text = await response.text();

  if (!text) {
    return new GithubApiError(message, response.status);
  }

  try {
    const body = JSON.parse(text) as { message?: string };
    if (body.message) {
      message = body.message;
    }
  } catch {
    message = text;
  }

  return new GithubApiError(message, response.status);
}

function assertGithubSettings(settings: GithubSettings): void {
  const missing = [
    ["token", settings.token],
    ["owner", settings.owner],
    ["repo", settings.repo],
    ["branch", settings.branch]
  ]
    .filter(([, value]) => !value || value.startsWith("YOUR_"))
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `GitHub settings are incomplete. Fill ${missing.join(
        ", "
      )} in the dashboard Settings tab.`
    );
  }
}

function parseTracker(text: string): TrackerDatabase {
  if (!text.trim()) {
    return createEmptyTracker();
  }

  const parsed = JSON.parse(text) as Partial<TrackerDatabase>;
  return {
    problems: parsed.problems ?? {}
  };
}

function buildSolutionPath(
  settings: GithubSettings,
  input: SaveSessionInput,
  solvedAt: string
): string {
  const solutionsDir = settings.solutionsDir ?? DEFAULT_SOLUTIONS_DIR;
  const extension = extensionForLanguage(input.language);
  const timestamp = solvedAt.replace(/[:.]/g, "-");
  return `${solutionsDir}/${input.context.slug}/${timestamp}.${extension}`;
}

function extensionForLanguage(language: string): string {
  const normalized = language.trim().toLowerCase();
  const extensionMap: Record<string, string> = {
    "c++": "cpp",
    cpp: "cpp",
    c: "c",
    "c#": "cs",
    csharp: "cs",
    dart: "dart",
    elixir: "ex",
    erlang: "erl",
    go: "go",
    java: "java",
    javascript: "js",
    kotlin: "kt",
    "ms sql server": "sql",
    mssql: "sql",
    mysql: "sql",
    oracle: "sql",
    pandas: "py",
    bash: "sh",
    php: "php",
    python: "py",
    python3: "py",
    racket: "rkt",
    ruby: "rb",
    rust: "rs",
    scala: "scala",
    swift: "swift",
    typescript: "ts"
  };

  return extensionMap[normalized] ?? "txt";
}

function mergeTags(existingTags: string[], nextTags: string[]): string[] {
  return normalizeTags([...existingTags, ...nextTags]).sort((a, b) =>
    a.localeCompare(b)
  );
}

function encodeRepoPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function isConflictError(error: unknown): boolean {
  return (
    error instanceof GithubApiError &&
    (error.status === 409 || error.status === 422)
  );
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function decodeBase64(value: string): string {
  const cleaned = value.replace(/\s/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new TextDecoder().decode(bytes);
}
