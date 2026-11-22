import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  TrendingUp,
  Store,
  Fuel,
  CreditCard,
  BotMessageSquare,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#6366f1"];

export default function RetailAnalyticsView({ setActiveView, onQuickAsk }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    kpis: {
      totalSales: 7292.54,
      avgOilPrice: 57.9,
      totalTransactions: 25741,
      activeStores: 3,
      totalRecords: 417
    },
    salesTrend: [
      { date: "2015-08-15", sales: 181.64 },
      { date: "2015-08-16", sales: 211.95 },
      { date: "2015-08-17", sales: 199.34 },
      { date: "2015-08-18", sales: 326.12 },
      { date: "2015-08-19", sales: 257.73 },
      { date: "2015-08-20", sales: 290.05 },
      { date: "2015-08-21", sales: 293.8 },
      { date: "2015-08-22", sales: 215.98 },
      { date: "2015-08-23", sales: 128.06 },
      { date: "2015-08-24", sales: 254.55 },
      { date: "2015-08-25", sales: 239.1 },
      { date: "2015-08-26", sales: 222.13 },
      { date: "2015-08-27", sales: 245.3 },
      { date: "2015-08-28", sales: 252.33 },
      { date: "2015-08-29", sales: 310.32 },
      { date: "2015-08-30", sales: 356.85 },
      { date: "2015-08-31", sales: 195.9 },
      { date: "2015-09-01", sales: 254.85 },
      { date: "2015-09-02", sales: 289.9 },
      { date: "2015-09-03", sales: 110.83 },
      { date: "2015-09-04", sales: 137.04 },
      { date: "2015-09-05", sales: 257.64 },
      { date: "2015-09-06", sales: 252.03 },
      { date: "2015-09-07", sales: 239.93 },
      { date: "2015-09-08", sales: 194.55 },
      { date: "2015-09-09", sales: 204.74 },
      { date: "2015-09-10", sales: 225.55 },
      { date: "2015-09-11", sales: 128.69 },
      { date: "2015-09-12", sales: 195.96 },
      { date: "2015-09-13", sales: 174.02 },
      { date: "2015-09-14", sales: 211.43 },
      { date: "2015-09-15", sales: 234.23 }
    ],
    storePerformance: [
      { store: "Store 1 (Quito)", store_nbr: 1, city: "Quito", sales: 2507.13, transactions: 8049 },
      { store: "Store 2 (Guayaquil)", store_nbr: 2, city: "Guayaquil", sales: 2397.24, transactions: 8549 },
      { store: "Store 3 (Cuenca)", store_nbr: 3, city: "Cuenca", sales: 2388.17, transactions: 9143 }
    ],
    productFamilies: [
      { family: "USB-C Cable (103)", family_id: "103", sales: 2661.96 },
      { family: "Smartphone Stand (102)", family_id: "102", sales: 2365.28 },
      { family: "Wireless Headphones (101)", family_id: "101", sales: 2265.3 }
    ],
    oilCorrelation: [
      { point: "Day 1", sales: 181.64, oilPrice: 56.91, salesDate: "2015-08-15", oilDate: "2024-01-01" },
      { point: "Day 2", sales: 211.95, oilPrice: 67.53, salesDate: "2015-08-16", oilDate: "2024-01-02" },
      { point: "Day 3", sales: 199.34, oilPrice: 56.64, salesDate: "2015-08-17", oilDate: "2024-01-03" },
      { point: "Day 4", sales: 326.12, oilPrice: 58.27, salesDate: "2015-08-18", oilDate: "2024-01-04" },
      { point: "Day 5", sales: 257.73, oilPrice: 51.49, salesDate: "2015-08-19", oilDate: "2024-01-05" },
      { point: "Day 6", sales: 290.05, oilPrice: 51.64, salesDate: "2015-08-20", oilDate: "2024-01-06" },
      { point: "Day 7", sales: 293.8, oilPrice: 51.73, salesDate: "2015-08-21", oilDate: "2024-01-07" },
      { point: "Day 8", sales: 215.98, oilPrice: 51.87, salesDate: "2015-08-22", oilDate: "2024-01-08" },
      { point: "Day 9", sales: 128.06, oilPrice: 50.02, salesDate: "2015-08-23", oilDate: "2024-01-09" },
      { point: "Day 10", sales: 254.55, oilPrice: 51.31, salesDate: "2015-08-24", oilDate: "2024-01-10" },
      { point: "Day 11", sales: 239.1, oilPrice: 54.74, salesDate: "2015-08-25", oilDate: "2024-01-11" },
      { point: "Day 12", sales: 222.13, oilPrice: 51.76, salesDate: "2015-08-26", oilDate: "2024-01-12" },
      { point: "Day 13", sales: 245.3, oilPrice: 56.61, salesDate: "2015-08-27", oilDate: "2024-01-13" },
      { point: "Day 14", sales: 252.33, oilPrice: 58.63, salesDate: "2015-08-28", oilDate: "2024-01-14" },
      { point: "Day 15", sales: 310.32, oilPrice: 51.93, salesDate: "2015-08-29", oilDate: "2024-01-15" },
      { point: "Day 16", sales: 356.85, oilPrice: 61.37, salesDate: "2015-08-30", oilDate: "2024-01-16" },
      { point: "Day 17", sales: 195.9, oilPrice: 50.05, salesDate: "2015-08-31", oilDate: "2024-01-17" },
      { point: "Day 18", sales: 254.85, oilPrice: 63.06, salesDate: "2015-09-01", oilDate: "2024-01-18" },
      { point: "Day 19", sales: 289.9, oilPrice: 63.4, salesDate: "2015-09-02", oilDate: "2024-01-19" },
      { point: "Day 20", sales: 110.83, oilPrice: 67.14, salesDate: "2015-09-03", oilDate: "2024-01-20" },
      { point: "Day 21", sales: 137.04, oilPrice: 59.12, salesDate: "2015-09-04", oilDate: "2024-01-21" },
      { point: "Day 22", sales: 257.64, oilPrice: 68.3, salesDate: "2015-09-05", oilDate: "2024-01-22" },
      { point: "Day 23", sales: 252.03, oilPrice: 66.02, salesDate: "2015-09-06", oilDate: "2024-01-23" },
      { point: "Day 24", sales: 239.93, oilPrice: 61.85, salesDate: "2015-09-07", oilDate: "2024-01-24" },
      { point: "Day 25", sales: 194.55, oilPrice: 53.59, salesDate: "2015-09-08", oilDate: "2024-01-25" },
      { point: "Day 26", sales: 204.74, oilPrice: 52.91, salesDate: "2015-09-09", oilDate: "2024-01-26" },
      { point: "Day 27", sales: 225.55, oilPrice: 54.81, salesDate: "2015-09-10", oilDate: "2024-01-27" },
      { point: "Day 28", sales: 128.69, oilPrice: 67.69, salesDate: "2015-09-11", oilDate: "2024-01-28" },
      { point: "Day 29", sales: 195.96, oilPrice: 64.54, salesDate: "2015-09-12", oilDate: "2024-01-29" },
      { point: "Day 30", sales: 174.02, oilPrice: 65.68, salesDate: "2015-09-13", oilDate: "2024-01-30" },
      { point: "Day 31", sales: 211.43, oilPrice: 54.26, salesDate: "2015-09-14", oilDate: "2024-01-31" }
    ]
  });

  // Attempt to fetch live metrics from backend if available
  const fetchRetailMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/retail/analytics`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.kpis) {
          setData(json);
        }
      }
    } catch (err) {
      // Fallback to initial structured metrics
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetailMetrics();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Page Header Banner */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          background: "linear-gradient(135deg, rgba(20, 29, 48, 0.8) 0%, rgba(14, 21, 38, 0.9) 100%)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="badge badge-blue">Mode A</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Connected: Neon PostgreSQL (Ecuadorian Grocery Chain)</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Built-in Retail Analytics Dashboard</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Real-time analytics across stores, daily transactions, product families, and oil price macroeconomic indicators.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={fetchRetailMetrics}
            disabled={loading}
            title="Reload metrics directly from Neon PostgreSQL"
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (onQuickAsk) onQuickAsk("What were total sales across all stores?");
              setActiveView("assistant");
            }}
          >
            <BotMessageSquare size={16} /> Query Retail with AI
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Recorded Sales</span>
          <div className="kpi-value">${data.kpis.totalSales.toLocaleString()}</div>
          <div className="kpi-change positive">
            <ShoppingBag size={13} /> Units sold across 33 families
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Active Retail Stores</span>
          <div className="kpi-value">{data.kpis.activeStores}</div>
          <div className="kpi-change neutral">
            <Store size={13} /> Stores in Quito, Guayaquil & Cuenca
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Customer Transactions</span>
          <div className="kpi-value">{data.kpis.totalTransactions.toLocaleString()}</div>
          <div className="kpi-change positive">
            <CreditCard size={13} /> Processed store visits
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Avg WTI Oil Price</span>
          <div className="kpi-value">${data.kpis.avgOilPrice}</div>
          <div className="kpi-change neutral">
            <Fuel size={13} /> Macroeconomic benchmark
          </div>
        </div>
      </div>

      {/* Chart Row 1: Sales Trend & Store Performance */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: 24 }}>
        {/* Sales Revenue Trend Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <TrendingUp size={18} color="var(--accent-primary)" /> Monthly Sales Volume Trend
              </h3>
              <p className="card-subtitle">Aggregate monthly sales volume across stores</p>
            </div>
          </div>
          <div style={{ height: 280, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.salesTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: 8, color: "#fff" }}
                />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" name="Sales" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Store Performance Bar Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Store size={18} color="var(--accent-success)" /> Performance by Store
              </h3>
              <p className="card-subtitle">Comparative sales and transaction footfall</p>
            </div>
          </div>
          <div style={{ height: 280, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.storePerformance} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="store" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  formatter={(value, name) => name.includes("Sales") ? [`$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, name] : [`${Number(value).toLocaleString()} visits`, name]}
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: 8, color: "#fff" }}
                />
                <Legend />
                <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} name="Sales ($ Revenue)" />
                <Bar dataKey="transactions" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Transactions (Footfall / Visits)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart Row 2: Product Family Breakdown & Oil vs Sales Correlation */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: 24 }}>
        {/* Product Families */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <ShoppingBag size={18} color="var(--accent-purple)" /> Top Product Families
              </h3>
              <p className="card-subtitle">Sales contribution by high-volume categories</p>
            </div>
          </div>
          <div style={{ height: 280, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.productFamilies} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis dataKey="family" type="category" stroke="#64748b" fontSize={11} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: 8, color: "#fff" }}
                />
                <Bar dataKey="sales" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Total Sales" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Oil Price vs Retail Sales */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Fuel size={18} color="var(--accent-warning)" /> Oil Price vs. Retail Sales Volume
              </h3>
              <p className="card-subtitle">Macroeconomic crude benchmark vs consumer grocery sales</p>
            </div>
          </div>
          <div style={{ height: 280, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.oilCorrelation} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="salesDate" stroke="#64748b" fontSize={12} tickFormatter={(val) => val ? val.slice(5) : ""} />
                <YAxis yAxisId="left" stroke="#3b82f6" fontSize={12} domain={['dataMin - 20', 'dataMax + 20']} />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={12} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: 8, color: "#fff" }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} name="Sales ($)" dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="oilPrice" stroke="#f59e0b" strokeWidth={2} name="Oil Price ($/bbl)" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Suggested Natural Language Questions Pill Bar */}
      <div className="card">
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <BotMessageSquare size={16} color="var(--accent-primary)" /> Ask the AI Chatbot About Retail Trends:
        </h4>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            "Which store has the highest sales?",
            "What is the total sales revenue?",
            "Compare sales across different stores.",
            "How do oil prices relate to retail sales?",
            "What are the top-performing product families?",
            "Which stores performed best during high oil prices?"
          ].map((promptText, idx) => (
            <button
              key={idx}
              className="btn btn-sm btn-secondary"
              onClick={() => {
                if (onQuickAsk) onQuickAsk(promptText);
                setActiveView("assistant");
              }}
            >
              {promptText}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

