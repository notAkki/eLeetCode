import type {
  ExtensionMessage,
  ExtensionResponse,
  GithubSettings,
  LoadTrackerResult,
  SaveSessionInput,
  SaveSessionMessage,
  SaveSessionResult
} from "../lib/model";

export async function saveSessionViaBackground(
  input: SaveSessionInput
): Promise<SaveSessionResult> {
  const message: SaveSessionMessage = {
    type: "SAVE_SESSION",
    payload: input
  };
  const response = await sendRuntimeMessage<SaveSessionResult>(message);
  return unwrapResponse(response);
}

export async function loadTrackerViaBackground(): Promise<LoadTrackerResult> {
  const response = await sendRuntimeMessage<LoadTrackerResult>({
    type: "LOAD_TRACKER"
  });
  return unwrapResponse(response);
}

export async function loadGithubSettingsViaBackground(): Promise<GithubSettings> {
  const response = await sendRuntimeMessage<GithubSettings>({
    type: "LOAD_GITHUB_SETTINGS"
  });
  return unwrapResponse(response);
}

export async function saveGithubSettingsViaBackground(
  settings: GithubSettings
): Promise<GithubSettings> {
  const response = await sendRuntimeMessage<GithubSettings>({
    type: "SAVE_GITHUB_SETTINGS",
    payload: settings
  });
  return unwrapResponse(response);
}

function sendRuntimeMessage<T>(
  message: ExtensionMessage
): Promise<ExtensionResponse<T>> {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return Promise.resolve({
      ok: false,
      error: "Chrome runtime messaging is unavailable."
    });
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: ExtensionResponse<T>) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        resolve({
          ok: false,
          error: runtimeError.message ?? "Chrome runtime message failed."
        });
        return;
      }

      resolve(
        response ?? {
          ok: false,
          error: "Background worker did not send a response."
        }
      );
    });
  });
}

function unwrapResponse<T>(response: ExtensionResponse<T>): T {
  if (response.ok) {
    return response.data;
  }

  throw new Error(response.error);
}
