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
}

export function ProcessStatusButton({ processId, currentStatus, processName, prominent = false }: ProcessStatusButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleStatusChange(newStatus: string) {
    setIsLoading(true);
    try {
      const result = await updateProcessStatus(processId, newStatus);
      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    } catch (error) {
      alert("Failed to update status");
    } finally {
      setIsLoading(false);
    }
  }

  if (currentStatus === "NOT_STARTED") {
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
