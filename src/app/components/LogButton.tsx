import { BarChart3, NotebookPen } from "lucide-react";
import { floatingButtonClass } from "./ui/styles";

type LogButtonProps = {
  hasAcceptedNudge: boolean;
  acceptedNudgeId: number;
  onOpenDashboard: () => void;
  onOpenLog: () => void;
};

export function LogButton({
  hasAcceptedNudge,
  acceptedNudgeId,
  onOpenDashboard,
  onOpenLog,
}: LogButtonProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
      <button
        type="button"
        className={`${floatingButtonClass} w-10`}
        title="Open tracker dashboard"
        aria-label="Open tracker dashboard"
        onClick={onOpenDashboard}
      >
        <BarChart3 aria-hidden="true" size={18} />
      </button>
      <button
        key={hasAcceptedNudge ? acceptedNudgeId : "idle"}
        type="button"
        className={`${floatingButtonClass} lst-accepted-log-button relative w-10 overflow-visible text-lc-text`}
        data-accepted={hasAcceptedNudge ? "true" : undefined}
        title={
          hasAcceptedNudge ? "Accepted submission detected" : "Open session log"
        }
        aria-label={
          hasAcceptedNudge
            ? "Accepted submission detected. Open session log"
            : "Open session log"
        }
        onClick={onOpenLog}
      >
        {hasAcceptedNudge && (
          <span
            key={acceptedNudgeId}
            className="lst-accepted-sweep"
            aria-hidden="true"
          />
        )}
        <NotebookPen className="relative z-10" aria-hidden="true" size={18} />
      </button>
    </div>
  );
}
