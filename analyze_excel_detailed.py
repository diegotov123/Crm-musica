import pandas as pd
import json

# Leer el archivo Excel con diferentes opciones
df_full = pd.read_excel('/app/ventas_music.xlsx')

print("=== ANÁLISIS DETALLADO DEL EXCEL ===\n")

print("Datos completos del archivo:")
for i, row in df_full.iterrows():
    print(f"Fila {i}: {list(row)}")

print("\n" + "="*50)

# Intentar leer desde la fila 2 (índice 2) como encabezados
print("\nIntentando interpretar estructura:")
try:
    df_structured = pd.read_excel('/app/ventas_music.xlsx', skiprows=2)
    print("\nCon skiprows=2:")
    print(df_structured.head())
    
    print("\nColumnas:", list(df_structured.columns))
    print("Tipos:", df_structured.dtypes.to_dict())
    
    # Limpiar datos
    df_clean = df_structured.dropna(how='all')  # Eliminar filas completamente vacías
    print(f"\nDespués de limpiar filas vacías: {len(df_clean)} filas")
    print(df_clean)
    
except Exception as e:
    print(f"Error: {e}")

print("\n" + "="*50)

# Ver todas las hojas
try:
    excel_file = pd.ExcelFile('/app/ventas_music.xlsx')
    print(f"\nHojas disponibles: {excel_file.sheet_names}")
    
    for sheet_name in excel_file.sheet_names:
        print(f"\n--- Hoja: {sheet_name} ---")
        df_sheet = pd.read_excel('/app/ventas_music.xlsx', sheet_name=sheet_name)
        print(f"Dimensiones: {df_sheet.shape}")
        print("Primeras filas:")
        print(df_sheet.head())
except Exception as e:
    print(f"Error leyendo hojas: {e}")