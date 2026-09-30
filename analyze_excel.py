import pandas as pd
import json
import numpy as np

file_path = 'LICENCIAS BIENESTAR 2026-DIOMI.xlsx'

def default_converter(o):
    if hasattr(o, 'isoformat'):
        return o.isoformat()
    # Check if o is a numpy float or int
    if isinstance(o, (np.integer, np.floating)):
        return float(o) if isinstance(o, np.floating) else int(o)
    return str(o)

try:
    xl = pd.ExcelFile(file_path)
    result = {}
    for sheet_name in xl.sheet_names:
        df = xl.parse(sheet_name)
        df = df.dropna(axis=1, how='all')
        
        cleaned_rows = []
        # Dump all rows
        for index, row in df.iterrows():
            cleaned_row = {str(k): v for k, v in row.items() if pd.notna(v) and str(v).strip() != ""}
            if cleaned_row:
                cleaned_rows.append(cleaned_row)
        
        result[sheet_name] = cleaned_rows
    
    with open('temp_excel_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False, default=default_converter)
    print("Done")
except Exception as e:
    print(f"Error: {e}")
