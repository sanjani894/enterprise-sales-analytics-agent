import React from "react";
import { X, Database, Table, Layers, FileSpreadsheet } from "lucide-react";

export default function DatasetPreviewModal({ dataset, onClose }) {
  if (!dataset) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 780,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          background: "var(--bg-sidebar)",
          border: "1px solid var(--border-default)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                padding: 8,
                borderRadius: 8,
                background: "rgba(59, 130, 246, 0.15)",
                color: "#60a5fa",
              }}
            >
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>{dataset.name}</h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                ID: <code>{dataset.id}</code> · {dataset.rows?.toLocaleString()} rows · {dataset.columns} columns
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-outline btn-sm"
            style={{ padding: 6, borderRadius: "50%" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Schema Types Section */}
        {dataset.schema && (
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
              Detected Schema & Column Types
            </h4>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxHeight: 120, overflowY: "auto" }}>
              {Object.entries(dataset.schema).map(([col, type]) => (
                <span key={col} className="badge badge-blue">
                  {col}: <strong style={{ color: "#fff", marginLeft: 4 }}>{type}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sample Preview Rows */}
        {dataset.preview && dataset.preview.rows ? (
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
              Sample Data Rows
            </h4>
            <div className="data-table-container" style={{ maxHeight: 260 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {dataset.preview.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataset.preview.rows.map((row, idx) => (
                    <tr key={idx}>
                      {dataset.preview.columns.map((col) => (
                        <td key={col}>{String(row[col] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Full schema preview available when queried via the AI Assistant.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

