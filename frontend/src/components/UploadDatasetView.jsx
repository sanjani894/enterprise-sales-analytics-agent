import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Database,
  FileText,
  Table,
  Eye
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function UploadDatasetView({ onDatasetUploaded, setActiveView }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [datasetName, setDatasetName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  const fileInputRef = useRef(null);

  function validateFile(selectedFile) {
    setError(null);
    if (!selectedFile) return false;

    const validExtensions = [".csv", ".xlsx", ".xls"];
    const fileName = selectedFile.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setError("Invalid file format. Please upload a CSV or Excel (.xlsx, .xls) file.");
      return false;
    }

    // 25MB max limit
    if (selectedFile.size > 25 * 1024 * 1024) {
      setError("File is too large. Maximum supported size is 25MB.");
      return false;
    }

    return true;
  }

  function handleFileSelection(selectedFile) {
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setDatasetName(nameWithoutExt);
      setSuccessResult(null);
      setPreviewData(null);
    }
  }

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadProgress(20);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", datasetName || file.name);

    try {
      setUploadProgress(50);
      const res = await fetch(`${API_URL}/api/datasets/upload`, {
        method: "POST",
        body: formData,
      });

      setUploadProgress(85);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to upload and process dataset");
      }

      setUploadProgress(100);
      setSuccessResult(data);
      setPreviewData(data.preview);
      if (onDatasetUploaded) {
        onDatasetUploaded(data.dataset);
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred during upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900, margin: "0 auto" }}>
      {/* Upload Header Card */}
      <div className="card">
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
          Upload Custom Dataset (Mode B)
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Upload any CSV or Excel file (Student grades, HR employee data, e-commerce, financial logs).
          The engine automatically detects column schemas, stores data in an isolated database, and prepares it for AI Text-to-SQL.
        </p>
      </div>

      {/* Upload Area */}
      <div className="card">
        <form onSubmit={handleUpload}>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{
              border: `2px dashed ${dragActive ? "var(--accent-primary)" : "var(--border-default)"}`,
              borderRadius: "var(--radius-lg)",
              padding: "48px 24px",
              textAlign: "center",
              background: dragActive ? "var(--bg-accent-subtle)" : "var(--bg-input)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              marginBottom: 20,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={(e) => e.target.files && handleFileSelection(e.target.files[0])}
              style={{ display: "none" }}
            />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "var(--accent-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UploadCloud size={28} />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                  {file ? file.name : "Drag & drop your CSV or Excel file here"}
                </p>
                <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB ready to process` : "or click to browse from your computer"}
                </p>
              </div>
              <span className="badge badge-blue">Supported: .csv, .xlsx, .xls (Max 25MB)</span>
            </div>
          </div>

          {/* Dataset Name Input */}
          {file && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-primary)" }}>
                Dataset Name
              </label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="e.g., student_performance_2026"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-input)",
                  color: "var(--text-primary)",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploading && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span>Processing & Detecting Schema...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: 6, background: "var(--border-subtle)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${uploadProgress}%`,
                    background: "linear-gradient(90deg, #3b82f6, #10b981)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            {file && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setFile(null);
                  setPreviewData(null);
                  setSuccessResult(null);
                }}
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!file || uploading}
              style={{ opacity: !file || uploading ? 0.6 : 1 }}
            >
              <UploadCloud size={16} />
              {uploading ? "Analyzing & Storing..." : "Upload & Ingest Dataset"}
            </button>
          </div>
        </form>
      </div>

      {/* Upload Success & Preview Confirmation */}
      {successResult && (
        <div className="card" style={{ border: "1px solid rgba(16, 185, 129, 0.4)", background: "rgba(16, 185, 129, 0.05)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
            <div style={{ color: "var(--accent-success)", marginTop: 2 }}>
              <CheckCircle2 size={24} />
            </div>
            <div style={{ flexGrow: 1 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--accent-success)" }}>
                Dataset Successfully Processed & Isolated
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                Detected {successResult.dataset.columns} columns and {successResult.dataset.rows.toLocaleString()} rows.
                Stored securely in isolated schema <code>{successResult.dataset.id}</code>.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setActiveView("datasets")}
              >
                <Database size={14} /> My Datasets
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setActiveView("assistant")}
              >
                <Eye size={14} /> Query with AI
              </button>
            </div>
          </div>

          {/* Column Metadata Pills */}
          {successResult.dataset.schema && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                Detected Columns & Data Types
              </h4>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(successResult.dataset.schema).map(([col, type]) => (
                  <span key={col} className="badge badge-blue">
                    {col}: <strong style={{ color: "#fff", marginLeft: 4 }}>{type}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Table Preview */}
          {previewData && previewData.rows && (
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                Dataset Preview (First 5 Rows)
              </h4>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      {previewData.columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.slice(0, 5).map((row, rIdx) => (
                      <tr key={rIdx}>
                        {previewData.columns.map((col) => (
                          <td key={col}>{String(row[col] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

