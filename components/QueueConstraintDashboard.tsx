"use client";

import { useState, useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { getDashboardAnalysis, type StageAnalysis } from "@/app/actions/queue-analysis";

// ─── Types & colour helpers ───────────────────────────────────────────────────

type Model = "mm1" | "mm2";

function rhoClass(rho: number): "green" | "yellow" | "orange" | "red" {
  if (rho < 0.5)   return "green";
  if (rho <= 0.63) return "yellow";
  if (rho < 1)     return "orange";
  return "red";
}

const CLS: Record<string, { pill: string; dot: string; spark: string; label: string }> = {
  green:  { pill: "bg-green-100 text-green-800 border border-green-200",  dot: "bg-green-500",  spark: "#22c55e", label: "Under-utilized" },
  yellow: { pill: "bg-yellow-100 text-yellow-800 border border-yellow-200", dot: "bg-yellow-400", spark: "#eab308", label: "Stable"          },
  orange: { pill: "bg-orange-100 text-orange-800 border border-orange-200", dot: "bg-orange-500",  spark: "#f97316", label: "Near limit"     },
  red:    { pill: "bg-red-100 text-red-800 border border-red-200",         dot: "bg-red-500",   spark: "#ef4444", label: "Unstable"        },
};

// ─── Inline SVG Sparkline ─────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const hasData = data.some((v) => v > 0);
  if (!hasData) {
    return (
      <div className="w-20 h-7 flex items-center">
        <span className="text-[10px] text-gray-300">—</span>
      </div>
    );
  }
  const W = 80, H = 28, P = 2;
  const nonZero = data.filter((v) => v > 0);
  const minV  = Math.max(0, Math.min(...nonZero) - 0.05);
  const maxV  = Math.max(...nonZero) + 0.05;
  const range = maxV - minV || 0.1;
  const n     = Math.max(data.length - 1, 1);
  const toX   = (i: number) => P + (i / n) * (W - P * 2);
  const toY   = (v: number) => H - P - ((v - minV) / range) * (H - P * 2);
  const pts   = data.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const lx    = toX(data.length - 1);
  const ly    = toY(data[data.length - 1]);
  return (
    <svg width={W} height={H} className="block">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lx.toFixed(1)} cy={ly.toFixed(1)} r={2.5} fill={color} />
    </svg>
  );
}

// ─── Bar chart tooltip ────────────────────────────────────────────────────────

function BarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 text-xs min-w-[200px] z-50">
      <p className="font-bold text-gray-900 mb-1.5">{d.processTypeName}</p>
      <p className="text-gray-500 mb-2">
        λ&nbsp;=&nbsp;{d.lambda.toFixed(2)}&nbsp;·&nbsp;μ&nbsp;=&nbsp;{d.mu.toFixed(2)}&nbsp;jobs/day
      </p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: "#FF5722" }} />
          <span>M/M/1:&nbsp;ρ&nbsp;=&nbsp;<span className="font-semibold">{d.mm1.toFixed(2)}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: "#3b82f6" }} />
          <span>M/M/2:&nbsp;ρ&nbsp;=&nbsp;<span className="font-semibold">{d.mm2.toFixed(2)}</span></span>
        </div>
      </div>
    </div>
  );
}

// ─── Threshold reference label ────────────────────────────────────────────────

function ThresholdLabel({ viewBox }: any) {
  if (!viewBox) return null;
  return (
    <text
      x={(viewBox.x ?? 0) + (viewBox.width ?? 0) - 4}
      y={(viewBox.y ?? 0) - 5}
      textAnchor="end"
      fill="#ef4444"
      fontSize={10}
    >
      ρ = 0.63 stability threshold
    </text>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  initialData: StageAnalysis[];
  initialWindowDays: number;
}

export function QueueConstraintDashboard({ initialData, initialWindowDays }: Props) {
  const [data, setData]               = useState<StageAnalysis[]>(initialData);
  const [model, setModel]             = useState<Model>("mm1");
  const [windowDays, setWindowDays]   = useState(initialWindowDays);
  const [onlyUnstable, setOnlyUnstable] = useState(false);
  const [isPending, startTransition]  = useTransition();

  function handleWindowChange(days: number) {
    setWindowDays(days);
    startTransition(async () => {
      const fresh = await getDashboardAnalysis(days);
      setData(fresh);
    });
  }

  // Model-aware accessors
  const getRho    = (s: StageAnalysis) => model === "mm1" ? s.rho_mm1 : s.rho_mm2;
  const getSpark  = (s: StageAnalysis) => model === "mm1" ? s.sparkMm1 : s.sparkMm2;
  const getAction = (s: StageAnalysis) => model === "mm1" ? s.actionMm1 : s.actionMm2;
  // Display μ: per-server for M/M/1, total capacity (2×μ) for M/M/2 — matches reference design
  const getMuDisplay = (s: StageAnalysis) => model === "mm1" ? s.mu : 2 * s.mu;

  const displayed      = onlyUnstable ? data.filter((s) => getRho(s) > 0.63) : data;
  const unstableStages = data.filter((s) => getRho(s) > 0.63).sort((a, b) => getRho(b) - getRho(a));
  const bottleneck     = [...data].sort((a, b) => getRho(b) - getRho(a))[0];
  const hasBottleneck  = !!bottleneck && getRho(bottleneck) > 0.63;

  // Bar chart dataset — always shows both models side-by-side
  const chartData = data.map((s) => ({
    name:            s.processTypeName === "Pre-Fold/Inspection" ? "Pre-Fold" : s.processTypeName,
    processTypeName: s.processTypeName,
    lambda:          s.lambda,
    mu:              s.mu,
    mm1:             parseFloat(s.rho_mm1.toFixed(3)),
    mm2:             parseFloat(s.rho_mm2.toFixed(3)),
  }));

  return (
    <div className="space-y-4">

      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-900">
            Production Queuing Constraint Dashboard
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            M/M/1 &amp; M/M/2 utilization analysis — last {windowDays} days
          </p>
        </div>
        {hasBottleneck ? (
          <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-medium px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
            Primary bottleneck: {bottleneck.processTypeName} (ρ = {getRho(bottleneck).toFixed(2)})
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 text-xs font-medium px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            All stages within stable range
          </span>
        )}
      </div>

      {/* ── Controls ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {/* M/M/1 vs M/M/2 toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Model:</span>
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {(["mm1", "mm2"] as Model[]).map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
                  model === m
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {m === "mm1" ? "M/M/1" : "M/M/2"}
              </button>
            ))}
          </div>
        </div>

        {/* Unstable-only filter */}
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-3.5 h-3.5 rounded accent-orange-500"
            checked={onlyUnstable}
            onChange={(e) => setOnlyUnstable(e.target.checked)}
          />
          Show only unstable stages
        </label>

        {/* Time window */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span>Time window:</span>
          <select
            className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-300"
            value={windowDays}
            onChange={(e) => handleWindowChange(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>

        {isPending && (
          <span className="flex items-center gap-1 text-xs text-orange-500">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Updating…
          </span>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-[11px] font-medium text-gray-400 px-4 py-2.5 whitespace-nowrap">Stage</th>
                <th className="text-left text-[11px] font-medium text-gray-400 px-4 py-2.5 whitespace-nowrap">λ (jobs/day)</th>
                <th className="text-left text-[11px] font-medium text-gray-400 px-4 py-2.5 whitespace-nowrap">μ (jobs/day)</th>
                <th className="text-left text-[11px] font-medium text-gray-400 px-4 py-2.5 whitespace-nowrap">ρ = λ/μ</th>
                <th className="text-left text-[11px] font-medium text-gray-400 px-4 py-2.5">Color</th>
                <th className="text-left text-[11px] font-medium text-gray-400 px-4 py-2.5 whitespace-nowrap">Stability (ρ &lt; 1?)</th>
                <th className="text-left text-[11px] font-medium text-gray-400 px-4 py-2.5 whitespace-nowrap">Sparkline ({windowDays}d)</th>
                <th className="text-left text-[11px] font-medium text-gray-400 px-4 py-2.5 whitespace-nowrap">Recommended action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-xs text-gray-400 py-8">
                    No unstable stages — all processes are within stable range.
                  </td>
                </tr>
              )}
              {displayed.map((s) => {
                const rho    = getRho(s);
                const col    = rhoClass(rho);
                const cm     = CLS[col];
                const stable = rho < 1;
                return (
                  <tr key={s.processTypeName} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{s.processTypeName}</span>
                        {s.insufficientData && (
                          <span
                            title="Insufficient data — metrics may be inaccurate"
                            className="text-[9px] text-gray-400 border border-gray-200 rounded px-1 py-px leading-none"
                          >
                            low data
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-sm">{s.lambda.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-700 text-sm">{getMuDisplay(s).toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-800">{rho.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cm.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cm.dot}`} />
                        {cm.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-base">
                      {stable
                        ? <span className="text-green-600 font-bold">✔</span>
                        : <span className="text-red-500 font-bold">✖</span>
                      }
                    </td>
                    <td className="px-4 py-2.5">
                      <Sparkline data={getSpark(s)} color={cm.spark} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] leading-relaxed">
                      {getAction(s)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bar chart ────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Utilization by Stage — M/M/1 vs M/M/2
        </p>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#FF5722" }} />
            M/M/1 utilization
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#3b82f6" }} />
            M/M/2 utilization
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block bg-red-400" />
            Stability threshold ρ = 0.63
          </span>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 8, right: 20, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 2]}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <ReferenceLine
              y={0.63}
              stroke="#ef4444"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={<ThresholdLabel />}
            />
            <Tooltip content={<BarTooltip />} />
            <Bar dataKey="mm1" name="M/M/1" fill="#FF5722" radius={4} maxBarSize={28} />
            <Bar dataKey="mm2" name="M/M/2" fill="#3b82f6" radius={4} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Alert panel ──────────────────────────────────────────────────────── */}
      {unstableStages.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3.5">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">All stages within stable range — no immediate action required.</span>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
            <span className="text-sm font-semibold text-red-800">
              Alert — {unstableStages.length} stage{unstableStages.length > 1 ? "s" : ""} require{unstableStages.length === 1 ? "s" : ""} immediate attention
            </span>
          </div>
          <div className="space-y-2">
            {unstableStages.map((s) => (
              <div
                key={s.processTypeName}
                className="flex items-center justify-between flex-wrap gap-2 bg-white border border-red-200 rounded-lg px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold text-red-800">{s.processTypeName}</p>
                  <p className="text-xs text-red-600">
                    ρ = {getRho(s).toFixed(2)} — exceeds stability threshold (0.63)
                  </p>
                </div>
                <span className="text-xs font-semibold text-white bg-red-500 px-2.5 py-1 rounded-md whitespace-nowrap">
                  {getAction(s).split("—")[0].trim()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
