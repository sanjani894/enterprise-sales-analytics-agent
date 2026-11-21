import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { BarChart3, TrendingUp, PieChart as PieIcon } from "lucide-react";

const DEFAULT_COLORS = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
  "#06b6d4", "#ec4899", "#6366f1", "#14b8a6"
];

export default function DynamicChartRenderer({ chart }) {
  if (!chart || !chart.data || chart.data.length === 0) {
    return null;
  }

  const { type, title, xAxisKey, dataKeys = [], data, colors = DEFAULT_COLORS, nameKey, dataKey } = chart;

  return (
    <div
      style={{
        marginTop: 12,
        padding: 16,
        borderRadius: "var(--radius-md)",
        background: "#0d1322",
        border: "1px solid var(--border-default)",
        width: "100%",
      }}
    >
      {/* Chart Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        {type === "bar" && <BarChart3 size={15} color="var(--accent-primary)" />}
        {type === "line" && <TrendingUp size={15} color="var(--accent-success)" />}
        {type === "area" && <TrendingUp size={15} color="var(--accent-primary)" />}
        {type === "pie" && <PieIcon size={15} color="var(--accent-purple)" />}
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          {title || "Query Visualization"}
        </span>
      </div>

      <div style={{ height: 260, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          {/* BAR CHART */}
          {type === "bar" && (
            <BarChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey={xAxisKey}
                stroke="#64748b"
                fontSize={11}
                angle={-15}
                textAnchor="end"
                interval={0}
              />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderColor: "#334155",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              {dataKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {dataKeys.map((key, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[idx % colors.length]}
                  radius={[4, 4, 0, 0]}
                  name={key.replace("_", " ").toUpperCase()}
                />
              ))}
            </BarChart>
          )}

          {/* LINE CHART */}
          {type === "line" && (
            <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey={xAxisKey}
                stroke="#64748b"
                fontSize={11}
                angle={-15}
                textAnchor="end"
              />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderColor: "#334155",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              {dataKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {dataKeys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name={key.replace("_", " ").toUpperCase()}
                />
              ))}
            </LineChart>
          )}

          {/* AREA CHART */}
          {type === "area" && (
            <AreaChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
              <defs>
                <linearGradient id="dynAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[0] || "#3b82f6"} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={colors[0] || "#3b82f6"} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey={xAxisKey} stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderColor: "#334155",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              {dataKeys.map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[0] || "#3b82f6"}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#dynAreaGrad)"
                  name={key.replace("_", " ").toUpperCase()}
                />
              ))}
            </AreaChart>
          )}

          {/* PIE CHART */}
          {type === "pie" && (
            <PieChart margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderColor: "#334155",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Pie
                data={data}
                dataKey={dataKey || "value"}
                nameKey={nameKey || "name"}
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

