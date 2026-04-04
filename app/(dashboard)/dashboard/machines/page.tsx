import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Cpu } from "lucide-react";
import { getMachinesData } from "@/app/actions/machines";
import { MachinesClient } from "@/components/MachinesClient";

export default async function MachinesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as any).role;
  if (role === "ENCODER") redirect("/dashboard/encoder");

  const machines = await getMachinesData();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <Cpu className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">Production Floor</p>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Machine Monitor</h1>
        </div>
      </div>
      <MachinesClient
        machines={machines}
        isAdmin={role === "ADMIN"}
      />
    </div>
  );
}
