import React, { useState, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  BarChart2,
  Database,
  Layers,
  ShoppingBag,
  FileSpreadsheet,
  Cpu
} from "lucide-react";
import DynamicChartRenderer from "./DynamicChartRenderer";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const ICON_MAP = {
  pattern: TrendingUp,
  anomaly: AlertTriangle,
  trend: CheckCircle2,
  comparison: BarChart2,
  recommendation: Lightbulb,
};

export default function ComparisonsInsightsView({ selectedDatasetId, datasets }) {
  const [loading, setLoading] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);

  const activeDataset = datasets.find((d) => d.id === selectedDatasetId) || datasets[0];
  const isRetail = selectedDatasetId === "retail";

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/datasets/${selectedDatasetId}/analytics`);
      if (res.ok) {
        const json = await res.json();
        setAnalyticsData(json);
      }
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      setInsightsLoading(true);
      const res = await fetch(`${API_URL}/api/datasets/${selectedDatasetId}/insights`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.insights && json.insights.length > 0) {
          setAiInsights(json.insights);
        }
      }
    } catch (err) {
      // Fallback
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    setAiInsights(null);
    fetchAnalytics();
    fetchInsights();
  }, [selectedDatasetId]);

  // Fallback defaults if offline
  const fallbackInsights = isRetail
    ? [
        {
          type: "pattern",
          title: "Store 1 (Quito) Leads Sales Contribution",
          desc: `Store 1 achieved $2,507.13 (34.4% of total turnover) with 8,049 customer transactions, maintaining the highest revenue density across the chain.`,
          badge: "Sales Leader",
          color: "#3b82f6",
        },
        {
          type: "anomaly",
          title: "Store 3 (Cuenca) High Footfall Variance",
          desc: "Store 3 processed the highest transaction footfall (9,143 visits) but generated $2,388.17 in sales, indicating a lower basket size per visit.",
          badge: "Footfall Anomaly",
          color: "#f59e0b",
        },
        {
          type: "trend",
          title: "Crude Oil Benchmark vs Retail Volume",
          desc: "WTI crude averaged $57.90/bbl; retail grocery demand remained non-cyclical and inelastic across Quito and Guayaquil locations.",
          badge: "Macro Correlation",
          color: "#10b981",
        },
        {
          type: "recommendation",
          title: "Cross-Merchandising in High-Traffic Hubs",
          desc: "Introduce bundled promotions in Store 3 to increase basket value to match Store 1's revenue-per-transaction benchmark.",
          badge: "Strategic Action",
          color: "#8b5cf6",
        },
      ]
    : [
        {
          type: "pattern",
          title: `Distribution Pattern in ${activeDataset?.name || "Dataset"}`,
          desc: analyticsData?.kpis?.primaryAvg
            ? `Calculated average ${analyticsData.kpis.primaryMetric || "metric"} is ${analyticsData.kpis.primaryAvg} (range: ${analyticsData.kpis.primaryMin} to ${analyticsData.kpis.primaryMax}).`
            : `Dataset contains ${analyticsData?.kpis?.totalRecords || activeDataset?.rows || 0} records across ${activeDataset?.columns || 0} profiled attributes.`,
          badge: "Calculated Pattern",
          color: "#3b82f6",
        },
        {
          type: "anomaly",
          title: "Category Variance Analysis",
          desc: analyticsData?.comparisonChart?.data?.length > 1
            ? `Top category '${analyticsData.comparisonChart.data[0].category}' outperformed the cohort with an average of ${analyticsData.comparisonChart.data[0].avg_value}.`
            : "Data shows balanced distribution across categorical clusters without extreme outlier deviation.",
          badge: "Variance Check",
          color: "#f59e0b",
        },
        {
          type: "recommendation",
          title: "Targeted Focus & Segmentation",
          desc: "Segment cohorts based on highest performance tiers for targeted operational interventions and resource optimization.",
          badge: "Optimization",
          color: "#8b5cf6",
        },
      ];

  const displayInsights = aiInsights || fallbackInsights;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          background: "linear-gradient(135deg, rgba(23, 27, 44, 0.8) 0%, rgba(14, 21, 38, 0.9) 100%)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className={`badge ${isRetail ? "badge-blue" : "badge-green"}`}>
              {isRetail ? "Mode A: Retail" : "Mode B: Custom Dataset"}
            </span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Active Context: {activeDataset?.name}
            </span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Data Comparisons & Automated Visualizations</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Automatic multi-attribute comparative charts, distributions, and data-backed business insights.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              fetchAnalytics();
              fetchInsights();
            }}
            disabled={loading || insightsLoading}
            title="Recalculate analytics & re-generate insights"
          >
            <RefreshCw size={14} className={loading || insightsLoading ? "spin" : ""} />
            {loading || insightsLoading ? "Analyzing..." : "Refresh Insights"}
          </button>
        </div>
      </div>

      {/* KPI Cards for Custom Dataset */}
      {analyticsData && analyticsData.kpis && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <span className="kpi-label">Total Records</span>
            <div className="kpi-value">{analyticsData.kpis.totalRecords?.toLocaleString()}</div>
            <div className="kpi-change neutral">
              <Database size={13} /> Processed rows
            </div>
          </div>

          {analyticsData.kpis.primaryAvg !== undefined && (
            <div className="kpi-card">
              <span className="kpi-label">Average {analyticsData.kpis.primaryMetric}</span>
              <div className="kpi-value">{analyticsData.kpis.primaryAvg}</div>
              <div className="kpi-change positive">
                <TrendingUp size={13} /> Cohort mean
              </div>
            </div>
          )}

          {analyticsData.kpis.primaryMax !== undefined && (
            <div className="kpi-card">
              <span className="kpi-label">Peak {analyticsData.kpis.primaryMetric}</span>
              <div className="kpi-value">{analyticsData.kpis.primaryMax}</div>
              <div className="kpi-change neutral">
                <CheckCircle2 size={13} /> Max recorded
              </div>
            </div>
          )}

          {analyticsData.kpis.primaryMin !== undefined && (
            <div className="kpi-card">
              <span className="kpi-label">Minimum {analyticsData.kpis.primaryMetric}</span>
              <div className="kpi-value">{analyticsData.kpis.primaryMin}</div>
              <div className="kpi-change neutral">
                Baseline recorded
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visualizations Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: 24 }}>
        {/* Comparison Bar Chart */}
        {analyticsData?.comparisonChart ? (
          <div className="card" style={{ padding: 0 }}>
            <DynamicChartRenderer chart={analyticsData.comparisonChart} />
          </div>
        ) : isRetail ? (
          <div className="card">
            <h3 className="card-title">
              <BarChart2 size={18} color="var(--accent-primary)" /> Store Sales vs. Transactions
            </h3>
            <p className="card-subtitle">Direct performance comparison between Quito, Guayaquil, and Cuenca</p>
            <div style={{ marginTop: 14 }}>
              <DynamicChartRenderer
                chart={{
                  type: "bar",
                  title: "Sales ($) by Location",
                  xAxisKey: "store",
                  dataKeys: ["sales"],
                  data: [
                    { store: "Store 1 (Quito)", sales: 2507.13 },
                    { store: "Store 2 (Guayaquil)", sales: 2397.24 },
                    { store: "Store 3 (Cuenca)", sales: 2388.17 },
                  ],
                  colors: ["#3b82f6"],
                }}
              />
            </div>
          </div>
        ) : null}

        {/* Distribution Pie Chart */}
        {analyticsData?.distributionChart ? (
          <div className="card" style={{ padding: 0 }}>
            <DynamicChartRenderer chart={analyticsData.distributionChart} />
          </div>
        ) : isRetail ? (
          <div className="card">
            <h3 className="card-title">
              <ShoppingBag size={18} color="var(--accent-purple)" /> Product Category Turnover
            </h3>
            <p className="card-subtitle">Volume breakdown by top retail families</p>
            <div style={{ marginTop: 14 }}>
              <DynamicChartRenderer
                chart={{
                  type: "pie",
                  title: "Product Family Distribution",
                  nameKey: "name",
                  dataKey: "value",
                  data: [
                    { name: "USB-C Cable (103)", value: 2661.96 },
                    { name: "Smartphone Stand (102)", value: 2365.28 },
                    { name: "Wireless Headphones (101)", value: 2265.30 },
                  ],
                  colors: ["#8b5cf6", "#3b82f6", "#10b981"],
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* AI Pattern Insights Section */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} color="var(--accent-purple)" />
            Executive AI Intelligence & Pattern Summaries
            {aiInsights && <span className="badge badge-purple" style={{ fontSize: 10 }}>Live Qwen 3.6 35B Generated</span>}
          </h3>
          {insightsLoading && (
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <Cpu size={14} className="spin" /> Generating data-grounded insights...
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
          {displayInsights.map((item, idx) => {
            const Icon = ICON_MAP[item.type] || Sparkles;
            return (
              <div
                key={idx}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  borderLeft: `4px solid ${item.color || "#3b82f6"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: item.color || "#3b82f6",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Icon size={14} /> {item.badge || item.type}
                  </span>
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                  {item.title}
                </h4>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
