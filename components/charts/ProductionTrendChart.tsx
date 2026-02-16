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
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Production Trends</CardTitle>
        <CardDescription>Daily production status over the last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
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
