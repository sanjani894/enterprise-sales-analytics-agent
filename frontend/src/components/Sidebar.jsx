import React from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  UploadCloud,
  Database,
  BotMessageSquare,
  Sparkles,
  Layers,
} from "lucide-react";

export const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "retail", label: "Retail Analytics", icon: ShoppingBag },
  { id: "upload", label: "Upload Dataset", icon: UploadCloud },
  { id: "datasets", label: "My Datasets", icon: Database },
  { id: "assistant", label: "AI Data Assistant", icon: BotMessageSquare },
  { id: "insights", label: "Comparisons & Insights", icon: Sparkles },
];

export default function Sidebar({ activeView, setActiveView, currentDatasetName, isCustomDataset }) {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-badge">
          <Layers size={20} />
        </div>
        <div>
          <div className="brand-title">DataIntelligence</div>
          <div className="brand-subtitle">Enterprise Platform</div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={{ flexGrow: 1 }}>
        <ul className="nav-menu">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <li
                key={item.id}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => setActiveView(item.id)}
              >
                <Icon size={18} className="icon" />
                <span>{item.label}</span>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Active Mode Indicator Footer */}
      <div className="sidebar-footer">
        <div className="mode-card">
          <span className="mode-label">Active Analysis Mode</span>
          <div className="mode-badge">
            <span className="mode-dot"></span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {isCustomDataset ? "Mode B: Custom Dataset" : "Mode A: Retail Analytics"}
            </span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 2 }}>
            Scope: {currentDatasetName || "Neon PostgreSQL Retail"}
          </div>
        </div>
      </div>
    </aside>
  );
}

