import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

function formatDetails(details) {
  const lines = [`In scope: ${details.in_scope}`];
  if (details.plan) lines.push(`Plan: ${details.plan}`);
  if (details.sql) lines.push(`SQL: ${details.sql}`);
  if (details.verified !== null && details.verified !== undefined) lines.push(`Verified: ${details.verified}`);
  lines.push(`Attempts: ${details.attempts}`);
  return lines.join("\n");
}

function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  function toggleDetails(index) {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!question.trim()) return;

    const currentQuestion = question;
    setMessages((prev) => [...prev, { role: "user", text: currentQuestion }]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion, history: messages.slice(-6) }),
      });
      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: data.answer,
          details: {
            in_scope: data.in_scope,
            plan: data.plan,
            sql: data.sql,
            verified: data.verified,
            attempts: data.attempts,
          },
        },
      ]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "bot", text: "Something went wrong. Is the backend running?" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Retail Sales Chatbot</h1>
      <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 16, minHeight: 300, marginBottom: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ margin: "8px 0", textAlign: m.role === "user" ? "right" : "left" }}>
            <span style={{
              display: "inline-block",
              padding: "8px 12px",
              borderRadius: 12,
              background: m.role === "user" ? "#0070f3" : "#eee",
              color: m.role === "user" ? "white" : "black",
              maxWidth: "80%",
            }}>
              {m.text}
            </span>
            {m.role === "bot" && m.details && (
              <div>
                <button
                  onClick={() => toggleDetails(i)}
                  style={{ display: "block", fontSize: 12, background: "none", border: "none", color: "#0070f3", cursor: "pointer", padding: "4px 0" }}
                >
                  {expanded[i] ? "Hide details" : "Show details"}
                </button>
                {expanded[i] && (
                  <pre style={{ fontSize: 12, background: "#f5f5f5", padding: 8, borderRadius: 6, overflowX: "auto", whiteSpace: "pre-wrap" }}>
                    {formatDetails(m.details)}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && <div style={{ color: "#888" }}>Thinking...</div>}
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about sales, stores, oil prices, holidays..."
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit" disabled={loading}>Send</button>
      </form>
    </div>
  );
}

export default App;