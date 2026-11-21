import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  Database,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Bot,
  User,
  Table as TableIcon,
  BarChart3,
  Sparkles,
  ShoppingBag,
  FileSpreadsheet
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import DynamicChartRenderer from "./DynamicChartRenderer";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const RETAIL_PROMPTS = [
  "Which store recorded the highest sales?",
  "Show me the average oil prices in 2016.",
  "What were total sales for store 1 in 2017?",
  "How many transactions happened during holidays?",
  "What are the top-performing product families?",
  "Compare sales across all stores."
];

const CUSTOM_PROMPTS = [
  "Show me a summary of this dataset.",
  "What are the top 5 records by highest value?",
  "Calculate the average and distribution across categories.",
  "How many total entries are recorded?",
];

function formatDetails(details) {
  const lines = [`In scope: ${details.in_scope}`];
  if (details.plan) lines.push(`Plan: ${details.plan}`);
  if (details.sql) lines.push(`SQL: ${details.sql}`);
  if (details.verified !== null && details.verified !== undefined)
    lines.push(`Verified: ${details.verified}`);
  lines.push(`Attempts: ${details.attempts}`);
  return lines.join("\n");
}

export default function AiAssistantView({
  selectedDatasetId,
  onSelectDataset,
  datasets,
  prefilledPrompt,
  clearPrefilledPrompt
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const messagesEndRef = useRef(null);

  const activeDataset = datasets.find((d) => d.id === selectedDatasetId) || datasets[0];
  const isRetail = selectedDatasetId === "retail";
  const prompts = isRetail ? RETAIL_PROMPTS : CUSTOM_PROMPTS;

  useEffect(() => {
    if (prefilledPrompt) {
      sendQuestion(prefilledPrompt);
      if (clearPrefilledPrompt) clearPrefilledPrompt();
    }
  }, [prefilledPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function toggleDetails(index) {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  function handleClearChat() {
    setMessages([]);
    setExpanded({});
  }

  async function sendQuestion(textToSend) {
    const currentQuestion = textToSend.trim();
    if (!currentQuestion || loading) return;

    // Append user message
    setMessages((prev) => [...prev, { role: "user", text: currentQuestion }]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion,
          dataset_id: selectedDatasetId,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });

      if (!response.ok) {
        // Fallback to legacy /chat endpoint if /api/chat isn't mounted yet
        const fallbackRes = await fetch(`${API_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: currentQuestion,
            history: messages.slice(-6).map((m) => ({
              role: m.role,
              text: m.text,
            })),
          }),
        });
        var data = await fallbackRes.json();
      } else {
        var data = await response.json();
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: data.answer || data.response || "No response received.",
          details: {
            in_scope: data.in_scope ?? data.inScope,
            plan: data.plan,
            sql: data.sql,
            verified: data.verified,
            attempts: data.attempts || 1,
          },
          columns: data.columns,
          rows: data.rows,
          chart: data.chart,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Something went wrong while connecting to the AI agent. Please verify that the FastAPI backend is running.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendQuestion(question);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", gap: 16 }}>
      {/* Assistant Context Bar */}
      <div
        className="card"
        style={{
          padding: "14px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              padding: 8,
              borderRadius: 8,
              background: isRetail ? "rgba(59, 130, 246, 0.15)" : "rgba(16, 185, 129, 0.15)",
              color: isRetail ? "#60a5fa" : "#34d399",
            }}
          >
            {isRetail ? <ShoppingBag size={20} /> : <FileSpreadsheet size={20} />}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <span>Context: {activeDataset ? activeDataset.name : "Retail Sales"}</span>
              <span className={`badge ${isRetail ? "badge-blue" : "badge-green"}`}>
                {isRetail ? "Neon PostgreSQL" : "Custom Isolated SQLite"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              LangGraph Multi-Agent with Qwen 3.6 35B & SQL Self-Verification
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="dataset-select-pill">
            <Database size={14} color="var(--accent-primary)" />
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

          {messages.length > 0 && (
            <button className="btn btn-sm btn-outline" onClick={handleClearChat}>
              <Trash2 size={13} /> Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Quick Suggestion Chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {prompts.map((promptText, idx) => (
          <button
            key={idx}
            onClick={() => sendQuestion(promptText)}
            disabled={loading}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              borderRadius: 16,
              border: "1px solid var(--border-default)",
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-primary)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            {promptText}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div
        className="card"
        style={{
          flexGrow: 1,
          overflowY: "auto",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          background: "var(--bg-card)",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-muted)",
              textAlign: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(59, 130, 246, 0.1)",
                color: "var(--accent-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bot size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                AI Data Assistant Ready
              </h3>
              <p style={{ fontSize: 13, maxWidth: 450, marginTop: 4 }}>
                Ask any question in natural English. The assistant will formulate a query plan, execute safe read-only SQL, verify the output, and generate an answer with full explainability.
              </p>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                maxWidth: "85%",
                flexDirection: m.role === "user" ? "row-reverse" : "row",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: m.role === "user" ? "var(--accent-primary)" : "var(--bg-muted)",
                  color: m.role === "user" ? "#fff" : "var(--accent-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: 14,
                    background: m.role === "user" ? "var(--accent-primary)" : "var(--bg-input)",
                    color: m.role === "user" ? "#ffffff" : "var(--text-primary)",
                    fontSize: 14,
                    lineHeight: 1.5,
                    border: m.role === "user" ? "none" : "1px solid var(--border-subtle)",
                  }}
                >
                  {m.text}
                </div>

                {/* Assistant Details / Verification Drawer */}
                {m.role === "bot" && m.details && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button
                      onClick={() => toggleDetails(i)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        background: "none",
                        border: "none",
                        color: "var(--accent-primary)",
                        cursor: "pointer",
                        padding: "2px 0",
                        width: "fit-content",
                      }}
                    >
                      <Code2 size={13} />
                      {expanded[i] ? "Hide execution details" : "Show execution details (Plan & SQL)"}
                      {expanded[i] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {expanded[i] && (
                      <div
                        style={{
                          fontSize: 12,
                          background: "#0d1322",
                          border: "1px solid var(--border-default)",
                          padding: 12,
                          borderRadius: 8,
                          overflowX: "auto",
                          color: "#cbd5e1",
                          fontFamily: "var(--font-mono)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {formatDetails(m.details)}
                      </div>
                    )}
                  </div>
                )}

                {/* Query Result Table (if available) */}
                {m.columns && m.rows && m.rows.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <TableIcon size={12} /> Query Output ({m.rows.length} rows)
                    </div>
                    <div className="data-table-container" style={{ maxHeight: 220 }}>
                      <table className="data-table" style={{ fontSize: 12 }}>
                        <thead>
                          <tr>
                            {m.columns.map((col) => (
                              <th key={col}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {m.rows.slice(0, 10).map((row, rIdx) => (
                            <tr key={rIdx}>
                              {Array.isArray(row)
                                ? row.map((cell, cIdx) => <td key={cIdx}>{String(cell ?? "")}</td>)
                                : m.columns.map((col) => <td key={col}>{String(row[col] ?? "")}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Dynamic Auto-Generated Chart */}
                {m.chart && (
                  <DynamicChartRenderer chart={m.chart} />
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)", fontSize: 13 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--bg-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-primary)",
              }}
            >
              <Bot size={15} />
            </div>
            <span>LangGraph Multi-Agent planning, executing SQL & verifying results...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10 }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`Ask a question about ${activeDataset?.name || "the data"} (e.g., Which store had the highest sales?)...`}
          style={{
            flex: 1,
            padding: "12px 18px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !question.trim()}
          style={{ opacity: loading || !question.trim() ? 0.6 : 1, padding: "0 22px" }}
        >
          <Send size={16} /> Send
        </button>
      </form>
    </div>
  );
}

