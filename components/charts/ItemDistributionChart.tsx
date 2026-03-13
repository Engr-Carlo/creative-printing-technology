"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type DistributionData = {
  name: string;
  value: number;
};

const COLORS: Record<string, string> = {
  Cardboard: "#f97316",
  Manual: "#22c55e",
  Label: "#3b82f6",
  Bookbind: "#a855f7",
  "Other Items": "#eab308",
};

const FALLBACK_COLORS = ["#f97316", "#22c55e", "#3b82f6", "#a855f7", "#eab308", "#06b6d4"];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700">{name}</p>
      <p className="text-gray-500 mt-0.5">
        <span className="font-bold text-gray-900">{value}</span> items
      </p>
    </div>
  );
};

const RADIAN = Math.PI / 180;
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }: any) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {value}
    </text>
  );
};

export function ItemDistributionChart({ data, title }: { data: DistributionData[]; title?: string }) {
  const filtered = data.filter((d) => d.value > 0);

  return (
    <div className="flex flex-col gap-4 h-full">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={filtered}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={105}
            paddingAngle={3}
            dataKey="value"
            labelLine={false}
            label={renderLabel}
          >
            {filtered.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                stroke="none"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Custom legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {filtered.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORS[entry.name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length] }}
            />
            <span className="text-gray-600">{entry.name}</span>
            <span className="font-semibold text-gray-900">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
