import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import OverviewView from "./components/OverviewView";
import RetailAnalyticsView from "./components/RetailAnalyticsView";
import UploadDatasetView from "./components/UploadDatasetView";
import MyDatasetsView from "./components/MyDatasetsView";
import AiAssistantView from "./components/AiAssistantView";
import ComparisonsInsightsView from "./components/ComparisonsInsightsView";
import DatasetPreviewModal from "./components/DatasetPreviewModal";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const DEFAULT_DATASETS = [
  {
    id: "retail",
    name: "Retail Sales (Ecuador Grocery)",
    type: "PostgreSQL (Neon)",
    rows: 417,
    columns: 16,
    status: "Ready",
    created_at: "Built-in Neon DB",
    schema: {
      "stores.store_nbr": "SMALLINT",
      "stores.city": "VARCHAR(50)",
      "stores.state": "VARCHAR(50)",
      "stores.type": "VARCHAR(1)",
      "stores.cluster": "SMALLINT",
      "sales.sales": "NUMERIC(10,3)",
      "sales.family": "VARCHAR(50)",
      "oil_prices.dcoilwtico": "NUMERIC(6,2)",
      "transactions.transactions": "INTEGER",
      "holidays.type": "VARCHAR(20)",
    },
  },
];

const VIEW_METADATA = {
  overview: {
    title: "Executive Overview",
    desc: "Cross-dataset intelligence, activity logs, and system metrics.",
  },
  retail: {
    title: "Retail Sales Analytics",
    desc: "Built-in Neon PostgreSQL exploration: stores, oil prices, transactions & product families.",
  },
  upload: {
    title: "Upload Custom Dataset",
    desc: "Upload CSV or Excel spreadsheets for automatic schema profiling and dynamic analysis.",
  },
  datasets: {
    title: "Dataset Catalog",
    desc: "Manage active datasets, view metadata schemas, and switch analysis scope.",
  },
  assistant: {
    title: "AI Data Assistant",
    desc: "LangGraph-powered Text-to-SQL conversational agent with verification and explainability.",
  },
  insights: {
    title: "Comparisons & AI Insights",
    desc: "Data-grounded trend summaries, correlation patterns, and strategic recommendations.",
  },
};

export default function App() {
  const [activeView, setActiveView] = useState("overview");
  const [datasets, setDatasets] = useState(DEFAULT_DATASETS);
  const [selectedDatasetId, setSelectedDatasetId] = useState("retail");
  const [backendConnected, setBackendConnected] = useState(true);
  const [prefilledPrompt, setPrefilledPrompt] = useState("");
  const [previewDataset, setPreviewDataset] = useState(null);

  // Check backend health & fetch datasets
  useEffect(() => {
    async function checkHealthAndLoadDatasets() {
      try {
        const healthRes = await fetch(`${API_URL}/`);
        if (healthRes.ok) {
          setBackendConnected(true);
        } else {
          setBackendConnected(false);
        }

        const dsRes = await fetch(`${API_URL}/api/datasets`);
        if (dsRes.ok) {
          const list = await dsRes.json();
          if (Array.isArray(list) && list.length > 0) {
            setDatasets(list);
          }
        }
      } catch (err) {
        // Backend might be offline or starting up
        setBackendConnected(false);
      }
    }

    checkHealthAndLoadDatasets();
    const interval = setInterval(checkHealthAndLoadDatasets, 15000);
    return () => clearInterval(interval);
  }, []);

  function handleDatasetUploaded(newDataset) {
    setDatasets((prev) => {
      const exists = prev.some((d) => d.id === newDataset.id);
      if (exists) {
        return prev.map((d) => (d.id === newDataset.id ? newDataset : d));
      }
      return [...prev, newDataset];
    });
    setSelectedDatasetId(newDataset.id);
  }

  async function handleDeleteDataset(datasetId) {
    try {
      await fetch(`${API_URL}/api/datasets/${datasetId}`, { method: "DELETE" });
    } catch (err) {
      // Local fallback
    }
    setDatasets((prev) => prev.filter((d) => d.id !== datasetId));
    if (selectedDatasetId === datasetId) {
      setSelectedDatasetId("retail");
    }
  }

  function handleQuickAsk(promptText) {
    setPrefilledPrompt(promptText);
  }

  const activeMeta = VIEW_METADATA[activeView] || VIEW_METADATA.overview;
  const currentDataset = datasets.find((d) => d.id === selectedDatasetId) || datasets[0];

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        currentDatasetName={currentDataset?.name}
        isCustomDataset={selectedDatasetId !== "retail"}
      />

      {/* Main App Content */}
      <div className="main-wrapper">
        <Header
          activeViewTitle={activeMeta.title}
          activeViewDesc={activeMeta.desc}
          datasets={datasets}
          selectedDatasetId={selectedDatasetId}
          onSelectDataset={setSelectedDatasetId}
          backendConnected={backendConnected}
        />

        <main className="content-area">
          {activeView === "overview" && (
            <OverviewView
              datasets={datasets}
              setActiveView={setActiveView}
              onSelectDataset={setSelectedDatasetId}
              selectedDatasetId={selectedDatasetId}
            />
          )}

          {activeView === "retail" && (
            <RetailAnalyticsView
              setActiveView={setActiveView}
              onQuickAsk={handleQuickAsk}
            />
          )}

          {activeView === "upload" && (
            <UploadDatasetView
              onDatasetUploaded={handleDatasetUploaded}
              setActiveView={setActiveView}
            />
          )}

          {activeView === "datasets" && (
            <MyDatasetsView
              datasets={datasets}
              selectedDatasetId={selectedDatasetId}
              onSelectDataset={setSelectedDatasetId}
              onDeleteDataset={handleDeleteDataset}
              onPreviewDataset={setPreviewDataset}
              setActiveView={setActiveView}
            />
          )}

          {activeView === "assistant" && (
            <AiAssistantView
              selectedDatasetId={selectedDatasetId}
              onSelectDataset={setSelectedDatasetId}
              datasets={datasets}
              prefilledPrompt={prefilledPrompt}
              clearPrefilledPrompt={() => setPrefilledPrompt("")}
            />
          )}

          {activeView === "insights" && (
            <ComparisonsInsightsView
              selectedDatasetId={selectedDatasetId}
              datasets={datasets}
            />
          )}
        </main>
      </div>

      {/* Dataset Preview Modal */}
      {previewDataset && (
        <DatasetPreviewModal
          dataset={previewDataset}
          onClose={() => setPreviewDataset(null)}
        />
      )}
    </div>
  );
}
