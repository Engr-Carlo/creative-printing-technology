"use client";

import { useState } from "react";
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

export function ProcessStatusButton({ processId, currentStatus, processName, prominent = false, locked = false, lockReason }: ProcessStatusButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<"completed" | "rejected" | null>(null);

  function closeModal() {
    setModal(null);
    router.refresh();
  }

  async function handleStatusChange(newStatus: string) {
    setIsLoading(true);
    try {
      const result = await updateProcessStatus(processId, newStatus);
      if (result.error) {
        alert(result.error);
      } else if ("itemCompleted" in result && result.itemCompleted) {
        setModal("completed");
      } else if ("itemRejected" in result && result.itemRejected) {
        setModal("rejected");
      } else {
        router.refresh();
      }
    } catch (error) {
      alert("Failed to update status");
    } finally {
      setIsLoading(false);
    }
  }

  function renderButtons() {
    if (currentStatus === "NOT_STARTED") {
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
          className={prominent ? "gap-2 bg-blue-600 hover:bg-blue-700 text-white" : "text-xs"}
          onClick={() => handleStatusChange("IN_PROGRESS")}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className={`border-2 border-white border-t-transparent rounded-full animate-spin ${prominent ? "w-4 h-4" : "w-3 h-3 mr-2"}`} />
          ) : (
            <PlayCircle className={prominent ? "w-4 h-4" : "w-3 h-3 mr-1"} />
          )}
          {prominent ? "Start Evaluation" : "Start Process"}
        </Button>
      );
    }

    if (currentStatus === "IN_PROGRESS") {
      if (prominent) {
        return (
          <div className="flex items-center gap-3">
            <Button
              className="gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 text-sm font-bold"
              onClick={() => handleStatusChange("COMPLETED")}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              COMPLETE
            </Button>
            <Button
              className="gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 text-sm font-bold"
              onClick={() => handleStatusChange("REJECTED")}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              REJECT
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
              onClick={() => handleStatusChange("DELAYED")}
              disabled={isLoading}
            >
              <Clock className="w-3 h-3 mr-1" />
              Delay
            </Button>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-green-300 text-green-700 hover:bg-green-50"
            onClick={() => handleStatusChange("COMPLETED")}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="w-3 h-3 mr-1" />
            )}
            Complete
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
            onClick={() => handleStatusChange("DELAYED")}
            disabled={isLoading}
          >
            <Clock className="w-3 h-3 mr-1" />
            Delay
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-red-300 text-red-700 hover:bg-red-50"
            onClick={() => handleStatusChange("REJECTED")}
            disabled={isLoading}
          >
            <XCircle className="w-3 h-3 mr-1" />
            Reject
          </Button>
        </div>
      );
    }

    if (currentStatus === "DELAYED") {
      return (
        <Button
          size={prominent ? "default" : "sm"}
          variant="outline"
          className={prominent ? "gap-2 border-orange-400 text-orange-700 hover:bg-orange-50" : "text-xs"}
          onClick={() => handleStatusChange("IN_PROGRESS")}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className={`border-2 border-orange-600 border-t-transparent rounded-full animate-spin ${prominent ? "w-4 h-4" : "w-3 h-3 mr-2"}`} />
          ) : (
            <PlayCircle className={prominent ? "w-4 h-4" : "w-3 h-3 mr-1"} />
          )}
          Resume
        </Button>
      );
    }

    if (currentStatus === "REJECTED") {
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
