import pandas as pd
df = pd.read_csv("data/raw/train.csv")

print("\nThe single highest-selling row:\n", df.sort_values("sales", ascending=False).head(1))


# print("Shape (rows, columns):", df.shape)
# print("\nColumn data types:\n", df.dtypes)
# print("\nFirst 5 rows:\n", df.head())
# print("\nDate range:", df["date"].min(), "to", df["date"].max())
# print("\nNumber of unique stores:", df["store_nbr"].nunique())
# print("\nNumber of unique product families:", df["family"].nunique())
# print("\nProduct families:\n", df["family"].unique())
# print("\nSales column summary stats:\n", df["sales"].describe())
# print("\nAny missing values?\n", df.isnull().sum())