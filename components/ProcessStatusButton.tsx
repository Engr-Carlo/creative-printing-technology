"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { updateProcessStatus } from "@/app/actions/processes";
import { useRouter } from "next/navigation";
import { PlayCircle, CheckCircle2, Clock, XCircle } from "lucide-react";

interface ProcessStatusButtonProps {
  processId: string;
  currentStatus: string;
  processName: string;
  /** When true, shows larger prominent Complete/Reject buttons for the evaluation panel */
  prominent?: boolean;
  /** When true, the process cannot be started — button is grayed out with a reason tooltip */
  locked?: boolean;
  /** Reason why the process is locked (shown as text) */
  lockReason?: string;
}

// ── Progress bar that animates from 0 → ~85% while waiting, then 100% on done ──
function ProgressBar({ active, done }: { active: boolean; done: boolean }) {
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active && !done) {
      setWidth(0);
      // Advance quickly to ~85% over ~2.5s, then slow down (waiting for server)
      let current = 0;
      timerRef.current = setInterval(() => {
        current += current < 60 ? 4 : current < 80 ? 1.2 : 0.3;
        if (current >= 85) current = 85;
        setWidth(current);
      }, 80);
    }
    if (done) {
      if (timerRef.current) clearInterval(timerRef.current);
      setWidth(100);
    }
    if (!active && !done) {
      if (timerRef.current) clearInterval(timerRef.current);
      setWidth(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active, done]);

  if (!active && !done) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 h-[3px] rounded-b-md overflow-hidden bg-black/20">
      <div
        className="h-full bg-white/80 transition-all"
        style={{
          width: `${width}%`,
          transitionDuration: done ? "200ms" : "80ms",
          transitionTimingFunction: "linear",
        }}
      />
    </div>
  );
}

export function ProcessStatusButton({ processId, currentStatus, processName, prominent = false, locked = false, lockReason }: ProcessStatusButtonProps) {
  const router = useRouter();
  const [localStatus, setLocalStatus] = useState(currentStatus);
  const [pendingTo, setPendingTo] = useState<string | null>(null); // which status we're transitioning TO
  const [progressDone, setProgressDone] = useState(false);
  const [, startSyncTransition] = useTransition();
  const [modal, setModal] = useState<"completed" | "rejected" | null>(null);

  const isBusy = pendingTo !== null;

  function closeModal() {
    setModal(null);
    startSyncTransition(() => { router.refresh(); });
  }

  async function handleStatusChange(newStatus: string) {
    setPendingTo(newStatus);
    setProgressDone(false);
    try {
      const result = await updateProcessStatus(processId, newStatus);
      if (result.error) {
        alert(result.error);
        return;
      }
      // Snap bar to 100%, brief pause for the animation, then flip UI
      setProgressDone(true);
      await new Promise((res) => setTimeout(res, 200));
      setLocalStatus(newStatus);

      if ("itemCompleted" in result && result.itemCompleted) {
        setModal("completed");
      } else if ("itemRejected" in result && result.itemRejected) {
        setModal("rejected");
      } else {
        // Silently sync server state — user never waits for this
        startSyncTransition(() => { router.refresh(); });
      }
    } catch {
      alert("Failed to update status");
    } finally {
      setPendingTo(null);
      setProgressDone(false);
    }
  }

  function renderButtons() {
    if (localStatus === "NOT_STARTED") {
      if (locked) {
        return (
          <div className="flex items-center gap-2">
            <Button
              size={prominent ? "default" : "sm"}
              className={`${prominent ? "gap-2" : "text-xs"} bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300`}
              disabled
            >
              <PlayCircle className={prominent ? "w-4 h-4" : "w-3 h-3 mr-1"} />
              {prominent ? "Start Evaluation" : "Start Process"}
            </Button>
            {lockReason && <span className="text-[10px] text-gray-400 italic max-w-[140px]">{lockReason}</span>}
          </div>
        );
      }
      return (
        <Button
          size={prominent ? "default" : "sm"}
          className={`relative overflow-hidden ${prominent ? "gap-2 bg-blue-600 hover:bg-blue-700 text-white" : "text-xs"}`}
          onClick={() => handleStatusChange("IN_PROGRESS")}
          disabled={isBusy}
        >
          <PlayCircle className={prominent ? "w-4 h-4" : "w-3 h-3 mr-1"} />
          {prominent ? "Start Evaluation" : "Start Process"}
          <ProgressBar active={pendingTo === "IN_PROGRESS"} done={progressDone && pendingTo === "IN_PROGRESS"} />
        </Button>
      );
    }

    if (localStatus === "IN_PROGRESS") {
      if (prominent) {
        return (
          <div className="flex items-center gap-3">
            <Button
              className="relative overflow-hidden gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 text-sm font-bold"
              onClick={() => handleStatusChange("COMPLETED")}
              disabled={isBusy}
            >
              <CheckCircle2 className="w-5 h-5" />
              COMPLETE
              <ProgressBar active={pendingTo === "COMPLETED"} done={progressDone && pendingTo === "COMPLETED"} />
            </Button>
            <Button
              className="relative overflow-hidden gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 text-sm font-bold"
              onClick={() => handleStatusChange("REJECTED")}
              disabled={isBusy}
            >
              <XCircle className="w-5 h-5" />
              REJECT
              <ProgressBar active={pendingTo === "REJECTED"} done={progressDone && pendingTo === "REJECTED"} />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="relative overflow-hidden text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
              onClick={() => handleStatusChange("DELAYED")}
              disabled={isBusy}
            >
              <Clock className="w-3 h-3 mr-1" />
              Delay
              <ProgressBar active={pendingTo === "DELAYED"} done={progressDone && pendingTo === "DELAYED"} />
            </Button>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="relative overflow-hidden text-xs border-green-300 text-green-700 hover:bg-green-50"
            onClick={() => handleStatusChange("COMPLETED")}
            disabled={isBusy}
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Complete
            <ProgressBar active={pendingTo === "COMPLETED"} done={progressDone && pendingTo === "COMPLETED"} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="relative overflow-hidden text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
            onClick={() => handleStatusChange("DELAYED")}
            disabled={isBusy}
          >
            <Clock className="w-3 h-3 mr-1" />
            Delay
            <ProgressBar active={pendingTo === "DELAYED"} done={progressDone && pendingTo === "DELAYED"} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="relative overflow-hidden text-xs border-red-300 text-red-700 hover:bg-red-50"
            onClick={() => handleStatusChange("REJECTED")}
            disabled={isBusy}
          >
            <XCircle className="w-3 h-3 mr-1" />
            Reject
            <ProgressBar active={pendingTo === "REJECTED"} done={progressDone && pendingTo === "REJECTED"} />
          </Button>
        </div>
      );
    }

    if (localStatus === "DELAYED") {
      return (
        <Button
          size={prominent ? "default" : "sm"}
          variant="outline"
          className={`relative overflow-hidden ${prominent ? "gap-2 border-orange-400 text-orange-700 hover:bg-orange-50" : "text-xs"}`}
          onClick={() => handleStatusChange("IN_PROGRESS")}
          disabled={isBusy}
        >
          <PlayCircle className={prominent ? "w-4 h-4" : "w-3 h-3 mr-1"} />
          Resume
          <ProgressBar active={pendingTo === "IN_PROGRESS"} done={progressDone && pendingTo === "IN_PROGRESS"} />
        </Button>
      );
    }

    if (localStatus === "REJECTED") {
      return (
        <span className={`text-red-600 font-semibold flex items-center gap-1 ${prominent ? "text-sm" : "text-xs"}`}>
          <XCircle className={prominent ? "w-4 h-4" : "w-3 h-3"} />
          Rejected
        </span>
      );
    }

    // COMPLETED
    return (
      <span className={`text-green-600 font-semibold flex items-center gap-1 ${prominent ? "text-sm" : "text-xs"}`}>
        <CheckCircle2 className={prominent ? "w-4 h-4" : "w-3 h-3"} />
        Completed
      </span>
    );
  }

  return (
    <>
      {/* Item status popup modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {modal === "completed" ? (
              <>
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-green-700 mb-2">Item Completed!</h2>
                <p className="text-sm text-gray-500 mb-6">
                  All processes have been completed. The item is now marked as{" "}
                  <span className="font-bold text-green-700">COMPLETED</span>.
                </p>
                <Button className="bg-green-600 hover:bg-green-700 text-white px-8" onClick={closeModal}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  OK, Great!
                </Button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-red-700 mb-2">Item Rejected</h2>
                <p className="text-sm text-gray-500 mb-6">
                  This process was rejected. The item has been marked as{" "}
                  <span className="font-bold text-red-700">REJECTED</span>.
                </p>
                <Button className="bg-red-600 hover:bg-red-700 text-white px-8" onClick={closeModal}>
                  OK
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      {renderButtons()}
    </>
  );
}
