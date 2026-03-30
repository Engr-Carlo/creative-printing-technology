"use client";

import { useState, useEffect, useTransition } from "react";
import { X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, BarChart2, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { getProcessTypeAnalysis, respondToQueueSuggestion, type ProcessQueueAnalysis } from "@/app/actions/queue-analysis";
import { Button } from "@/components/ui/button";

interface ProcessQueueDrawerProps {
  processId: string;
  itemId: string;
  processTypeName: string;
  isOpen: boolean;
  onClose: () => void;
  /** When true, hides Accept/Reject buttons (admin read-only view) */
  readOnly?: boolean;
}

type Model = "mm1" | "mm2";

function fmtWq(wqDays: number | null): string {
  if (wqDays === null) return "Unstable — cannot estimate";
  const totalMins = wqDays * 24 * 60;
  if (totalMins < 1) return "< 1 min";
  if (totalMins < 60) return `${Math.round(totalMins)} min`;
  const hrs = Math.floor(totalMins / 60);
  const mins = Math.round(totalMins % 60);
  return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
}

function fmtRate(r: number): string {
  return r.toFixed(2);
}

function RhoPill({ rho, size = "md" }: { rho: number; size?: "sm" | "md" }) {
  const text = size === "sm" ? "text-[10px]" : "text-xs";
  if (rho === 0) return <span className={`${text} text-gray-400 font-semibold`}>—</span>;
  if (rho < 0.5)
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-bold ${text}`}><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />{rho.toFixed(2)}</span>;
  if (rho <= 0.63)
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-bold ${text}`}><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />{rho.toFixed(2)}</span>;
  if (rho < 1)
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold ${text}`}><span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />{rho.toFixed(2)}</span>;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold ${text}`}><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />{rho.toFixed(2)}</span>;
}

function SuggestionBox({ rho, model }: { rho: number; model: Model }) {
  const servers = model === "mm1" ? "1 server" : "2 servers";
  if (rho === 0) return null;
  if (rho < 0.5)
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-3">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-green-800">Under-utilized — no action needed</p>
            <p className="text-[11px] text-green-700 mt-0.5">
              With {servers}, this stage handles jobs well below capacity. Processing should proceed normally.
            </p>
          </div>
        </div>
      </div>
    );
  if (rho <= 0.63)
    return (
      <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-yellow-800">Approaching capacity — monitor closely</p>
            <p className="text-[11px] text-yellow-700 mt-0.5">
              With {servers}, utilization is near the safe limit (ρ = 0.63). No immediate action, but watch for delays.
            </p>
          </div>
        </div>
      </div>
    );
  if (rho < 1)
    return (
      <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-orange-800">Near overload — recommend prioritizing this job</p>
            <p className="text-[11px] text-orange-700 mt-0.5">
              With {servers}, this stage is approaching unstable territory. Accept the suggestion to push this item to the top of the job queue.
            </p>
          </div>
        </div>
      </div>
    );
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
      <div className="flex items-start gap-2">
        <TrendingDown className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-red-800">Stage overloaded — prioritize immediately</p>
          <p className="text-[11px] text-red-700 mt-0.5">
            With {servers}, the queue cannot clear at current rates. Wait time is unbounded. Accepting this suggestion will move this job to the top of the queue.
          </p>
        </div>
      </div>
    </div>
  );
}

function FormulaBlock({
  model,
  analysis,
}: {
  model: Model;
  analysis: ProcessQueueAnalysis;
}) {
  const [expanded, setExpanded] = useState(false);

  const rho = model === "mm1" ? analysis.rho_mm1 : analysis.rho_mm2;
  const wq = model === "mm1" ? analysis.wq_mm1 : analysis.wq_mm2;
  const stable = model === "mm1" ? analysis.stable_mm1 : analysis.stable_mm2;
  const { lambda, mu } = analysis;

  const lambdaF = fmtRate(lambda);
  const muF = fmtRate(mu);
  const rhoF = rho.toFixed(4);

  return (
    <div className="rounded-lg border bg-gray-50 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5" />
          Formula &amp; Calculation
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 text-[11px]">
          {/* λ and μ */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded border px-2 py-1.5">
              <p className="text-gray-400 font-medium">Arrival rate (λ)</p>
              <p className="font-mono font-bold text-gray-800">{lambdaF} jobs/day</p>
            </div>
            <div className="bg-white rounded border px-2 py-1.5">
              <p className="text-gray-400 font-medium">Service rate (μ)</p>
              <p className="font-mono font-bold text-gray-800">{muF} jobs/day</p>
            </div>
          </div>

          {/* ρ formula */}
          <div className="bg-white rounded border px-2 py-1.5">
            <p className="text-gray-400 font-medium mb-1">Server utilization (ρ)</p>
            {model === "mm1" ? (
              <p className="font-mono text-gray-700">
                ρ = λ/μ = {lambdaF}/{muF} = <span className="font-bold text-gray-900">{rhoF}</span>
              </p>
            ) : (
              <p className="font-mono text-gray-700">
                ρ = λ/(2·μ) = {lambdaF}/(2·{muF}) = <span className="font-bold text-gray-900">{rhoF}</span>
              </p>
            )}
          </div>

          {/* Wq formula */}
          <div className="bg-white rounded border px-2 py-1.5">
            <p className="text-gray-400 font-medium mb-1">Avg. wait time in queue (Wq)</p>
            {model === "mm1" ? (
              stable ? (
                <p className="font-mono text-gray-700">
                  Wq = λ/[μ·(μ−λ)] = {lambdaF}/[{muF}·({muF}−{lambdaF})]
                  <br />
                  <span className="font-bold text-orange-700">= {fmtWq(wq)}</span>
                </p>
              ) : (
                <p className="font-mono text-red-600">Unstable (ρ ≥ 1) — Wq → ∞</p>
              )
            ) : stable ? (
              <p className="font-mono text-gray-700">
                Wq = Lq/λ = Erlang-C formula
                <br />
                <span className="font-bold text-orange-700">= {fmtWq(wq)}</span>
              </p>
            ) : (
              <p className="font-mono text-red-600">Unstable (ρ ≥ 1) — Wq → ∞</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProcessQueueDrawer({
  processId,
  itemId,
  processTypeName,
  isOpen,
  onClose,
  readOnly = false,
}: ProcessQueueDrawerProps) {
  const [model, setModel] = useState<Model>("mm1");
  const [analysis, setAnalysis] = useState<ProcessQueueAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [responded, setResponded] = useState<"ACCEPTED" | "REJECTED" | null>(null);
  const [isSaving, startSaving] = useTransition();

  // Fetch analysis lazily when drawer opens
  useEffect(() => {
    if (!isOpen || !processTypeName) return;
    setAnalysis(null);
    setResponded(null);
    setLoading(true);
    getProcessTypeAnalysis(processTypeName).then((result) => {
      setAnalysis(result);
      setLoading(false);
    });
  }, [isOpen, processTypeName]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const rho = analysis ? (model === "mm1" ? analysis.rho_mm1 : analysis.rho_mm2) : 0;
  const wq = analysis ? (model === "mm1" ? analysis.wq_mm1 : analysis.wq_mm2) : null;
  const showActionButtons = !readOnly && analysis && rho >= 0.63 && !responded;

  function handleRespond(response: "ACCEPTED" | "REJECTED") {
    if (!analysis) return;
    startSaving(async () => {
      const result = await respondToQueueSuggestion(
        processId,
        itemId,
        processTypeName,
        response,
        rho
      );
      if ("error" in result) {
        alert(result.error);
      } else {
        setResponded(response);
      }
    });
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-80 max-w-[90vw] bg-white shadow-2xl flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-800 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Queue Analysis</p>
            <h2 className="text-sm font-bold">{processTypeName}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* M/M/1 vs M/M/2 toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(["mm1", "mm2"] as Model[]).map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${
                  model === m
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {m === "mm1" ? "M/M/1 — 1 Server" : "M/M/2 — 2 Servers"}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm">Computing analysis...</span>
            </div>
          )}

          {!loading && analysis && (
            <>
              {/* Insufficient data notice */}
              {analysis.insufficientData && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                  <p className="text-[11px] text-blue-700 font-semibold">
                    ⓘ Based on {analysis.dataDays} day{analysis.dataDays !== 1 ? "s" : ""} of data — accuracy improves after 7 days of activity.
                  </p>
                </div>
              )}

              {/* Key metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border bg-white p-2.5 text-center">
                  <p className="text-[10px] text-gray-400 font-medium leading-tight">Arrivals (λ)</p>
                  <p className="text-sm font-black text-gray-900 mt-0.5">{fmtRate(analysis.lambda)}</p>
                  <p className="text-[9px] text-gray-400">jobs/day</p>
                </div>
                <div className="rounded-lg border bg-white p-2.5 text-center">
                  <p className="text-[10px] text-gray-400 font-medium leading-tight">Throughput (μ)</p>
                  <p className="text-sm font-black text-gray-900 mt-0.5">{fmtRate(analysis.mu)}</p>
                  <p className="text-[9px] text-gray-400">jobs/day</p>
                </div>
                <div className="rounded-lg border bg-white p-2.5 text-center">
                  <p className="text-[10px] text-gray-400 font-medium leading-tight">Utilization (ρ)</p>
                  <div className="mt-0.5">
                    <RhoPill rho={rho} size="sm" />
                  </div>
                </div>
              </div>

              {/* Expected wait */}
              <div className={`rounded-lg border p-3 ${
                wq === null
                  ? "bg-red-50 border-red-200"
                  : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 flex-shrink-0 ${wq === null ? "text-red-500" : "text-slate-500"}`} />
                  <div>
                    <p className={`text-[10px] font-semibold ${wq === null ? "text-red-500" : "text-gray-500"}`}>
                      Expected wait in queue (Wq)
                    </p>
                    <p className={`text-sm font-black ${wq === null ? "text-red-700" : "text-gray-900"}`}>
                      {fmtWq(wq)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Suggestion box */}
              <SuggestionBox rho={rho} model={model} />

              {/* Formula block (collapsible) */}
              <FormulaBlock model={model} analysis={analysis} />

              {/* Accept / Reject (Line Leader only, rho >= 0.63) */}
              {showActionButtons && (
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                    System Recommendation
                  </p>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold h-9"
                      onClick={() => handleRespond("ACCEPTED")}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronUp className="w-3.5 h-3.5 mr-1" />}
                      Accept — Boost Priority
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-xs font-bold h-9 border-gray-300 text-gray-600"
                      onClick={() => handleRespond("REJECTED")}
                      disabled={isSaving}
                    >
                      Reject
                    </Button>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Accepting will raise this item&apos;s priority in the job queue by +500 points.
                  </p>
                </div>
              )}

              {/* Response confirmed */}
              {responded && (
                <div className={`rounded-lg p-3 border ${
                  responded === "ACCEPTED"
                    ? "bg-orange-50 border-orange-200"
                    : "bg-gray-50 border-gray-200"
                }`}>
                  {responded === "ACCEPTED" ? (
                    <p className="text-xs font-bold text-orange-800 flex items-center gap-1.5">
                      <ChevronUp className="w-3.5 h-3.5" />
                      Priority boosted — this item is now ranked higher in the job queue.
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
                      Suggestion rejected and logged.
                    </p>
                  )}
                </div>
              )}

              {/* Read-only notice for admin */}
              {readOnly && rho >= 0.63 && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Admin view — only the Line Leader can accept or reject suggestions.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2.5 bg-gray-50">
          <p className="text-[10px] text-gray-400">
            Based on last 7 days of ProcessUpdate records · M/M/1 &amp; M/M/2 queuing theory
          </p>
        </div>
      </div>
    </>
  );
}
