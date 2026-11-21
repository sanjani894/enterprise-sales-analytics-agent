import os
from decimal import Decimal
from typing import Dict, Any, List
from src.db import get_connection, release_connection

PRODUCT_NAME_MAP = {
    "101": "Wireless Headphones (101)",
    "102": "Smartphone Stand (102)",
    "103": "USB-C Cable (103)",
    "104": "Ergonomic Chair (104)",
    "105": "Mechanical Keyboard (105)",
}

def get_retail_kpis() -> Dict[str, Any]:
    """Retrieve top-level KPI metrics from Neon PostgreSQL."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Total Sales
        cur.execute("SELECT ROUND(COALESCE(SUM(sales), 0)::numeric, 2) FROM sales")
        res = cur.fetchone()
        total_sales = float(res[0]) if res and res[0] is not None else 0.0

        # Active Stores
        cur.execute("SELECT COUNT(DISTINCT store_nbr) FROM stores")
        res = cur.fetchone()
        active_stores = int(res[0]) if res and res[0] is not None else 0

        # Total Transactions
        cur.execute("SELECT COALESCE(SUM(transactions), 0) FROM transactions")
        res = cur.fetchone()
        total_transactions = int(res[0]) if res and res[0] is not None else 0

        # Average Oil Price
        cur.execute("SELECT ROUND(AVG(dcoilwtico)::numeric, 2) FROM oil_prices WHERE dcoilwtico IS NOT NULL")
        res = cur.fetchone()
        avg_oil_price = float(res[0]) if res and res[0] is not None else 0.0

        # Total Records across public retail tables
        cur.execute("""
            SELECT 
                (SELECT COUNT(*) FROM sales) +
                (SELECT COUNT(*) FROM stores) +
                (SELECT COUNT(*) FROM transactions) +
                (SELECT COUNT(*) FROM oil_prices) +
                (SELECT COUNT(*) FROM holidays)
        """)
        res = cur.fetchone()
        total_records = int(res[0]) if res and res[0] is not None else 0

        cur.close()
        return {
            "totalSales": total_sales,
            "activeStores": active_stores,
            "totalTransactions": total_transactions,
            "avgOilPrice": avg_oil_price,
            "totalRecords": total_records
        }
    finally:
        release_connection(conn)

def get_sales_trend() -> List[Dict[str, Any]]:
    """Retrieve daily time-series sales volume."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT TO_CHAR(date, 'YYYY-MM-DD') as day, ROUND(SUM(sales)::numeric, 2) as total_sales
            FROM sales
            GROUP BY date
            ORDER BY date
        """)
        rows = cur.fetchall()
        cur.close()
        return [{"date": r[0], "sales": float(r[1])} for r in rows]
    finally:
        release_connection(conn)

def get_store_performance() -> List[Dict[str, Any]]:
    """Retrieve per-store sales and footfall transactions."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                s.store_nbr,
                st.city,
                ROUND(SUM(s.sales)::numeric, 2) as sales,
                COALESCE(t.total_trans, 0) as transactions
            FROM sales s
            JOIN stores st ON s.store_nbr = st.store_nbr
            LEFT JOIN (
                SELECT store_nbr, SUM(transactions) as total_trans 
                FROM transactions 
                GROUP BY store_nbr
            ) t ON s.store_nbr = t.store_nbr
            GROUP BY s.store_nbr, st.city, t.total_trans
            ORDER BY sales DESC
        """)
        rows = cur.fetchall()
        cur.close()
        return [
            {
                "store": f"Store {r[0]} ({r[1]})",
                "store_nbr": r[0],
                "city": r[1],
                "sales": float(r[2]),
                "transactions": int(r[3])
            }
            for r in rows
        ]
    finally:
        release_connection(conn)

def get_family_performance() -> List[Dict[str, Any]]:
    """Retrieve sales by product family/category."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT family, ROUND(SUM(sales)::numeric, 2)
            FROM sales
            GROUP BY family
            ORDER BY SUM(sales) DESC
        """)
        rows = cur.fetchall()
        cur.close()
        return [
            {
                "family": PRODUCT_NAME_MAP.get(str(r[0]), str(r[0])),
                "family_id": str(r[0]),
                "sales": float(r[1])
            }
            for r in rows
        ]
    finally:
        release_connection(conn)

def get_oil_correlation() -> List[Dict[str, Any]]:
    """Retrieve oil price and daily sales for correlation analysis."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT TO_CHAR(date, 'YYYY-MM-DD') as day, ROUND(dcoilwtico::numeric, 2)
            FROM oil_prices
            WHERE dcoilwtico IS NOT NULL
            ORDER BY date
        """)
        oil_rows = cur.fetchall()
        cur.close()
        return [{"date": r[0], "oilPrice": float(r[1])} for r in oil_rows]
    finally:
        release_connection(conn)

def get_complete_retail_analytics() -> Dict[str, Any]:
    """Aggregate all retail analytics for the frontend dashboard."""
    kpis = get_retail_kpis()
    sales_trend = get_sales_trend()
    store_performance = get_store_performance()
    product_families = get_family_performance()
    oil_prices = get_oil_correlation()

    # Blend sales and oil for the comparison chart
    # Sales are 2015-08-15 to 2015-09-15 (32 points); oil are 2024-01-01 to 2024-01-31 (31 points)
    # Provide indexed points for synchronized multi-axis visualization
    oil_correlation = []
    min_len = min(len(sales_trend), len(oil_prices))
    for i in range(min_len):
        oil_correlation.append({
            "point": f"Day {i+1}",
            "sales": sales_trend[i]["sales"],
            "oilPrice": oil_prices[i]["oilPrice"],
            "salesDate": sales_trend[i]["date"],
            "oilDate": oil_prices[i]["date"],
        })

    return {
        "kpis": kpis,
        "salesTrend": sales_trend,
        "storePerformance": store_performance,
        "productFamilies": product_families,
        "oilCorrelation": oil_correlation,
    }

