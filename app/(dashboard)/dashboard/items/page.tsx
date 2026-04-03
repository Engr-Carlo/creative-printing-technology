import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Package, Clock, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
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
      <div className="bg-white border-b px-5 py-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Quality Assurance</p>
            <h1 className="text-xl font-black mt-0.5 text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              QA Release Center
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Review items and release raw materials — give line leaders the go signal</p>
          </div>
          <QuickGenerateButton />
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Pending",     value: pending,    bg: "bg-amber-400"  },
            { label: "In Progress", value: inProgress, bg: "bg-orange-500" },
            { label: "Completed",   value: completed,  bg: "bg-green-500"  },
            { label: "Rejected",    value: rejected,   bg: "bg-red-500"    },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl px-3 py-2 ${s.bg}`}>
              <p className="text-[9px] uppercase tracking-widest text-white/70 font-bold">{s.label}</p>
              <p className="text-xl font-black text-white">{s.value}</p>
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
