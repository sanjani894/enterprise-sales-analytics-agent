import React from "react";
import {
  ShoppingBag,
  UploadCloud,
  BotMessageSquare,
  Sparkles,
  Database,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Layers
} from "lucide-react";

export default function OverviewView({
  datasets,
  setActiveView,
  onSelectDataset,
  selectedDatasetId
}) {
  // Compute totals
  const totalDatasets = datasets.length;
  const totalRecords = datasets.reduce((acc, curr) => acc + (curr.rows || 0), 0);
  const activeDataset = datasets.find((d) => d.id === selectedDatasetId) || datasets[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Welcome Hero Banner */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(30, 41, 67, 0.9) 0%, rgba(14, 21, 38, 0.9) 100%)",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ maxWidth: 680, position: "relative", zIndex: 2 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12 }} className="badge badge-blue">
            <Sparkles size={12} /> Enterprise AI Intelligence Platform
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 8, letterSpacing: "-0.02em" }}>
            Data Intelligence & Enterprise Analytics
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            Unified dual-mode analytics platform: explore real retail performance from Neon PostgreSQL (Mode A) or upload custom CSV/Excel datasets for automated schema detection and dynamic Text-to-SQL querying (Mode B).
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={() => setActiveView("assistant")}>
              <BotMessageSquare size={16} /> Open AI Data Assistant
            </button>
            <button className="btn btn-secondary" onClick={() => setActiveView("retail")}>
              <ShoppingBag size={16} /> Retail Analytics
            </button>
            <button className="btn btn-secondary" onClick={() => setActiveView("upload")}>
              <UploadCloud size={16} /> Upload New Dataset
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Active Datasets</span>
          <div className="kpi-value">{totalDatasets}</div>
          <div className="kpi-change neutral">
            <Database size={13} /> 1 Built-in + {totalDatasets - 1} Custom
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Total Records Stored</span>
          <div className="kpi-value">{totalRecords.toLocaleString()}</div>
          <div className="kpi-change positive">
            <TrendingUp size={13} /> Across all connected tables
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">AI Query Engine</span>
          <div className="kpi-value" style={{ fontSize: 20, paddingTop: 4 }}>
            Qwen 3.6 35B
          </div>
          <div className="kpi-change positive">
            <CheckCircle2 size={13} /> LangGraph Multi-Agent Active
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Current Context</span>
          <div className="kpi-value" style={{ fontSize: 18, paddingTop: 6, color: "var(--accent-primary)" }}>
            {activeDataset?.name?.length > 18 ? activeDataset.name.slice(0, 18) + "..." : activeDataset?.name}
          </div>
          <div className="kpi-change neutral">
            <Clock size={13} /> Ready for queries
          </div>
        </div>
      </div>

      {/* 2-Column Section: Available Datasets & Recent Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 24 }}>
        {/* Available Datasets Table Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Database size={18} color="var(--accent-primary)" /> Available Datasets
              </h3>
              <p className="card-subtitle">Datasets available for immediate querying and analysis</p>
            </div>
            <button className="btn btn-sm btn-outline" onClick={() => setActiveView("datasets")}>
              View All <ArrowRight size={13} />
            </button>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dataset</th>
                  <th>Source / Engine</th>
                  <th>Rows</th>
                  <th>Columns</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((d) => (
                  <tr key={d.id} style={{ background: d.id === selectedDatasetId ? "var(--bg-accent-subtle)" : undefined }}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {d.id === "retail" ? <ShoppingBag size={15} color="#60a5fa" /> : <FileSpreadsheet size={15} color="#34d399" />}
                        <span>{d.name}</span>
                        {d.id === selectedDatasetId && (
                          <span className="badge badge-blue" style={{ fontSize: 10 }}>Active</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${d.id === "retail" ? "badge-blue" : "badge-green"}`}>
                        {d.type || (d.id === "retail" ? "PostgreSQL" : "SQLite")}
                      </span>
                    </td>
                    <td>{(d.rows || 0).toLocaleString()}</td>
                    <td>{d.columns || 0}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          onSelectDataset(d.id);
                          if (d.id === "retail") setActiveView("retail");
                          else setActiveView("assistant");
                        }}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Launch & Activity Card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card-header" style={{ marginBottom: 4 }}>
            <div>
              <h3 className="card-title">
                <Clock size={18} color="var(--accent-purple)" /> Quick Actions & Workflow
              </h3>
              <p className="card-subtitle">Choose a workflow to begin analyzing your data</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-muted)",
                border: "1px solid var(--border-subtle)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onClick={() => {
                onSelectDataset("retail");
                setActiveView("retail");
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ padding: 8, borderRadius: 8, background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" }}>
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Built-in Retail Analytics (Mode A)</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Explore 5-table Neon PostgreSQL sales, oil, holidays</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-muted)",
                border: "1px solid var(--border-subtle)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onClick={() => setActiveView("upload")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ padding: 8, borderRadius: 8, background: "rgba(16, 185, 129, 0.2)", color: "#34d399" }}>
                  <UploadCloud size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Upload Custom CSV or Excel (Mode B)</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Auto-detect columns, types, and schema isolation</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-muted)",
                border: "1px solid var(--border-subtle)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onClick={() => setActiveView("assistant")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ padding: 8, borderRadius: 8, background: "rgba(139, 92, 246, 0.2)", color: "#a78bfa" }}>
                  <BotMessageSquare size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>AI Natural Language Querying</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Ask questions in plain English with verified SQL</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-muted)",
                border: "1px solid var(--border-subtle)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onClick={() => setActiveView("insights")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ padding: 8, borderRadius: 8, background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24" }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>AI-Powered Insights & Trends</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Patterns, anomalies, and data-backed recommendations</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

