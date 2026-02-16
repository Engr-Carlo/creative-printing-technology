"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DistributionData = {
  name: string;
  value: number;
};

const COLORS = {
  CARDBOARD: "#f97316",    // orange
  MANUAL: "#22c55e",       // green
  LABEL: "#3b82f6",        // blue
  BOOKBIND: "#a855f7",     // purple
  OTHER_ITEMS: "#eab308",  // yellow
};

export function ItemDistributionChart({ data, title }: { data: DistributionData[]; title?: string }) {
  return (
    <Card className="border h-full">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs font-semibold">{title || "Item Distribution"}</CardTitle>
        <CardDescription className="text-[10px]">By department</CardDescription>
      </CardHeader>
      <CardContent className="p-2">
        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              fill="#8884d8"
              paddingAngle={3}
              dataKey="value"
              label={(entry) => entry.value > 0 ? entry.value : ''}
              labelStyle={{ fontSize: 10 }}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.name as keyof typeof COLORS] || "#94a3b8"} 
                />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
