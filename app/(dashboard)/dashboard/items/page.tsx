import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Package, Clock, CheckCircle2, AlertCircle, FolderOpen } from "lucide-react";
import prisma from "@/lib/prisma";
import { QuickGenerateButton } from "@/components/QuickGenerateButton";
import { ItemsClient } from "@/components/ItemsClient";

async function getItems() {
  return prisma.item.findMany({
    select: {
      id: true,
      itemNumber: true,
      name: true,
      type: true,
      status: true,
      currentOutput: true,
      targetOutput: true,
      rawMaterials: true,
      department: { select: { name: true } },
      processes: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export default async function ItemsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role !== "ADMIN" && session.user.role !== "ENCODER") {
    redirect("/dashboard");
  }

  const items = await getItems();
  const isAdmin = session.user.role === "ADMIN";

  const pending    = items.filter((i) => i.status === "PENDING").length;
  const inProgress = items.filter((i) => i.status === "IN_PROGRESS").length;
  const completed  = items.filter((i) => i.status === "COMPLETED").length;
  const rejected   = items.filter((i) => (i as any).status === "REJECTED").length;

  return (
    <div className="min-h-full bg-gray-50">

      {/* ── Management Header ── */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white px-5 py-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Item Management</p>
            <h1 className="text-xl font-black mt-0.5 flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Items Workspace
            </h1>
            <p className="text-xs text-indigo-300 mt-0.5">Create, search, filter and manage all production jobs</p>
          </div>
          <QuickGenerateButton />
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Pending",     value: pending,    num: "text-yellow-300", bg: "bg-yellow-500/20 border-yellow-400/30" },
            { label: "In Progress", value: inProgress, num: "text-orange-300", bg: "bg-orange-500/20 border-orange-400/30" },
            { label: "Completed",   value: completed,  num: "text-green-300",  bg: "bg-green-500/20  border-green-400/30"  },
            { label: "Rejected",    value: rejected,   num: "text-red-300",    bg: "bg-red-500/20    border-red-400/30"    },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border px-3 py-2 ${s.bg}`}>
              <p className="text-[9px] uppercase tracking-widest text-indigo-300 font-bold">{s.label}</p>
              <p className={`text-xl font-black ${s.num}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Client-side search + filter + table ── */}
      <div className="p-4">
        <ItemsClient items={items as any} isAdmin={isAdmin} />
      </div>

    </div>
  );
}
