import os
import re
import sqlite3
from typing import List, Dict, Any, Optional
from src.dataset_manager import get_dataset_metadata
from src.retail_analytics import get_complete_retail_analytics

CHART_COLORS = [
    "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", 
    "#06b6d4", "#ec4899", "#6366f1", "#14b8a6"
]

def recommend_chart_for_results(
    columns: List[str],
    rows: List[Any],
    plan_or_question: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Analyzes SQL query output structure and detected column types
    to automatically recommend and format an interactive Recharts visualization.
    """
    if not columns or not rows or len(rows) < 2:
        return None

    # Limit rows for chart visualization to prevent rendering clutter
    chart_rows = rows[:25]

    # Normalize rows into list of dicts
    dict_rows = []
    for r in chart_rows:
        if isinstance(r, dict):
            dict_rows.append(r)
        elif isinstance(r, (list, tuple)):
            dict_rows.append({col: r[i] if i < len(r) else None for i, col in enumerate(columns)})
        else:
            dict_rows.append({columns[0]: r})

    # Classify column types in the result
    num_cols = []
    cat_cols = []
    date_cols = []

    for col in columns:
        vals = [r[col] for r in dict_rows if r.get(col) is not None]
        if not vals:
            continue
        
        # Check if numeric
        all_numeric = True
        for v in vals:
            try:
                float(v)
            except (ValueError, TypeError):
                all_numeric = False
                break
        
        if all_numeric:
            num_cols.append(col)
        else:
            sample_str = str(vals[0]).strip()
            # Date check
            if re.match(r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}$|^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$", sample_str):
                date_cols.append(col)
            else:
                cat_cols.append(col)

    # Convert numeric values in dict_rows to floats
    formatted_data = []
    for r in dict_rows:
        new_r = {}
        for k, v in r.items():
            if k in num_cols:
                try:
                    new_r[k] = round(float(v), 2)
                except Exception:
                    new_r[k] = v
            else:
                new_r[k] = str(v) if v is not None else ""
        formatted_data.append(new_r)

    # Prefer metric columns over primary key / ID columns for Y-axis plotting
    metric_cols = [c for c in num_cols if not c.lower().endswith("_id") and c.lower() != "id"]
    active_num_cols = metric_cols if metric_cols else num_cols

    # 1. Date column + Numeric column(s) -> Line or Area Chart
    if date_cols and active_num_cols:
        x_key = date_cols[0]
        y_keys = active_num_cols[:2]
        return {
            "type": "area" if len(y_keys) == 1 else "line",
            "title": plan_or_question or f"Trend over {x_key.replace('_', ' ').title()}",
            "xAxisKey": x_key,
            "dataKeys": y_keys,
            "data": formatted_data,
            "colors": CHART_COLORS[:len(y_keys)],
        }

    # 2. Categorical column + 1 Numeric column
    if cat_cols and len(active_num_cols) == 1:
        x_key = cat_cols[0]
        y_key = active_num_cols[0]
        
        # If <= 6 rows and question implies proportion/breakdown -> Pie chart
        is_pie = (
            len(formatted_data) <= 6 and
            plan_or_question and
            any(kw in plan_or_question.lower() for kw in ["share", "ratio", "proportion", "breakdown", "percentage", "distribution"])
        )

        if is_pie:
            return {
                "type": "pie",
                "title": plan_or_question or f"Distribution of {y_key.replace('_', ' ').title()}",
                "nameKey": x_key,
                "dataKey": y_key,
                "data": formatted_data,
                "colors": CHART_COLORS[:len(formatted_data)],
            }
        
        return {
            "type": "bar",
            "title": plan_or_question or f"{y_key.replace('_', ' ').title()} by {x_key.replace('_', ' ').title()}",
            "xAxisKey": x_key,
            "dataKeys": [y_key],
            "data": formatted_data,
            "colors": [CHART_COLORS[0]],
        }

    # 3. Categorical column + Multiple Numeric columns -> Grouped Bar Chart
    if cat_cols and len(active_num_cols) >= 2:
        x_key = cat_cols[0]
        y_keys = active_num_cols[:3]
        return {
            "type": "bar",
            "title": plan_or_question or f"Comparison across {x_key.replace('_', ' ').title()}",
            "xAxisKey": x_key,
            "dataKeys": y_keys,
            "data": formatted_data,
            "colors": CHART_COLORS[:len(y_keys)],
        }

    # 4. If 2 numeric columns and no category -> Line chart or comparison
    if len(num_cols) >= 2 and not cat_cols:
        x_key = num_cols[0]
        y_keys = [num_cols[1]]
        return {
            "type": "line",
            "title": plan_or_question or f"{y_keys[0].title()} vs {x_key.title()}",
            "xAxisKey": x_key,
            "dataKeys": y_keys,
            "data": formatted_data,
            "colors": [CHART_COLORS[0]],
        }

    return None


def get_dataset_comparative_analytics(dataset_id: str = "retail") -> Dict[str, Any]:
    """
    Computes comparative analytics and auto-generated chart data for either
    the built-in retail dataset (Neon PostgreSQL) or any user-uploaded dataset (SQLite).
    """
    if dataset_id == "retail":
        return get_complete_retail_analytics()

    meta = get_dataset_metadata(dataset_id)
    if not meta:
        raise ValueError(f"Dataset '{dataset_id}' not found.")

    db_path = meta.get("db_path")
    if not db_path or not os.path.exists(db_path):
        raise ValueError(f"Database file for '{dataset_id}' not found.")

    conn = sqlite3.connect(f"file:{os.path.abspath(db_path)}?mode=ro", uri=True)
    try:
        cur = conn.cursor()

        # 1. Total records
        cur.execute("SELECT count(*) FROM dataset")
        total_records = cur.fetchone()[0]

        num_cols = meta.get("numerical_columns", [])
        cat_cols = meta.get("categorical_columns", [])
        date_cols = meta.get("date_columns", [])

        # 2. Primary metric KPI cards (prefer real metric over ID columns)
        kpis = {
            "totalRecords": total_records,
            "datasetName": meta.get("name"),
            "columnsCount": meta.get("columns"),
        }

        # Select true metric (e.g. salary, marks) rather than ID
        metric_candidates = [c for c in num_cols if not c.lower().endswith("_id") and c.lower() != "id"]
        primary_num = metric_candidates[0] if metric_candidates else (num_cols[0] if num_cols else None)

        if primary_num:
            cur.execute(f"SELECT ROUND(AVG({primary_num}), 2), ROUND(MIN({primary_num}), 2), ROUND(MAX({primary_num}), 2) FROM dataset WHERE {primary_num} IS NOT NULL")
            num_stats = cur.fetchone()
            if num_stats:
                kpis["primaryMetric"] = primary_num.replace("_", " ").title()
                kpis["primaryAvg"] = num_stats[0]
                kpis["primaryMin"] = num_stats[1]
                kpis["primaryMax"] = num_stats[2]

        # 3. Categorical comparisons (Bar chart)
        comparison_chart = None
        if cat_cols and primary_num:
            # Prefer grouping by department or category if available
            dept_candidates = [c for c in cat_cols if any(k in c.lower() for k in ["dept", "department", "category", "role", "family"])]
            primary_cat = dept_candidates[0] if dept_candidates else cat_cols[0]
            cur.execute(f"""
                SELECT {primary_cat}, ROUND(AVG({primary_num}), 2) as avg_metric, COUNT(*) as count
                FROM dataset
                WHERE {primary_cat} IS NOT NULL
                GROUP BY {primary_cat}
                ORDER BY avg_metric DESC
                LIMIT 10
            """)
            cat_rows = cur.fetchall()
            cat_data = [
                {"category": str(r[0]), "avg_value": r[1], "count": r[2]}
                for r in cat_rows
            ]
            comparison_chart = {
                "type": "bar",
                "title": f"Average {primary_num.replace('_', ' ').title()} by {primary_cat.replace('_', ' ').title()}",
                "xAxisKey": "category",
                "dataKeys": ["avg_value"],
                "data": cat_data,
                "colors": ["#3b82f6"]
            }

        # 4. Category distribution (Pie chart)
        distribution_chart = None
        if cat_cols:
            dept_cat = [c for c in cat_cols if any(k in c.lower() for k in ["dept", "department", "category", "role", "family", "type", "grade"])]
            dist_cat = dept_cat[0] if dept_cat else cat_cols[0]
            cur.execute(f"""
                SELECT {dist_cat}, COUNT(*) as count
                FROM dataset
                WHERE {dist_cat} IS NOT NULL
                GROUP BY {dist_cat}
                ORDER BY count DESC
                LIMIT 6
            """)
            dist_rows = cur.fetchall()
            dist_data = [{"name": str(r[0]), "value": r[1]} for r in dist_rows]
            distribution_chart = {
                "type": "pie",
                "title": f"Distribution by {dist_cat.replace('_', ' ').title()}",
                "nameKey": "name",
                "dataKey": "value",
                "data": dist_data,
                "colors": CHART_COLORS[:len(dist_data)]
            }

        # 5. Trend Chart (if date column exists)
        trend_chart = None
        if date_cols and num_cols:
            primary_date = date_cols[0]
            primary_num = num_cols[0]
            cur.execute(f"""
                SELECT {primary_date}, ROUND(AVG({primary_num}), 2) as val
                FROM dataset
                WHERE {primary_date} IS NOT NULL
                GROUP BY {primary_date}
                ORDER BY {primary_date}
                LIMIT 30
            """)
            trend_rows = cur.fetchall()
            trend_data = [{"date": str(r[0]), "value": r[1]} for r in trend_rows]
            trend_chart = {
                "type": "line",
                "title": f"{primary_num.replace('_', ' ').title()} over Time",
                "xAxisKey": "date",
                "dataKeys": ["value"],
                "data": trend_data,
                "colors": ["#10b981"]
            }

        cur.close()
        return {
            "dataset_id": dataset_id,
            "dataset_name": meta.get("name"),
            "kpis": kpis,
            "comparisonChart": comparison_chart,
            "distributionChart": distribution_chart,
            "trendChart": trend_chart,
            "numericalColumns": num_cols,
            "categoricalColumns": cat_cols,
            "dateColumns": date_cols,
        }
    finally:
        conn.close()
