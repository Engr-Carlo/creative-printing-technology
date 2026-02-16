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
    <Card className="border-2">
      <CardHeader>
        <CardTitle>{title || "Item Distribution"}</CardTitle>
        <CardDescription>Breakdown by department or category</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
              label
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.name as keyof typeof COLORS] || "#94a3b8"} 
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
