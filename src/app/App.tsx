import { useEffect, useRef, useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { LogButton } from "./components/LogButton";
import { LogDrawer } from "./components/LogDrawer";
import { floatingButtonClass } from "./components/ui/styles";
import type { LeetCodePageContext } from "../lib/model";
import { extractLeetCodeContext } from "../features/leetcode/extractContext";
import { watchAcceptedSubmissions } from "../features/leetcode/submissionWatcher";

const ACCEPTED_NUDGE_DURATION_MS = 6200;

type AppProps = {
  showDevAcceptedTrigger?: boolean;
};

export default function App({ showDevAcceptedTrigger = false }: AppProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [hasAcceptedNudge, setHasAcceptedNudge] = useState(false);
  const [acceptedNudgeId, setAcceptedNudgeId] = useState(0);
  const [drawerSeedContext, setDrawerSeedContext] =
    useState<LeetCodePageContext | null>(null);
  const acceptedNudgeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return watchAcceptedSubmissions((event) => {
      showAcceptedNudge(event.context);
    });
  }, []);

  useEffect(() => {
    return () => {
      clearAcceptedNudgeTimeout();
    };
  }, []);

  function clearAcceptedNudgeTimeout() {
    if (acceptedNudgeTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(acceptedNudgeTimeoutRef.current);
    acceptedNudgeTimeoutRef.current = null;
  }

  function showAcceptedNudge(context: LeetCodePageContext) {
    clearAcceptedNudgeTimeout();
    setDrawerSeedContext(context);
    setHasAcceptedNudge(true);
    setAcceptedNudgeId((current) => current + 1);

    acceptedNudgeTimeoutRef.current = window.setTimeout(() => {
      acceptedNudgeTimeoutRef.current = null;
      setHasAcceptedNudge(false);
    }, ACCEPTED_NUDGE_DURATION_MS);
  }

  function openLogButton() {
    if (!hasAcceptedNudge) {
      setDrawerSeedContext(null);
    }

    clearAcceptedNudgeTimeout();
    setHasAcceptedNudge(false);
    setDrawerOpen(true);
  }

  return (
    <>
      <LogButton
        hasAcceptedNudge={hasAcceptedNudge}
        acceptedNudgeId={acceptedNudgeId}
        onOpenDashboard={() => setDashboardOpen(true)}
        onOpenLog={openLogButton}
      />
      {showDevAcceptedTrigger ? (
        <button
          type="button"
          className={`${floatingButtonClass} fixed right-5 bottom-17 z-50 h-8 rounded-full px-3 text-xs font-medium`}
          onClick={() => showAcceptedNudge(extractLeetCodeContext())}
        >
          Accepted
        </button>
      ) : null}
      <LogDrawer
        open={drawerOpen}
        seedContext={drawerSeedContext ?? undefined}
        onClose={() => setDrawerOpen(false)}
      />
      <Dashboard open={dashboardOpen} onClose={() => setDashboardOpen(false)} />
    </>
  );
}
