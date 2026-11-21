import React, { useState } from "react";
import {
  Database,
  ShoppingBag,
  FileSpreadsheet,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  ArrowRight,
  UploadCloud,
  Layers,
  ShieldCheck
} from "lucide-react";

export default function MyDatasetsView({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onDeleteDataset,
  onPreviewDataset,
  setActiveView
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Dataset Catalog & Management</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Manage built-in database connections and user-uploaded datasets. Switch active dataset context for AI queries and analytics.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setActiveView("upload")}>
          <UploadCloud size={16} /> Upload New Dataset
        </button>
      </div>

      {/* Datasets Table Card */}
      <div className="card">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Dataset Name</th>
                <th>Storage Engine</th>
                <th>Rows</th>
                <th>Columns</th>
                <th>Created / Ingested</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((dataset) => {
                const isSelected = dataset.id === selectedDatasetId;
                const isRetail = dataset.id === "retail";

                return (
                  <tr
                    key={dataset.id}
                    style={{
                      background: isSelected ? "var(--bg-accent-subtle)" : undefined,
                    }}
                  >
                    {/* Dataset Name */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            padding: 8,
                            borderRadius: 8,
                            background: isRetail ? "rgba(59, 130, 246, 0.15)" : "rgba(16, 185, 129, 0.15)",
                            color: isRetail ? "#60a5fa" : "#34d399",
                          }}
                        >
                          {isRetail ? <ShoppingBag size={18} /> : <FileSpreadsheet size={18} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                            {dataset.name}
                            {isSelected && (
                              <span className="badge badge-blue" style={{ fontSize: 10 }}>Active</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            ID: <code>{dataset.id}</code>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Engine */}
                    <td>
                      <span className={`badge ${isRetail ? "badge-blue" : "badge-green"}`}>
                        {dataset.type || (isRetail ? "PostgreSQL" : "SQLite (Isolated)")}
                      </span>
                    </td>

                    {/* Rows */}
                    <td style={{ fontWeight: 600 }}>
                      {(dataset.rows || 0).toLocaleString()}
                    </td>

                    {/* Columns */}
                    <td>{dataset.columns || (dataset.column_names ? dataset.column_names.length : 0)}</td>

                    {/* Created Date */}
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {dataset.created_at || "System Default"}
                    </td>

                    {/* Status */}
                    <td>
                      <span className="badge badge-green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }}></span>
                        {dataset.status || "Ready"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                        {!isSelected ? (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => onSelectDataset(dataset.id)}
                            title="Set as active dataset for AI assistant and dashboards"
                          >
                            Set Active
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "var(--accent-primary)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "4px 8px",
                            }}
                          >
                            <CheckCircle2 size={14} /> Active
                          </span>
                        )}

                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => {
                            if (onPreviewDataset) onPreviewDataset(dataset);
                          }}
                          title="Preview dataset schema and sample rows"
                        >
                          <Eye size={13} /> Preview
                        </button>

                        {isRetail ? (
                          <span
                            title="Protected Built-in Neon Database"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              color: "var(--text-muted)",
                              padding: "4px 8px",
                            }}
                          >
                            <ShieldCheck size={14} color="#60a5fa" /> System
                          </span>
                        ) : (
                          confirmDeleteId === dataset.id ? (
                            <div style={{ display: "inline-flex", gap: 4 }}>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => {
                                  onDeleteDataset(dataset.id);
                                  setConfirmDeleteId(null);
                                }}
                              >
                                Confirm
                              </button>
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => setConfirmDeleteId(dataset.id)}
                              style={{ color: "#f87171", borderColor: "rgba(239, 68, 68, 0.3)" }}
                              title="Delete custom dataset"
                            >
                              <Trash2 size={13} />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

