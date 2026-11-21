import React from "react";
import { Database, Activity, Sparkles } from "lucide-react";

export default function Header({
  activeViewTitle,
  activeViewDesc,
  datasets,
  selectedDatasetId,
  onSelectDataset,
  backendConnected,
}) {
  return (
    <header className="top-header">
      <div className="header-title-area">
        <h1 className="header-title">{activeViewTitle}</h1>
        <p className="header-desc">{activeViewDesc}</p>
      </div>

      <div className="header-actions">
        {/* Dataset Switcher Pill */}
        <div className="dataset-select-pill" title="Switch working dataset context">
          <Database size={15} color="var(--accent-primary)" />
          <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>Dataset:</span>
          <select
            value={selectedDatasetId}
            onChange={(e) => onSelectDataset(e.target.value)}
          >
            <option value="retail">Retail Sales (Built-in)</option>
            {datasets
              .filter((d) => d.id !== "retail")
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.rows || 0} rows)
                </option>
              ))}
          </select>
        </div>

        {/* Backend Connectivity Status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: "20px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            fontSize: "12px",
            color: backendConnected ? "var(--text-secondary)" : "var(--accent-danger)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: backendConnected ? "var(--accent-success)" : "var(--accent-danger)",
              boxShadow: backendConnected ? "0 0 6px var(--accent-success)" : "none",
            }}
          />
          <span>{backendConnected ? "Live API Connected" : "Backend Offline"}</span>
        </div>
      </div>
    </header>
  );
}

