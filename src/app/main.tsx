import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import styles from "./styles.css?inline";
import { syncLeetCodeTheme } from "./theme";

const HOST_ID = "leetcode-session-tracker-root";
const APP_ID = "leetcode-session-tracker-app";

void mount();

async function mount(): Promise<void> {
  if (!document.body) {
    await new Promise<void>((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), {
        once: true
      });
    });
  }

  const host = getOrCreateHost();
  const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: "open" });

  if (shadowRoot.getElementById(APP_ID)) {
    return;
  }

  syncLeetCodeTheme(host);

  const style = document.createElement("style");
  style.textContent = styles;
  shadowRoot.append(style);

  const appRoot = document.createElement("div");
  appRoot.id = APP_ID;
  shadowRoot.append(appRoot);

  createRoot(appRoot).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

function getOrCreateHost(): HTMLElement {
  const existingHost = document.getElementById(HOST_ID);
  if (existingHost) {
    return existingHost;
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  document.body.append(host);
  return host;
}
