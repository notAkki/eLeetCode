import type {
  ExtensionMessage,
  ExtensionResponse,
  GithubSettings,
  LoadTrackerResult,
  SaveSessionResult
} from "../lib/model";
import { loadTracker, saveSession } from "./handlers/saveSession";
import {
  loadGithubSettings,
  saveGithubSettings
} from "./settingsStorage";

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender,
    sendResponse: (
      response: ExtensionResponse<
        GithubSettings | LoadTrackerResult | SaveSessionResult
      >
    ) => void
  ) => {
    void handleMessage(message).then(sendResponse);
    return true;
  }
);

async function handleMessage(
  message: ExtensionMessage
): Promise<
  ExtensionResponse<GithubSettings | LoadTrackerResult | SaveSessionResult>
> {
  try {
    switch (message.type) {
      case "SAVE_SESSION":
        return {
          ok: true,
          data: await saveSession(message.payload)
        };

      case "LOAD_TRACKER":
        return {
          ok: true,
          data: await loadTracker()
        };

      case "LOAD_GITHUB_SETTINGS":
        return {
          ok: true,
          data: await loadGithubSettings()
        };

      case "SAVE_GITHUB_SETTINGS":
        return {
          ok: true,
          data: await saveGithubSettings(message.payload)
        };

      default:
        return exhaustiveMessageError(message);
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected error."
    };
  }
}

function exhaustiveMessageError(
  message: never
): ExtensionResponse<GithubSettings | LoadTrackerResult | SaveSessionResult> {
  return {
    ok: false,
    error: `Unsupported message: ${JSON.stringify(message)}`
  };
}
