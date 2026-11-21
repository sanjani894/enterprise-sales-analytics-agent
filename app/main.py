import sys
import os
import shutil
import tempfile
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.agent import ask_question_agent
from src.retail_analytics import (
    get_complete_retail_analytics,
    get_retail_kpis,
    get_sales_trend,
    get_store_performance,
    get_family_performance,
    get_oil_correlation,
)
from src.dataset_manager import (
    process_and_save_dataset,
    list_all_datasets,
    get_dataset_metadata,
    delete_user_dataset,
    execute_dataset_sql,
)
from src.visualization_service import (
    recommend_chart_for_results,
    get_dataset_comparative_analytics,
)
from src.insights_engine import generate_ai_insights

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    message: Optional[str] = None
    question: Optional[str] = None
    query: Optional[str] = None
    prompt: Optional[str] = None
    text: Optional[str] = None
    dataset_id: Optional[str] = "retail"
    history: Optional[List[Dict[str, Any]]] = []

@app.get("/")
def read_root():
    return {"status": "ok"}

@app.post("/api/chat")
@app.post("/chat")
def chat(req: QueryRequest):
    user_input = req.message or req.question or req.query or req.prompt or req.text or ""
    if not user_input:
        raise HTTPException(status_code=400, detail="No question provided")

    dataset_id = req.dataset_id or "retail"

    try:
        agent_result = ask_question_agent(
            user_input,
            history=req.history,
            dataset_id=dataset_id
        )
        
        response_text = agent_result.get("answer", "")
        columns = agent_result.get("columns") or []
        rows = agent_result.get("rows") or []
        plan = agent_result.get("plan") or user_input

        # Automatic chart recommendation based on SQL columns & rows
        chart = None
        if columns and rows:
            chart = recommend_chart_for_results(columns, rows, plan_or_question=plan)
        
        return {
            "response": response_text,
            "answer": response_text,
            "text": response_text,
            "message": response_text,
            "in_scope": agent_result.get("in_scope", True),
            "inScope": agent_result.get("in_scope", True),
            "sql": agent_result.get("sql"),
            "plan": agent_result.get("plan"),
            "verified": agent_result.get("verified"),
            "attempts": agent_result.get("attempts", 1),
            "columns": columns,
            "rows": rows,
            "chart": chart,
            "dataset_id": dataset_id,
        }
    except Exception as e:
        print("LangGraph Agent Error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/retail/analytics")
def get_retail_analytics_endpoint():
    try:
        return get_complete_retail_analytics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch retail analytics: {str(e)}")

@app.get("/api/retail/kpis")
def get_retail_kpis_endpoint():
    try:
        return get_retail_kpis()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch retail KPIs: {str(e)}")

@app.get("/api/retail/sales-trend")
def get_sales_trend_endpoint():
    try:
        return get_sales_trend()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sales trend: {str(e)}")

@app.get("/api/retail/store-performance")
def get_store_performance_endpoint():
    try:
        return get_store_performance()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch store performance: {str(e)}")

@app.get("/api/retail/product-families")
def get_family_performance_endpoint():
    try:
        return get_family_performance()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch product families: {str(e)}")

@app.get("/api/retail/oil-correlation")
def get_oil_correlation_endpoint():
    try:
        return get_oil_correlation()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch oil correlation: {str(e)}")

# ==================== DATASET MANAGEMENT (MODE B) ====================

@app.post("/api/datasets/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None)
):
    """Uploads a CSV or Excel file, validates, detects schema, and stores in an isolated database."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".csv", ".xlsx", ".xls"]:
        raise HTTPException(status_code=400, detail=f"Unsupported format '{ext}'. Only CSV, XLSX, and XLS are supported.")

    # Save to a temporary file for processing
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp_path = tmp.name
        shutil.copyfileobj(file.file, tmp)

    try:
        dataset_meta = process_and_save_dataset(
            file_path=tmp_path,
            original_filename=filename,
            custom_name=name
        )
        return {
            "status": "success",
            "message": f"Dataset '{dataset_meta['name']}' uploaded and processed successfully.",
            "dataset": dataset_meta,
            "preview": dataset_meta.get("preview")
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process dataset: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

@app.get("/api/datasets")
def list_datasets_endpoint():
    """Lists built-in retail dataset and all uploaded datasets."""
    try:
        return list_all_datasets()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/datasets/{dataset_id}")
def get_dataset_endpoint(dataset_id: str):
    """Retrieves schema and metadata for a specific dataset."""
    meta = get_dataset_metadata(dataset_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")
    return meta

@app.get("/api/datasets/{dataset_id}/analytics")
def get_dataset_analytics_endpoint(dataset_id: str):
    """Returns comparative analytics and auto-generated chart data for a dataset."""
    try:
        return get_dataset_comparative_analytics(dataset_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute dataset analytics: {str(e)}")

@app.get("/api/datasets/{dataset_id}/insights")
def get_dataset_insights_endpoint(dataset_id: str):
    """Generates data-backed AI insights and strategic recommendations."""
    try:
        insights = generate_ai_insights(dataset_id)
        return {
            "dataset_id": dataset_id,
            "insights": insights
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")

@app.delete("/api/datasets/{dataset_id}")
def delete_dataset_endpoint(dataset_id: str):
    """Deletes an uploaded dataset and cleans up its isolated database."""
    if dataset_id == "retail":
        raise HTTPException(status_code=400, detail="Cannot delete built-in retail dataset.")
    success = delete_user_dataset(dataset_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")
    return {"status": "success", "message": f"Dataset '{dataset_id}' deleted successfully."}



