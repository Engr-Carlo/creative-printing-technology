"use client";

import { useState } from "react";
import { runDatabaseMigration } from "@/app/actions/migration";
import { Button } from "@/components/ui/button";
import { Database, Play, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export function MigrationPanel() {
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setStatus("running");
    setResults([]);
    setError(null);
    try {
      const res = await runDatabaseMigration();
      if (res.error) {
        setError(res.error);
      } else {
        setResults(res.results ?? []);
      }
    } catch (e: any) {
      setError(e.message ?? "Unexpected error");
    } finally {
      setStatus("done");
    }
  }

  return (
    <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50/50">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-sm text-blue-900">Database Migration</h3>
          </div>
          <p className="text-xs text-blue-700 max-w-xs">
            Apply pending schema changes: REJECTED status, rename "Pre Fold" → "Pre-Fold/Inspection", fix STITCHING process order.
          </p>
          <p className="text-[10px] text-blue-500 mt-1">Safe to run multiple times — each step is idempotent.</p>
        </div>
        <Button
          onClick={handleRun}
          disabled={status === "running"}
          className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs"
          size="sm"
        >
          {status === "running" ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Running…
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Run Migration
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {(results.length > 0 || error) && (
        <div className="mt-3 bg-white border border-blue-200 rounded-md p-3 space-y-1">
          {error && (
            <div className="flex items-start gap-2 text-xs text-red-700">
              <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          {results.map((line, i) => (
            <div key={i} className={`flex items-start gap-2 text-xs ${
              line.startsWith("✅") ? "text-green-700" :
              line.startsWith("⚠️") ? "text-orange-600" :
              "text-red-700"
            }`}>
              {line}
            </div>
          ))}
          {status === "done" && !error && (
            <div className="flex items-center gap-2 text-xs text-green-700 font-semibold pt-1 border-t mt-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Migration complete. Refresh the page.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
