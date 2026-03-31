import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Package, Clock, CheckCircle2, XCircle, AlertTriangle, Flame, CalendarClock, Layers, ArrowRight, TrendingUp, Activity } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { NextJobBanner } from "@/components/analytics/NextJobBanner";

async function getDashboardData() {
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 86_400_000);

  const items = await prisma.item.findMany({
    select: {
      id: true,
      name: true,
      itemNumber: true,
      status: true,
      type: true,
      targetOutput: true,
      currentOutput: true,
      deadline: true,
      customer: true,
      createdAt: true,
      processes: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const total       = items.length;
  const pending     = items.filter((i) => i.status === "PENDING").length;
  const inProgress  = items.filter((i) => i.status === "IN_PROGRESS").length;
  const completed   = items.filter((i) => i.status === "COMPLETED").length;
  const rejected    = items.filter((i) => i.status === "REJECTED").length;

  // Deadline alerts — active jobs due within 3 days
  const urgent = items
    .filter((i) => i.status !== "COMPLETED" && i.status !== "REJECTED" && new Date(i.deadline) <= in3Days)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 6);

  // Type breakdown for active items only
  const active = items.filter((i) => i.status !== "COMPLETED" && i.status !== "REJECTED");
  const byType = {
    SHEETED:  active.filter((i) => i.type === "SHEETED").length,
    FOLDED:   active.filter((i) => i.type === "FOLDED").length,
    STITCHING:active.filter((i) => i.type === "STITCHING").length,
  };

  // Overall process health
  const allProc = items.flatMap((i) => i.processes);
  const doneProc = allProc.filter((p) => p.status === "COMPLETED").length;

  // Recently updated (last 8)
  const recentActivity = items.slice(0, 8);

  return { total, pending, inProgress, completed, rejected, urgent, byType, allProc: allProc.length, doneProc, recentActivity };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userRole = session.user.role;
  if (userRole === "ENCODER") redirect("/dashboard/encoder");
  if (userRole === "EMPLOYEE") redirect("/dashboard/employee");

  const { total, pending, inProgress, completed, rejected, urgent, byType, allProc, doneProc, recentActivity } = await getDashboardData();
  const procPct = allProc > 0 ? Math.round((doneProc / allProc) * 100) : 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="min-h-full bg-gray-50">

      {/* ── Command Center Header ── */}
      <div className="bg-gradient-to-br from-primary to-orange-600 text-white px-5 py-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-100">Production Command Center</p>
            <h1 className="text-xl font-black mt-0.5">Dashboard Overview</h1>
            <p className="text-xs text-orange-100 mt-0.5">Real-time production monitoring</p>
          </div>
          <Link
            href="/dashboard/items"
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
          >
            Manage Items <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Big stat pills */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: "Total",      value: total,      color: "bg-white/20 border-white/30",            num: "text-white"      },
            { label: "Pending",    value: pending,    color: "bg-yellow-500/20 border-yellow-400/40",  num: "text-yellow-200" },
            { label: "In Progress",value: inProgress, color: "bg-white/10    border-white/20",         num: "text-white"      },
            { label: "Completed",  value: completed,  color: "bg-green-500/20  border-green-400/40",  num: "text-green-200"  },
            { label: "Rejected",   value: rejected,   color: "bg-red-500/20    border-red-400/40",    num: "text-red-200"    },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border px-3 py-2.5 ${s.color}`}>
              <p className="text-[9px] uppercase tracking-widest text-orange-100 font-bold">{s.label}</p>
              <p className={`text-2xl font-black ${s.num}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* ── Next Job Banner ── */}
        <NextJobBanner />

        {/* ── Two-column row: pipeline + process health ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Production Pipeline */}
          <div className="bg-white rounded-2xl border p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-slate-600" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-600">Production Pipeline</h2>
            </div>
            {[
              { label: "Pending",     value: pending,    max: total, bar: "bg-yellow-400", text: "text-yellow-600" },
              { label: "In Progress", value: inProgress, max: total, bar: "bg-orange-500", text: "text-orange-600" },
              { label: "Completed",   value: completed,  max: total, bar: "bg-green-500",  text: "text-green-600"  },
              { label: "Rejected",    value: rejected,   max: total, bar: "bg-red-400",    text: "text-red-500"    },
            ].map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-medium">{row.label}</span>
                  <span className={`font-bold ${row.text}`}>{row.value} <span className="text-gray-400 font-normal">/ {row.max}</span></span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${row.bar}`}
                    style={{ width: row.max > 0 ? `${Math.round((row.value / row.max) * 100)}%` : "0%" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Process Health + Type Breakdown */}
          <div className="space-y-4">
            {/* Process Health */}
            <div className="bg-white rounded-2xl border p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-slate-600" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-600">Process Health</h2>
              </div>
              <div className="flex items-center gap-4">
                {/* Ring */}
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke={procPct >= 80 ? "#22c55e" : procPct >= 50 ? "#f97316" : "#eab308"}
                      strokeWidth="3.5"
                      strokeDasharray={`${procPct} ${100 - procPct}`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-black text-gray-800">{procPct}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900">{doneProc}<span className="text-sm font-normal text-gray-400">/{allProc}</span></p>
                  <p className="text-xs text-gray-400">processes completed</p>
                  <p className="text-xs text-gray-400 mt-0.5">Item completion rate: <span className="font-bold text-green-600">{completionRate}%</span></p>
                </div>
              </div>
            </div>

            {/* Type Breakdown */}
            <div className="bg-white rounded-2xl border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-slate-600" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-600">Active Jobs by Type</h2>
              </div>
              <div className="flex gap-2">
                {[
                  { label: "Sheeted",  value: byType.SHEETED,   color: "bg-blue-500",    light: "bg-blue-50 border-blue-200 text-blue-700" },
                  { label: "Folded",   value: byType.FOLDED,    color: "bg-emerald-500", light: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                  { label: "Stitching",value: byType.STITCHING, color: "bg-purple-500",  light: "bg-purple-50 border-purple-200 text-purple-700" },
                ].map((t) => (
                  <div key={t.label} className={`flex-1 rounded-xl border text-center py-3 ${t.light}`}>
                    <p className="text-xl font-black">{t.value}</p>
                    <p className="text-[10px] font-semibold mt-0.5">{t.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Deadline Alerts ── */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-red-50">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-red-500" />
              <h2 className="text-xs font-black uppercase tracking-wider text-red-600">Deadline Alerts</h2>
              <span className="text-[10px] text-red-400">— active jobs due within 72 hours</span>
            </div>
            {urgent.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{urgent.length} urgent</span>
            )}
          </div>
          {urgent.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-400 text-sm">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              No deadlines within the next 3 days — all clear!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
              {urgent.map((item) => {
                const msLeft = new Date(item.deadline).getTime() - Date.now();
                const hoursLeft = Math.max(0, Math.floor(msLeft / 3_600_000));
                const isOverdue = msLeft < 0;
                const isCritical = hoursLeft < 6;
                const doneP = item.processes.filter((p) => p.status === "COMPLETED").length;
                const totalP = item.processes.length;
                const pct = totalP > 0 ? Math.round((doneP / totalP) * 100) : 0;

                return (
                  <Link key={item.id} href={`/dashboard/items/${item.id}`}>
                    <div className={`rounded-xl border-2 p-3 hover:shadow-md transition-all cursor-pointer ${
                      isOverdue    ? "border-red-500 bg-red-50" :
                      isCritical   ? "border-orange-400 bg-orange-50" :
                                     "border-yellow-300 bg-yellow-50"
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          {isOverdue ? <Flame className="w-3.5 h-3.5 text-red-600 flex-shrink-0" /> :
                           isCritical ? <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" /> :
                                        <Clock className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0" />}
                          <span className={`text-[10px] font-bold ${isOverdue ? "text-red-700" : isCritical ? "text-orange-600" : "text-yellow-700"}`}>
                            {isOverdue ? "OVERDUE" : `${hoursLeft}h left`}
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          item.type === "SHEETED"   ? "bg-blue-100 text-blue-700" :
                          item.type === "FOLDED"    ? "bg-emerald-100 text-emerald-700" :
                                                      "bg-purple-100 text-purple-700"
                        }`}>{item.type}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 leading-tight truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{item.itemNumber} · {item.customer}</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-500">
                          <span>Progress</span>
                          <span className="font-bold">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct === 100 ? "bg-green-500" : isCritical ? "bg-orange-500" : "bg-yellow-500"}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Recent Activity Feed ── */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-600">Recent Activity</h2>
            </div>
            <Link href="/dashboard/items" className="text-[10px] text-orange-500 font-bold hover:underline flex items-center gap-1">
              View all items <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y">
            {recentActivity.map((item) => {
              const doneP = item.processes.filter((p) => p.status === "COMPLETED").length;
              const totalP = item.processes.length;
              const pct = totalP > 0 ? Math.round((doneP / totalP) * 100) : 0;
              const statusColor =
                item.status === "COMPLETED"  ? "bg-green-100 text-green-700" :
                item.status === "IN_PROGRESS"? "bg-blue-100  text-blue-700"  :
                item.status === "REJECTED"   ? "bg-red-100   text-red-700"   :
                                               "bg-yellow-100 text-yellow-700";
              return (
                <Link key={item.id} href={`/dashboard/items/${item.id}`}>
                  <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[9px] font-black ${
                      item.type === "SHEETED"   ? "bg-blue-100 text-blue-700" :
                      item.type === "FOLDED"    ? "bg-emerald-100 text-emerald-700" :
                                                  "bg-purple-100 text-purple-700"
                    }`}>{item.type.slice(0, 2)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{item.itemNumber} · {item.customer}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="hidden sm:flex items-center gap-1.5">
                        <div className="w-14 bg-gray-100 rounded-full h-1">
                          <div className="h-1 rounded-full bg-orange-400" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-400">{pct}%</span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                        {item.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
