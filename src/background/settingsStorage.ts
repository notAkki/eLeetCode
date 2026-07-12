import type { GithubSettings } from "../lib/model";
import {
  DEFAULT_GITHUB_SETTINGS,
  normalizeGithubSettings
} from "../lib/model";

const GITHUB_SETTINGS_STORAGE_KEY = "githubSettings";

export async function loadGithubSettings(): Promise<GithubSettings> {
  const stored = await getStoredValue(GITHUB_SETTINGS_STORAGE_KEY);
  return normalizeGithubSettings(
    typeof stored === "object" && stored ? (stored as Partial<GithubSettings>) : {}
  );
}

export async function saveGithubSettings(
  settings: GithubSettings
): Promise<GithubSettings> {
  const normalized = normalizeGithubSettings(settings);
  await setStoredValue(GITHUB_SETTINGS_STORAGE_KEY, normalized);
  return normalized;
}

function getStoredValue(key: string): Promise<unknown> {
  if (!chrome.storage?.local) {
    return Promise.resolve(DEFAULT_GITHUB_SETTINGS);
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(result[key]);
    });
  });
}

function setStoredValue(key: string, value: unknown): Promise<void> {
  if (!chrome.storage?.local) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve();
    });
  });
}
