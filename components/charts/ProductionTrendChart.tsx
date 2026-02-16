"use client";

import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ProductionData = {
  date: string;
  completed: number;
  inProgress: number;
  pending: number;
};

export function ProductionTrendChart({ data }: { data: ProductionData[] }) {
  return (
    <Card className="border h-full">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs font-semibold">Production Status</CardTitle>
        <CardDescription className="text-[10px]">Current production breakdown</CardDescription>
      </CardHeader>
      <CardContent className="p-2">
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis  tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line 
              type="monotone" 
              dataKey="completed" 
              stroke="#22c55e" 
              strokeWidth={2}
              name="Completed" 
            />
            <Line 
              type="monotone" 
              dataKey="inProgress" 
              stroke="#f97316" 
              strokeWidth={2}
              name="In Progress" 
            />
            <Line 
              type="monotone" 
              dataKey="pending" 
              stroke="#eab308" 
              strokeWidth={2}
              name="Pending" 
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
