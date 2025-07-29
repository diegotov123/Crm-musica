import pandas as pd
import json

# Leer la hoja específica de VENTAS MUSIC DT
df_ventas = pd.read_excel('/app/ventas_music.xlsx', sheet_name='VENTAS MUSIC DT')

print("=== ANÁLISIS HOJA VENTAS MUSIC DT ===\n")

print("1. Información general:")
print(f"   - Filas: {len(df_ventas)}")
print(f"   - Columnas: {len(df_ventas.columns)}")

print("\n2. Nombres de columnas:")
for i, col in enumerate(df_ventas.columns):
    print(f"   {i}: {col}")

print("\n3. Tipos de datos:")
for col in df_ventas.columns:
    print(f"   - {col}: {df_ventas[col].dtype}")

print("\n4. Primeras 10 filas:")
print(df_ventas.head(10))

print("\n5. Valores nulos por columna:")
print(df_ventas.isnull().sum())

print("\n6. Datos únicos en columnas text/object:")
for col in df_ventas.select_dtypes(include=['object']).columns:
    unique_count = df_ventas[col].nunique()
    print(f"   - {col}: {unique_count} valores únicos")
    if unique_count <= 20 and unique_count > 0:
        unique_values = df_ventas[col].dropna().unique()
        print(f"     Valores: {unique_values}")

# Limpiar datos y mostrar estructura final
df_clean = df_ventas.dropna(how='all')
print(f"\n7. Después de limpiar filas vacías: {len(df_clean)} filas")

print("\n8. Muestra de datos limpios:")
sample_clean = df_clean.head(5).fillna("")
print(sample_clean.to_string())

# Guardar una muestra en JSON para referencia
sample_json = df_clean.head(3).fillna("").to_dict('records')
print(f"\n9. Ejemplo en formato JSON:")
print(json.dumps(sample_json, indent=2, default=str))