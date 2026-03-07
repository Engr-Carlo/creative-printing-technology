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
}

export function ProcessStatusButton({ processId, currentStatus, processName }: ProcessStatusButtonProps) {
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
        size="sm"
        className="text-xs"
        onClick={() => handleStatusChange("IN_PROGRESS")}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
        ) : (
          <PlayCircle className="w-3 h-3 mr-1" />
        )}
        Start Process
      </Button>
    );
  }

  if (currentStatus === "IN_PROGRESS") {
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
        size="sm"
        variant="outline"
        className="text-xs"
        onClick={() => handleStatusChange("IN_PROGRESS")}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
        ) : (
          <PlayCircle className="w-3 h-3 mr-1" />
        )}
        Resume
      </Button>
    );
  }

  if (currentStatus === "REJECTED") {
    return (
      <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        Rejected
      </span>
    );
  }

  // COMPLETED
  return (
    <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" />
      Completed
    </span>
  );
}
