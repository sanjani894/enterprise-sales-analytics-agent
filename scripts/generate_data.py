import os
import pandas as pd
import numpy as np

os.makedirs("data/raw", exist_ok=True)

stores = pd.DataFrame({
    "store_nbr": [1, 2, 3],
    "city": ["Quito", "Guayaquil", "Cuenca"],
    "state": ["Pichincha", "Guayas", "Azuay"],
    "type": ["A", "B", "A"],
    "cluster": [1, 2, 1]
})
stores.to_csv("data/raw/stores.csv", index=False)

items = pd.DataFrame({
    "item_nbr": [101, 102, 103, 104, 105],
    "family": ["CLEANING", "GROCERY", "GROCERY", "BEVERAGES", "CLEANING"],
    "class": [1001, 1002, 1002, 1003, 1001],
    "perishable": [0, 0, 1, 0, 0]
})
items.to_csv("data/raw/items.csv", index=False)

dates = pd.date_range(start="2015-08-15", end="2015-09-15", freq="D")

oil = pd.DataFrame({
    "date": dates.strftime("%Y-%m-%d"),
    "dprice": [round(np.random.uniform(50.0, 70.0), 2) for _ in dates]
})
oil.to_csv("data/raw/oil.csv", index=False)

holidays = pd.DataFrame({
    "date": ["2015-08-15", "2015-09-01"],
    "type": ["Holiday", "Event"],
    "locale": ["National", "Local"],
    "locale_name": ["Ecuador", "Quito"],
    "description": ["Holiday", "Event"],
    "transferred": [False, False]
})
holidays.to_csv("data/raw/holidays_events.csv", index=False)

trans_rows = []
for d in dates:
    for store_nbr in [1, 2, 3]:
        trans_rows.append({
            "date": d.strftime("%Y-%m-%d"),
            "store_nbr": store_nbr,
            "transactions": np.random.randint(100, 500)
        })
transactions = pd.DataFrame(trans_rows)
transactions.to_csv("data/raw/transactions.csv", index=False)

train_rows = []
row_id = 1
for d in dates:
    for store_nbr in [1, 2, 3]:
        for item_nbr in [101, 102, 103]:
            train_rows.append({
                "id": row_id,
                "date": d.strftime("%Y-%m-%d"),
                "store_nbr": store_nbr,
                "item_nbr": item_nbr,
                "unit_sales": round(np.random.uniform(1.0, 50.0), 2),
                "onpromotion": 0
            })
            row_id += 1
train = pd.DataFrame(train_rows)
train.to_csv("data/raw/train.csv", index=False)

print("Updated onpromotion to integer flag (0/1)!")
