import type {
  LoadTrackerResult,
  SaveSessionInput,
  SaveSessionResult
} from "../../lib/model";
import {
  loadTrackerFromGithub,
  saveSessionToGithub
} from "../../features/github/githubClient";
import { loadGithubSettings } from "../settingsStorage";

export async function saveSession(
  input: SaveSessionInput
): Promise<SaveSessionResult> {
  return saveSessionToGithub(input, await loadGithubSettings());
}

export async function loadTracker(): Promise<LoadTrackerResult> {
  return loadTrackerFromGithub(await loadGithubSettings());
}
