import pandas as pd
import json

# Leer el archivo Excel
df = pd.read_excel('/app/ventas_music.xlsx')

print("=== ANÁLISIS DEL ARCHIVO EXCEL ===\n")

print("1. Información general:")
print(f"   - Filas: {len(df)}")
print(f"   - Columnas: {len(df.columns)}")
print(f"   - Tamaño del archivo: {df.memory_usage(deep=True).sum() / 1024:.2f} KB")

print("\n2. Columnas y tipos de datos:")
for col in df.columns:
    print(f"   - {col}: {df[col].dtype}")

print("\n3. Primeras 5 filas:")
print(df.head())

print("\n4. Información de valores nulos:")
print(df.isnull().sum())

print("\n5. Estadísticas básicas de columnas numéricas:")
print(df.describe())

print("\n6. Valores únicos en columnas categóricas:")
for col in df.select_dtypes(include=['object']).columns:
    unique_count = df[col].nunique()
    print(f"   - {col}: {unique_count} valores únicos")
    if unique_count <= 10:
        print(f"     Valores: {df[col].unique()}")

print("\n7. Muestra de datos en formato JSON:")
sample_data = df.head(3).to_dict('records')
print(json.dumps(sample_data, indent=2, default=str))