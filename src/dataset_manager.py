import os
import re
import json
import uuid
import datetime
import sqlite3
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple

DATASETS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "user_datasets"))
CATALOG_PATH = os.path.join(DATASETS_DIR, "catalog.json")

# Ensure user_datasets directory exists
os.makedirs(DATASETS_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB
MAX_ROWS_LIMIT = 100000

def _load_catalog() -> Dict[str, Any]:
    if not os.path.exists(CATALOG_PATH):
        return {}
    try:
        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _save_catalog(catalog: Dict[str, Any]) -> None:
    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, default=str)

def sanitize_column_name(col_name: str) -> str:
    """Sanitize column name to be clean, readable, and safe for SQL queries."""
    s = str(col_name).strip()
    # Replace spaces and punctuation with underscores
    s = re.sub(r"[^\w]+", "_", s)
    s = s.strip("_")
    # If starts with a digit, prefix with 'col_'
    if s and s[0].isdigit():
        s = "col_" + s
    return s.lower() if s else "col"

def detect_column_types(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Examines DataFrame columns to detect SQL storage types and semantic types
    (numerical, categorical, date/datetime, text).
    """
    schema = {}
    numerical_cols = []
    categorical_cols = []
    date_cols = []
    text_cols = []
    col_details = {}

    for col in df.columns:
        series = df[col]
        dtype_str = str(series.dtype).lower()
        null_count = int(series.isna().sum())
        non_null_series = series.dropna()
        n_unique = int(non_null_series.nunique())

        detected_sql_type = "TEXT"
        semantic_type = "text"

        # 1. Date/DateTime check
        is_date = False
        if "datetime" in dtype_str:
            is_date = True
        elif dtype_str == "object" and len(non_null_series) > 0:
            sample = non_null_series.head(20).astype(str)
            # Check if looks like a date (e.g. YYYY-MM-DD, MM/DD/YYYY)
            date_matches = sum(1 for val in sample if re.match(r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}$|^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$", val.strip()))
            if date_matches / len(sample) >= 0.7:
                try:
                    pd.to_datetime(sample, errors="raise")
                    is_date = True
                except Exception:
                    pass

        if is_date:
            detected_sql_type = "DATE"
            semantic_type = "date"
            date_cols.append(col)
        # 2. Integer check
        elif "int" in dtype_str:
            detected_sql_type = "INTEGER"
            semantic_type = "numerical"
            numerical_cols.append(col)
        # 3. Float check
        elif "float" in dtype_str:
            detected_sql_type = "REAL"
            semantic_type = "numerical"
            numerical_cols.append(col)
        # 4. Boolean check
        elif "bool" in dtype_str:
            detected_sql_type = "BOOLEAN"
            semantic_type = "categorical"
            categorical_cols.append(col)
        # 5. String / Object check
        else:
            # Check if all non-null values can be numeric
            converted_numeric = pd.to_numeric(non_null_series, errors="coerce")
            if len(non_null_series) > 0 and converted_numeric.isna().sum() == 0:
                if (converted_numeric % 1 == 0).all():
                    detected_sql_type = "INTEGER"
                else:
                    detected_sql_type = "REAL"
                semantic_type = "numerical"
                numerical_cols.append(col)
            elif n_unique < 50 or (len(df) > 0 and (n_unique / len(df) < 0.25)):
                detected_sql_type = "TEXT"
                semantic_type = "categorical"
                categorical_cols.append(col)
            else:
                detected_sql_type = "TEXT"
                semantic_type = "text"
                text_cols.append(col)

        schema[col] = detected_sql_type

        # Summary statistics
        stats: Dict[str, Any] = {
            "sql_type": detected_sql_type,
            "semantic_type": semantic_type,
            "null_count": null_count,
            "unique_count": n_unique,
            "sample_values": [str(x) for x in non_null_series.head(5).tolist()]
        }

        if semantic_type == "numerical" and len(non_null_series) > 0:
            numeric_vals = pd.to_numeric(non_null_series, errors="coerce").dropna()
            if not numeric_vals.empty:
                stats["min"] = float(numeric_vals.min())
                stats["max"] = float(numeric_vals.max())
                stats["mean"] = round(float(numeric_vals.mean()), 2)

        col_details[col] = stats

    return {
        "sql_schema": schema,
        "numerical_columns": numerical_cols,
        "categorical_columns": categorical_cols,
        "date_columns": date_cols,
        "text_columns": text_cols,
        "column_details": col_details,
    }

def process_and_save_dataset(
    file_path: str,
    original_filename: str,
    custom_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Reads CSV or Excel file, validates, detects types, writes to an isolated SQLite DB,
    and updates the catalog.
    """
    # 1. Validation
    ext = os.path.splitext(original_filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file format '{ext}'. Allowed: CSV, XLSX, XLS.")

    file_size = os.path.getsize(file_path)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"File size ({file_size / (1024*1024):.1f}MB) exceeds 25MB limit.")

    # 2. Load into Pandas
    try:
        if ext == ".csv":
            # Try utf-8, fallback to common encodings
            try:
                df = pd.read_csv(file_path, encoding="utf-8")
            except UnicodeDecodeError:
                try:
                    df = pd.read_csv(file_path, encoding="utf-8-sig")
                except UnicodeDecodeError:
                    df = pd.read_csv(file_path, encoding="latin1")
        else:
            df = pd.read_excel(file_path)
    except Exception as e:
        raise ValueError(f"Error parsing file: {str(e)}")

    if df.empty:
        raise ValueError("Uploaded dataset is empty.")

    if len(df) > MAX_ROWS_LIMIT:
        raise ValueError(f"Dataset has {len(df)} rows, exceeding maximum limit of {MAX_ROWS_LIMIT} rows.")

    # 3. Clean column names
    col_mapping = {}
    used_names = set()
    for col in df.columns:
        clean = sanitize_column_name(col)
        # Ensure uniqueness
        base = clean
        counter = 1
        while clean in used_names:
            clean = f"{base}_{counter}"
            counter += 1
        used_names.add(clean)
        col_mapping[col] = clean

    df = df.rename(columns=col_mapping)

    # 4. Schema and Type Detection
    type_info = detect_column_types(df)

    # 5. Store in dedicated isolated SQLite Database
    dataset_id = f"ds_{uuid.uuid4().hex[:8]}"
    db_filename = f"{dataset_id}.db"
    db_path = os.path.join(DATASETS_DIR, db_filename)

    conn = sqlite3.connect(db_path)
    # Store table named 'dataset'
    df.to_sql("dataset", conn, if_exists="replace", index=False)
    conn.commit()
    conn.close()

    # 6. Generate schema description for LLM Text-to-SQL
    columns_desc = []
    for col, sql_type in type_info["sql_schema"].items():
        detail = type_info["column_details"][col]
        samples = ", ".join(detail["sample_values"][:3])
        columns_desc.append(f"  {col} {sql_type} (e.g., {samples})")
    
    schema_text = f"Table 'dataset' has columns:\n" + "\n".join(columns_desc)

    dataset_name = (custom_name or os.path.splitext(original_filename)[0]).strip()
    created_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    # 7. Prepare preview payload (first 10 rows)
    preview_rows = df.head(10).to_dict(orient="records")
    # Convert any Timestamp or NaN to json-safe types
    safe_preview_rows = []
    for r in preview_rows:
        safe_r = {}
        for k, v in r.items():
            if pd.isna(v):
                safe_r[k] = None
            elif isinstance(v, (pd.Timestamp, datetime.date, datetime.datetime)):
                safe_r[k] = str(v)
            else:
                safe_r[k] = v
        safe_preview_rows.append(safe_r)

    dataset_meta = {
        "id": dataset_id,
        "name": dataset_name,
        "original_filename": original_filename,
        "file_type": ext.lstrip(".").upper(),
        "size_bytes": file_size,
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": list(df.columns),
        "schema": type_info["sql_schema"],
        "schema_text": schema_text,
        "numerical_columns": type_info["numerical_columns"],
        "categorical_columns": type_info["categorical_columns"],
        "date_columns": type_info["date_columns"],
        "text_columns": type_info["text_columns"],
        "column_details": type_info["column_details"],
        "created_at": created_at,
        "status": "Ready",
        "type": "SQLite (Isolated)",
        "db_path": db_path,
        "preview": {
            "columns": list(df.columns),
            "rows": safe_preview_rows,
        }
    }

    # Save to catalog
    catalog = _load_catalog()
    catalog[dataset_id] = dataset_meta
    _save_catalog(catalog)

    return dataset_meta

def list_all_datasets() -> List[Dict[str, Any]]:
    """Returns the built-in retail dataset plus all uploaded datasets."""
    # Built-in Neon PostgreSQL Retail dataset
    retail_entry = {
        "id": "retail",
        "name": "Retail Sales (Ecuador Grocery)",
        "type": "PostgreSQL (Neon)",
        "rows": 417,
        "columns": 16,
        "status": "Ready",
        "created_at": "Built-in Neon DB",
        "schema": {
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
        "preview": {
            "columns": ["store_nbr", "city", "state", "total_sales", "transactions"],
            "rows": [
                {"store_nbr": 1, "city": "Quito", "state": "Pichincha", "total_sales": 2507.13, "transactions": 8049},
                {"store_nbr": 2, "city": "Guayaquil", "state": "Guayas", "total_sales": 2397.24, "transactions": 8549},
                {"store_nbr": 3, "city": "Cuenca", "state": "Azuay", "total_sales": 2388.17, "transactions": 9143},
            ]
        }
    }

    catalog = _load_catalog()
    result = [retail_entry]
    for ds_id, meta in catalog.items():
        result.append(meta)
    return result

def get_dataset_metadata(dataset_id: str) -> Optional[Dict[str, Any]]:
    if dataset_id == "retail":
        datasets = list_all_datasets()
        return datasets[0]
    catalog = _load_catalog()
    return catalog.get(dataset_id)

def delete_user_dataset(dataset_id: str) -> bool:
    if dataset_id == "retail":
        return False  # Protected built-in dataset
    catalog = _load_catalog()
    if dataset_id not in catalog:
        return False

    meta = catalog[dataset_id]
    db_path = meta.get("db_path")
    if db_path and os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass

    del catalog[dataset_id]
    _save_catalog(catalog)
    return True

def execute_dataset_sql(dataset_id: str, sql: str) -> Tuple[List[str], List[Any]]:
    """Executes a validated read-only SQL query against an uploaded dataset's SQLite DB."""
    if dataset_id == "retail":
        raise ValueError("Retail dataset queries should be executed against PostgreSQL engine.")

    meta = get_dataset_metadata(dataset_id)
    if not meta:
        raise ValueError(f"Dataset '{dataset_id}' not found.")

    db_path = meta.get("db_path")
    if not db_path or not os.path.exists(db_path):
        raise ValueError(f"Database file for dataset '{dataset_id}' not found.")

    # Connect to SQLite in read-only mode using URI
    uri = f"file:{os.path.abspath(db_path)}?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    try:
        cur = conn.cursor()
        cur.execute(sql)
        columns = [d[0] for d in cur.description] if cur.description else []
        rows = cur.fetchall()
        cur.close()
        return columns, rows
    finally:
        conn.close()

