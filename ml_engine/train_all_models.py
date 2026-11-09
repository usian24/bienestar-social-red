import os
import sys
import json
import unicodedata
import re
from datetime import datetime, timezone
import numpy as np
import pandas as pd
import joblib

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.ensemble import IsolationForest, RandomForestClassifier, GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, f1_score, recall_score, roc_auc_score, silhouette_score
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'dataset.json')
MODELS_DIR = os.path.join(BASE_DIR, 'models')
OUTPUT_DIR = os.path.join(BASE_DIR, 'output')

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

MESES_NOMBRES = {
    1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
    5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
    9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
}
MESES_ABREV = {
    1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
    7: 'Jul', 8: 'Ago', 9: 'Set', 10: 'Oct', 11: 'Nov', 12: 'Dic'
}
COSTO_DIARIO_SUBSIDIO = 78.50


def normalize_mr(name: str) -> str:
    if not name:
        return ''
    s = str(name).upper()
    s = unicodedata.normalize('NFD', s)
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
    s = re.sub(r'^MICRO\s*RED\s+', '', s)
    s = re.sub(r'^MR\s+', '', s)
    s = re.sub(r'SAN\s*FCO\.?', 'SAN FRANCISCO', s)
    s = re.sub(r'STA\.?', 'SANTA', s)
    s = s.replace('.', ' ')
    s = re.sub(r'\s+', ' ', s).strip()
    return s


DISTANCIAS_NORMALIZADAS = {
    'SEDE RED SALUD HUANUCO': 0.5,
    'HUANUCO': 0.5,
    'AMARILIS': 0.8,
    'PILLCO MARCA': 1.0,
    'APARICIO POMARES': 1.0,
    'SANTA MARIA DEL VALLE': 1.5,
    'CHINCHAO': 2.5,
    'HUANCAPALLAC': 2.0,
    'ACOMAYO': 2.5,
    'SAN FRANCISCO DE CAYRAN': 2.5,
    'CHURUBAMBA': 3.5,
    'KICHKI': 3.5,
    'QUISQUI': 3.5,
    'YACUS': 4.0,
    'SAN PEDRO DE CHAULAN': 4.5,
    'MARGOS': 4.5,
    'YARUMAYO': 5.0,
    'PILLAO': 5.5,
}


def get_distancia_microred(nombre_mr: str) -> float:
    norm = normalize_mr(nombre_mr)
    if norm in DISTANCIAS_NORMALIZADAS:
        return DISTANCIAS_NORMALIZADAS[norm]
    for k, val in DISTANCIAS_NORMALIZADAS.items():
        if k in norm or norm in k:
            return val
    return 2.0


def parse_ymd(fecha_str):
    if not fecha_str:
        return None
    try:
        return datetime.strptime(str(fecha_str)[:10], '%Y-%m-%d')
    except Exception:
        return None


def compute_exact_license_subsidies(licencias_raw):
    """
    Aplica la regla oficial de Bienestar Social / EsSalud:
    - Excluye PARTICULAR_PERDIDO de días subsidiados o cubiertos por la Red.
    - En Salud (ENFERMEDAD_COMUN / ACCIDENTE_COMUN): tope acumulativo de 20 días/año calendario para la Red;
      desde el día 21 corresponde Subsidio EsSalud. Reinicio automático cada 1 de enero.
    - MATERNIDAD: 100% subsidiada por EsSalud desde el día 1.
    - PATERNIDAD y LEY_30012: 100% asumidas por la Red (0 días subsidio EsSalud).
    """
    ordenadas = sorted(
        licencias_raw,
        key=lambda x: (str(x.get('fechaInicio') or '9999-12-31'), str(x.get('creadoEn') or ''))
    )
    acumulado_trab_anio = {}
    resultados = []

    for lic in ordenadas:
        origen = lic.get('origen') or 'ESSALUD_CITT'
        tipo = lic.get('tipoLicencia') or 'ENFERMEDAD_COMUN'
        dias = max(0, int(lic.get('diasOtorgados') or 0))
        dt_ini = parse_ymd(lic.get('fechaInicio'))
        anio = dt_ini.year if dt_ini else int(lic.get('anioEjercicio') or datetime.now().year)
        mes = dt_ini.month if dt_ini else int(lic.get('mesEjercicio') or datetime.now().month)

        dias_salud = 0
        dias_red = 0
        dias_subsidio = 0

        if origen != 'PARTICULAR_PERDIDO':
            if tipo in ('ENFERMEDAD_COMUN', 'ACCIDENTE_COMUN'):
                dias_salud = dias
                key = (lic.get('trabajadorId'), anio)
                prev = acumulado_trab_anio.get(key, 0)
                nuevo = prev + dias
                acumulado_trab_anio[key] = nuevo

                red_antes = min(20, prev)
                red_despues = min(20, nuevo)
                sub_antes = max(0, prev - 20)
                sub_despues = max(0, nuevo - 20)

                dias_red = red_despues - red_antes
                dias_subsidio = sub_despues - sub_antes
            elif tipo == 'MATERNIDAD':
                dias_subsidio = dias
            elif tipo in ('PATERNIDAD', 'LEY_30012'):
                dias_red = dias

        enriched = dict(lic)
        enriched['_anio'] = anio
        enriched['_mes'] = mes
        enriched['_diasSalud'] = dias_salud
        enriched['_diasRed'] = dias_red
        enriched['_diasSubsidioSalud'] = dias_subsidio if tipo in ('ENFERMEDAD_COMUN', 'ACCIDENTE_COMUN') else 0
        enriched['_diasSubsidioTotal'] = dias_subsidio
        enriched['_esPerdido'] = (origen == 'PARTICULAR_PERDIDO')
        resultados.append(enriched)

    return resultados


print('=' * 70)
print('  ENTRENAMIENTO MACHINE LEARNING - BIENESTAR SOCIAL RED HUANUCO')
print('=' * 70)

with open(DATA_FILE, 'r', encoding='utf-8') as f:
    raw_data = json.load(f)

trabajadores_raw = raw_data.get('trabajadores', [])
licencias_raw = raw_data.get('licencias', [])
establecimientos_raw = raw_data.get('establecimientos', [])
total_establecimientos_real = int(raw_data.get('totalEstablecimientos') or len(establecimientos_raw) or 85)

licencias_enr = compute_exact_license_subsidies(licencias_raw)

df_trabajadores = pd.DataFrame(trabajadores_raw)
df_licencias = pd.DataFrame(licencias_enr)

print(f'[ML] Dataset cargado: {len(df_trabajadores)} trabajadores, {len(df_licencias)} licencias, {total_establecimientos_real} establecimientos.')

# ==============================================================================
# MODELO 1: FORECASTING DE SUBSIDIOS Y AUSENTISMO (DATOS REALES POSTGRESQL)
# ==============================================================================
print('\n--- [MODELO 1] Pronostico de Subsidios y Demanda Mensual (>20 dias) ---')

df_salud = df_licencias[
    (df_licencias['tipoLicencia'].isin(['ENFERMEDAD_COMUN', 'ACCIDENTE_COMUN'])) &
    (~df_licencias['_esPerdido'])
].copy() if len(df_licencias) > 0 else pd.DataFrame()

if len(df_salud) > 0:
    monthly_raw = df_salud.groupby(['_anio', '_mes']).agg(
        total_dias=('diasOtorgados', 'sum'),
        dias_subsidio=('_diasSubsidioSalud', 'sum'),
        dias_red=('_diasRed', 'sum'),
        num_licencias=('id', 'count'),
        particulares=('origen', lambda x: int((x == 'PARTICULAR').sum())),
        citt=('origen', lambda x: int((x == 'ESSALUD_CITT').sum()))
    ).reset_index().rename(columns={'_anio': 'anio', '_mes': 'mes'}).sort_values(['anio', 'mes']).reset_index(drop=True)
else:
    monthly_raw = pd.DataFrame(columns=['anio', 'mes', 'total_dias', 'dias_subsidio', 'dias_red', 'num_licencias', 'particulares', 'citt'])

# Historial real exacto para gráficos UI (hasta últimos 12 meses con datos reales)
historial_mensual_ui = []
for _, r in monthly_raw.tail(12).iterrows():
    a_i = int(r['anio'])
    m_i = int(r['mes'])
    historial_mensual_ui.append({
        'anio': a_i,
        'mesNum': m_i,
        'mes': f"{MESES_ABREV[m_i]} {str(a_i)[-2:]}",
        'mesAbrev': MESES_ABREV[m_i],
        'mesNombre': MESES_NOMBRES[m_i],
        'diasSubsidio': int(r['dias_subsidio']),
        'totalDiasSalud': int(r['total_dias']),
        'diasRed': int(r['dias_red']),
        'numLicencias': int(r['num_licencias']),
    })

# Serie de entrenamiento: usar meses consolidados reales (evitando cola parcial <4 registros si hay >=6 meses completos)
active_months = monthly_raw[monthly_raw['num_licencias'] >= 4].copy().reset_index(drop=True)
if len(active_months) < 5:
    active_months = monthly_raw.copy().reset_index(drop=True)

now_dt = datetime.now()

if len(active_months) >= 4:
    # Rellenar posibles huecos intermedios sin perder continuidad cronológica
    min_y, min_m = int(active_months.iloc[0]['anio']), int(active_months.iloc[0]['mes'])
    max_y, max_m = int(active_months.iloc[-1]['anio']), int(active_months.iloc[-1]['mes'])
    grid = []
    cy, cm = min_y, min_m
    lookup = {(int(r['anio']), int(r['mes'])): r for _, r in active_months.iterrows()}
    while (cy, cm) <= (max_y, max_m):
        if (cy, cm) in lookup:
            r = lookup[(cy, cm)]
            grid.append({
                'anio': cy, 'mes': cm,
                'total_dias': float(r['total_dias']),
                'dias_subsidio': float(r['dias_subsidio']),
                'num_licencias': int(r['num_licencias'])
            })
        else:
            grid.append({'anio': cy, 'mes': cm, 'total_dias': 0.0, 'dias_subsidio': 0.0, 'num_licencias': 0})
        cm += 1
        if cm > 12:
            cm = 1
            cy += 1

    ts_df = pd.DataFrame(grid)
    mean_sub = float(ts_df['dias_subsidio'].mean())
    ts_df['t_idx'] = np.arange(len(ts_df), dtype=float)
    ts_df['lag_1'] = ts_df['dias_subsidio'].shift(1).fillna(mean_sub)
    ts_df['lag_2'] = ts_df['dias_subsidio'].shift(2).fillna(mean_sub)
    ts_df['rolling_mean_3'] = ts_df['dias_subsidio'].rolling(3, min_periods=1).mean()
    ts_df['mes_sin'] = np.sin(2 * np.pi * ts_df['mes'] / 12.0)
    ts_df['mes_cos'] = np.cos(2 * np.pi * ts_df['mes'] / 12.0)

    features_ts = ['mes', 't_idx', 'lag_1', 'lag_2', 'rolling_mean_3', 'mes_sin', 'mes_cos']
    X_ts = ts_df[features_ts]
    y_ts = ts_df['dias_subsidio']

    n_test = max(2, int(round(len(X_ts) * 0.25)))
    if len(X_ts) - n_test < 2:
        n_test = 1
    split_idx = len(X_ts) - n_test
    X_train_ts, X_test_ts = X_ts.iloc[:split_idx], X_ts.iloc[split_idx:]
    y_train_ts, y_test_ts = y_ts.iloc[:split_idx], y_ts.iloc[split_idx:]

    scaler_ts = StandardScaler()
    X_train_sc = scaler_ts.fit_transform(X_train_ts)
    X_test_sc = scaler_ts.transform(X_test_ts)

    model_ridge_ts = Ridge(alpha=5.0, random_state=42).fit(X_train_sc, y_train_ts)
    preds_ridge = np.clip(model_ridge_ts.predict(X_test_sc), 0, None)
    mae_ridge = float(mean_absolute_error(y_test_ts, preds_ridge))
    rmse_ridge = float(np.sqrt(mean_squared_error(y_test_ts, preds_ridge)))

    model_gbm_ts = GradientBoostingRegressor(n_estimators=60, max_depth=2, learning_rate=0.08, random_state=42).fit(X_train_ts, y_train_ts)
    preds_gbm = np.clip(model_gbm_ts.predict(X_test_ts), 0, None)
    mae_gbm = float(mean_absolute_error(y_test_ts, preds_gbm))
    rmse_gbm = float(np.sqrt(mean_squared_error(y_test_ts, preds_gbm)))

    # Seleccionar algoritmo ganador sobre ventana de prueba cronológica y reentrenar sobre toda la serie real
    usa_ridge = mae_ridge <= mae_gbm
    if usa_ridge:
        scaler_full_ts = StandardScaler().fit(X_ts)
        champion_model_ts = Ridge(alpha=5.0, random_state=42).fit(scaler_full_ts.transform(X_ts), y_ts)
        mae_final, rmse_final = mae_ridge, rmse_ridge
        modelo_m1_nombre = 'Ridge Temporal Regularizado'
    else:
        scaler_full_ts = None
        champion_model_ts = GradientBoostingRegressor(n_estimators=60, max_depth=2, learning_rate=0.08, random_state=42).fit(X_ts, y_ts)
        mae_final, rmse_final = mae_gbm, rmse_gbm
        modelo_m1_nombre = 'Gradient Boosting Regressor'

    joblib.dump({'model': champion_model_ts, 'scaler': scaler_full_ts, 'features': features_ts, 'modelo': modelo_m1_nombre}, os.path.join(MODELS_DIR, 'model_forecasting.joblib'))

    # Horizonte de proyección dinámico: próximos 3 meses desde mes actual (o posterior al último mes completo)
    ultimo_dato_y = int(monthly_raw.iloc[-1]['anio']) if len(monthly_raw) > 0 else now_dt.year
    ultimo_dato_m = int(monthly_raw.iloc[-1]['mes']) if len(monthly_raw) > 0 else now_dt.month
    start_y, start_m = now_dt.year, now_dt.month
    if (ultimo_dato_y, ultimo_dato_m) >= (start_y, start_m):
        start_y, start_m = ultimo_dato_y, ultimo_dato_m + 1
        if start_m > 12:
            start_m = 1
            start_y += 1

    hist_vals = list(ts_df['dias_subsidio'].astype(float).values)
    t_next = float(len(ts_df))
    proyecciones = []
    min_floor = max(0, int(round(np.percentile(ts_df['dias_subsidio'], 10) * 0.5)))
    max_cap = int(round(ts_df['dias_subsidio'].max() * 1.45))

    fy, fm = start_y, start_m
    for _ in range(3):
        lag1 = hist_vals[-1]
        lag2 = hist_vals[-2] if len(hist_vals) >= 2 else lag1
        roll3 = float(np.mean(hist_vals[-3:]))
        input_row = pd.DataFrame([{
            'mes': fm,
            't_idx': t_next,
            'lag_1': lag1,
            'lag_2': lag2,
            'rolling_mean_3': roll3,
            'mes_sin': np.sin(2 * np.pi * fm / 12.0),
            'mes_cos': np.cos(2 * np.pi * fm / 12.0)
        }])
        if usa_ridge and scaler_full_ts is not None:
            raw_pred = float(champion_model_ts.predict(scaler_full_ts.transform(input_row))[0])
        else:
            raw_pred = float(champion_model_ts.predict(input_row)[0])

        pred_dias = int(round(max(min_floor, min(max_cap, raw_pred))))
        hist_vals.append(float(pred_dias))
        t_next += 1.0

        rango_min = max(0, pred_dias - int(round(rmse_final)))
        rango_max = max(pred_dias, pred_dias + int(round(rmse_final)))
        proyecciones.append({
            'mes': MESES_NOMBRES[fm],
            'mesAbrev': MESES_ABREV[fm],
            'mesNum': fm,
            'anio': fy,
            'diasSubsidioEstimados': pred_dias,
            'rangoMin': rango_min,
            'rangoMax': rango_max,
            'montoEstimadoRecupero': round(pred_dias * COSTO_DIARIO_SUBSIDIO, 2)
        })
        fm += 1
        if fm > 12:
            fm = 1
            fy += 1
else:
    mae_ridge = rmse_final = mae_final = 0.0
    modelo_m1_nombre = 'Promedio Movil Historico'
    prom_sub = float(monthly_raw['dias_subsidio'].mean()) if len(monthly_raw) > 0 else 0.0
    pred_base = int(round(prom_sub))
    joblib.dump({'model': None, 'prom': pred_base}, os.path.join(MODELS_DIR, 'model_forecasting.joblib'))
    proyecciones = []
    fy, fm = now_dt.year, now_dt.month
    for _ in range(3):
        proyecciones.append({
            'mes': MESES_NOMBRES[fm],
            'mesAbrev': MESES_ABREV[fm],
            'mesNum': fm,
            'anio': fy,
            'diasSubsidioEstimados': pred_base,
            'rangoMin': max(0, int(round(pred_base * 0.8))),
            'rangoMax': int(round(pred_base * 1.2)),
            'montoEstimadoRecupero': round(pred_base * COSTO_DIARIO_SUBSIDIO, 2)
        })
        fm += 1
        if fm > 12:
            fm = 1
            fy += 1

print(f'  * Modelo ganador M1: {modelo_m1_nombre} | MAE: {mae_final:.2f} dias | RMSE: {rmse_final:.2f} dias')

# Calcular también historial mensual específico por Microred para segmentación exacta
lic_por_mr = {}
for lic in licencias_enr:
    if lic['_esPerdido'] or lic['tipoLicencia'] not in ('ENFERMEDAD_COMUN', 'ACCIDENTE_COMUN'):
        continue
    mr_nom = lic.get('microred') or 'NO ASIGNADA'
    ym_key = (lic['_anio'], lic['_mes'])
    lic_por_mr.setdefault(mr_nom, {}).setdefault(ym_key, {'sub': 0, 'salud': 0})
    lic_por_mr[mr_nom][ym_key]['sub'] += lic['_diasSubsidioSalud']
    lic_por_mr[mr_nom][ym_key]['salud'] += lic['_diasSalud']

historial_por_microred = {}
ult_yms = [(h['anio'], h['mesNum']) for h in historial_mensual_ui]
for mr_nom, ym_map in lic_por_mr.items():
    serie_mr = []
    for (a_i, m_i) in ult_yms:
        val = ym_map.get((a_i, m_i), {'sub': 0, 'salud': 0})
        serie_mr.append({
            'anio': a_i,
            'mesNum': m_i,
            'mes': f"{MESES_ABREV[m_i]} {str(a_i)[-2:]}",
            'mesAbrev': MESES_ABREV[m_i],
            'diasSubsidio': int(val['sub']),
            'totalDiasSalud': int(val['salud'])
        })
    historial_por_microred[mr_nom] = serie_mr

# ==============================================================================
# MODELO 2: DETECCIÓN DE ANOMALÍAS Y PATRONES ATÍPICOS (ISOLATION FOREST)
# ==============================================================================
print('\n--- [MODELO 2] Detector de Anomalias (Isolation Forest) ---')

lics_by_trab = {}
for l in licencias_enr:
    lics_by_trab.setdefault(l['trabajadorId'], []).append(l)

perfil_trabajador = []
for t in trabajadores_raw:
    lics_valid = [l for l in lics_by_trab.get(t['id'], []) if not l['_esPerdido']]
    num_lics = len(lics_valid)
    dias_tot = sum(int(l.get('diasOtorgados') or 0) for l in lics_valid)
    dias_prom = (dias_tot / num_lics) if num_lics > 0 else 0.0
    particulares = sum(1 for l in lics_valid if l.get('origen') == 'PARTICULAR')
    ratio_part = (particulares / num_lics) if num_lics > 0 else 0.0
    cortas = sum(1 for l in lics_valid if 1 <= int(l.get('diasOtorgados') or 0) <= 5)
    ratio_cortas = (cortas / num_lics) if num_lics > 0 else 0.0

    perfil_trabajador.append({
        'trabajadorId': t['id'],
        'dni': t['dni'],
        'nombre': f"{t['apellidos']}, {t['nombres']}",
        'establecimiento': t.get('establecimiento') or 'NO ASIGNADO',
        'microred': t.get('microred') or 'NO ASIGNADA',
        'num_licencias': num_lics,
        'dias_totales': dias_tot,
        'dias_promedio': dias_prom,
        'ratio_particulares': ratio_part,
        'ratio_cortas': ratio_cortas
    })

df_perfil = pd.DataFrame(perfil_trabajador)
features_anom = ['num_licencias', 'dias_totales', 'dias_promedio', 'ratio_particulares', 'ratio_cortas']
X_anom = df_perfil[features_anom].fillna(0)

scaler_anom = StandardScaler()
X_anom_scaled = scaler_anom.fit_transform(X_anom)

iso_forest = IsolationForest(contamination=0.05, random_state=42, n_estimators=100)
iso_forest.fit(X_anom_scaled)

scores = iso_forest.decision_function(X_anom_scaled)
score_span = float(scores.max() - scores.min())
if score_span > 1e-9:
    risk_scores = np.round(100.0 * (1.0 - (scores - scores.min()) / score_span), 1)
else:
    risk_scores = np.zeros(len(scores), dtype=float)

df_perfil['score_riesgo'] = risk_scores
# Solo marcar trabajadores que sí registran licencias y resultan atípicos por algoritmo
df_perfil['es_anomalia'] = (iso_forest.predict(X_anom_scaled) == -1) & (df_perfil['num_licencias'] > 0)

joblib.dump(iso_forest, os.path.join(MODELS_DIR, 'model_anomalies.joblib'))
joblib.dump(scaler_anom, os.path.join(MODELS_DIR, 'scaler_anomalies.joblib'))

# Distribución exacta sobre la población evaluada (4 rangos para gráfico UI)
tot_eval = max(1, len(df_perfil))
b_normal = int((df_perfil['score_riesgo'] < 60).sum())
b_monitoreo = int(((df_perfil['score_riesgo'] >= 60) & (df_perfil['score_riesgo'] < 80)).sum())
b_moderada = int(((df_perfil['score_riesgo'] >= 80) & (df_perfil['score_riesgo'] < 95)).sum())
b_critica = int((df_perfil['score_riesgo'] >= 95).sum())

distribucion_riesgo = [
    {'rango': 'Riesgo Normal (0% - 60%)', 'total': b_normal, 'pct': round((b_normal / tot_eval) * 100, 1), 'nivel': 'normal'},
    {'rango': 'Bajo Monitoreo (60% - 80%)', 'total': b_monitoreo, 'pct': round((b_monitoreo / tot_eval) * 100, 1), 'nivel': 'monitoreo'},
    {'rango': 'Alerta Moderada (80% - 94%)', 'total': b_moderada, 'pct': round((b_moderada / tot_eval) * 100, 1), 'nivel': 'moderada'},
    {'rango': 'Alerta Critica (95% - 100%)', 'total': b_critica, 'pct': round((b_critica / tot_eval) * 100, 1), 'nivel': 'critica'},
]

anomalias_detectadas = df_perfil[df_perfil['es_anomalia']].sort_values(by=['score_riesgo', 'dias_totales'], ascending=False)
print(f'  * Casos atipicos detectados: {len(anomalias_detectadas)} de {len(df_perfil)} trabajadores.')

top_anomalias = []
for _, row in anomalias_detectadas.iterrows():
    top_anomalias.append({
        'dni': row['dni'],
        'servidor': row['nombre'],
        'establecimiento': row['establecimiento'],
        'microred': row['microred'],
        'scoreRiesgo': float(row['score_riesgo']),
        'diasTotales': int(row['dias_totales']),
        'numLicencias': int(row['num_licencias']),
        'motivoAlerta': (
            'Fraccionamiento recurrente de descansos particulares'
            if row['ratio_particulares'] >= 0.5 and row['num_licencias'] >= 3
            else 'Acumulacion atipica superior al promedio institucional'
        )
    })

# ==============================================================================
# MODELO 3: CLASIFICADOR DE RIESGO DE CADUCIDAD DE CITT (RANDOM FOREST)
# ==============================================================================
print('\n--- [MODELO 3] Clasificador de Riesgo de Caducidad CITT (30 dias) ---')

np.random.seed(42)
n_citt_samples = 400
dias_otorgados_sim = np.random.choice([3, 5, 7, 10, 15, 20, 30], size=n_citt_samples, p=[0.1, 0.15, 0.25, 0.2, 0.15, 0.1, 0.05])
distancia_horas_sim = np.random.uniform(0.5, 6.0, size=n_citt_samples)
es_cas_sim = np.random.choice([0, 1], size=n_citt_samples, p=[0.35, 0.65])
dias_transcurridos_sim = np.random.randint(1, 35, size=n_citt_samples)

logits = (dias_transcurridos_sim * 0.22) + (distancia_horas_sim * 0.35) + (dias_otorgados_sim * 0.03) - 5.2
prob_caducar = 1 / (1 + np.exp(-logits))
y_caducidad = (prob_caducar > 0.5).astype(int)

features_citt = ['dias_transcurridos', 'distancia_horas', 'dias_otorgados', 'es_cas']
df_citt_ml = pd.DataFrame({
    'dias_transcurridos': dias_transcurridos_sim,
    'distancia_horas': distancia_horas_sim,
    'dias_otorgados': dias_otorgados_sim,
    'es_cas': es_cas_sim,
})

X_citt_train, X_citt_test, y_citt_train, y_citt_test = train_test_split(
    df_citt_ml, y_caducidad, test_size=0.25, random_state=42, stratify=y_caducidad
)

model_citt = RandomForestClassifier(n_estimators=100, max_depth=4, random_state=42)
model_citt.fit(X_citt_train, y_citt_train)

y_citt_pred = model_citt.predict(X_citt_test)
y_citt_proba = model_citt.predict_proba(X_citt_test)[:, 1]

f1_citt = float(f1_score(y_citt_test, y_citt_pred))
recall_citt = float(recall_score(y_citt_test, y_citt_pred))
roc_citt = float(roc_auc_score(y_citt_test, y_citt_proba))

feat_labels = {
    'dias_transcurridos': 'Días Transcurridos desde Registro/Emisión',
    'distancia_horas': 'Distancia Geográfica a la Sede (Horas viaje)',
    'dias_otorgados': 'Días Otorgados en el Certificado',
    'es_cas': 'Régimen Contractual del Servidor',
}
importances = model_citt.feature_importances_
factores_decision = []
for fname, imp in zip(features_citt, importances):
    factores_decision.append({
        'variable': feat_labels.get(fname, fname),
        'peso': int(round(float(imp) * 100))
    })
factores_decision.sort(key=lambda x: x['peso'], reverse=True)
# Ajustar suma exacta a 100%
diff_imp = 100 - sum(f['peso'] for f in factores_decision)
if factores_decision and diff_imp != 0:
    factores_decision[0]['peso'] += diff_imp

print(f'  * Calibracion M3 -> Recall: {recall_citt:.2%} | F1: {f1_citt:.2%} | AUC: {roc_citt:.2%}')
joblib.dump(model_citt, os.path.join(MODELS_DIR, 'model_citt_risk.joblib'))

# Evaluar TODAS las licencias particulares activas (EXCLUYENDO PARTICULAR_PERDIDO) usando días reales transcurridos
now_utc = datetime.now(timezone.utc)
eval_citt_list = []
licencias_particulares = [l for l in licencias_enr if l.get('origen') == 'PARTICULAR']

for lic in licencias_particulares:
    dias_ot = max(1, int(lic.get('diasOtorgados') or 1))
    dist = get_distancia_microred(lic.get('microred', ''))
    cond = str(lic.get('condicionLaboral') or '')
    is_cas = 1 if 'CAS' in cond.upper() else 0

    # Consistente con /api/alertas: desde creadoEn (o fechaInicio si faltara) hasta hoy
    dias_transc = 0
    creado_str = lic.get('creadoEn')
    if creado_str:
        try:
            creado_dt = datetime.fromisoformat(str(creado_str).replace('Z', '+00:00'))
            if creado_dt.tzinfo is None:
                creado_dt = creado_dt.replace(tzinfo=timezone.utc)
            dias_transc = max(0, int(np.ceil((now_utc - creado_dt).total_seconds() / 86400.0)))
        except Exception:
            dias_transc = 0
    elif lic.get('fechaInicio'):
        dt_i = parse_ymd(lic.get('fechaInicio'))
        if dt_i:
            dias_transc = max(0, (now_dt - dt_i).days)

    input_df = pd.DataFrame([{
        'dias_transcurridos': min(dias_transc, 60),
        'distancia_horas': dist,
        'dias_otorgados': dias_ot,
        'es_cas': is_cas
    }])
    proba_cad = float(model_citt.predict_proba(input_df)[0][1])

    # Alinear umbral crítico explícito con regla legal de 30 días (si >= 25d -> alerta alta/crítica real)
    if dias_transc >= 30:
        nivel_riesgo = 'CRÍTICO'
        proba_cad = max(proba_cad, 0.95)
    elif dias_transc >= 25 or proba_cad >= 0.70:
        nivel_riesgo = 'CRÍTICO'
    elif dias_transc >= 15 or proba_cad >= 0.40:
        nivel_riesgo = 'MODERADO'
    else:
        nivel_riesgo = 'BAJO'

    eval_citt_list.append({
        'licenciaId': str(lic.get('id')),
        'dni': lic.get('dni'),
        'servidor': lic.get('apellidosNombres'),
        'numeroCertificado': lic.get('numeroCertificado') or 'S/N',
        'establecimiento': lic.get('establecimiento'),
        'microred': lic.get('microred'),
        'diasOtorgados': dias_ot,
        'diasTranscurridos': dias_transc,
        'diasRestantes30d': max(0, 30 - dias_transc),
        'probabilidadCaducidad': round(proba_cad * 100, 1),
        'nivelRiesgo': nivel_riesgo
    })

eval_citt_list.sort(key=lambda x: (x['probabilidadCaducidad'], x['diasTranscurridos']), reverse=True)

# ==============================================================================
# MODELO 4: CLUSTERING DE VULNERABILIDAD POR MICRORED (K-MEANS & PCA)
# ==============================================================================
print('\n--- [MODELO 4] Segmentacion Territorial de Microredes (K-Means & PCA) ---')

microred_stats = []
microredes_nombres = sorted(list(df_trabajadores['microred'].dropna().unique()))

for m in microredes_nombres:
    trabs_m = df_trabajadores[df_trabajadores['microred'] == m]
    trabs_ids = set(trabs_m['id'])
    lics_m = [
        l for l in licencias_enr
        if l.get('trabajadorId') in trabs_ids
        and not l['_esPerdido']
        and l.get('tipoLicencia') in ('ENFERMEDAD_COMUN', 'ACCIDENTE_COMUN')
    ]

    tot_personal = int(len(trabs_m))
    tot_dias_salud = int(sum(l['_diasSalud'] for l in lics_m))
    tot_dias_subsidio = int(sum(l['_diasSubsidioSalud'] for l in lics_m))
    tasa_ausentismo = (tot_dias_salud / tot_personal) if tot_personal > 0 else 0.0
    subsidio_por_trab = (tot_dias_subsidio / tot_personal) if tot_personal > 0 else 0.0

    microred_stats.append({
        'microred': m,
        'totalPersonal': tot_personal,
        'diasSaludTotales': tot_dias_salud,
        'diasSubsidioReales': tot_dias_subsidio,
        'tasaAusentismo': round(tasa_ausentismo, 2),
        'subsidioPorTrabajador': round(subsidio_por_trab, 2)
    })

df_m_stats = pd.DataFrame(microred_stats)
features_clus = ['totalPersonal', 'diasSaludTotales', 'tasaAusentismo', 'subsidioPorTrabajador']
X_clus = df_m_stats[features_clus].fillna(0)

scaler_clus = StandardScaler()
X_clus_scaled = scaler_clus.fit_transform(X_clus)

n_clusters = min(3, max(1, len(df_m_stats)))
kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
cluster_labels = kmeans.fit_predict(X_clus_scaled)
sil_score = float(silhouette_score(X_clus_scaled, cluster_labels)) if n_clusters > 1 and len(df_m_stats) > n_clusters else 0.0
print(f'  * Silhouette Score (k={n_clusters}): {sil_score:.3f}')

pca = PCA(n_components=min(2, X_clus_scaled.shape[1]), random_state=42)
coords_2d = pca.fit_transform(X_clus_scaled)

df_m_stats['cluster'] = cluster_labels
df_m_stats['pca_x'] = np.round(coords_2d[:, 0], 2)
df_m_stats['pca_y'] = np.round(coords_2d[:, 1], 2) if coords_2d.shape[1] > 1 else 0.0

cluster_medias = df_m_stats.groupby('cluster')['tasaAusentismo'].mean().to_dict()
orden_clusters = sorted(cluster_medias.keys(), key=lambda c: cluster_medias[c])
etiquetas_base = [
    {'nombre': 'Baja Vulnerabilidad', 'color': 'emerald', 'accion': 'Cobertura normal'},
    {'nombre': 'Vulnerabilidad Moderada', 'color': 'amber', 'accion': 'Monitoreo de reemplazos'},
    {'nombre': 'Zona Crítica de Alto Riesgo', 'color': 'rose', 'accion': 'Asignación prioritaria de presupuesto'}
]
nombres_clusters = {
    cid: etiquetas_base[min(idx, len(etiquetas_base) - 1)]
    for idx, cid in enumerate(orden_clusters)
}

df_m_stats['cluster_info'] = df_m_stats['cluster'].map(lambda c: nombres_clusters[c]['nombre'])
df_m_stats['cluster_color'] = df_m_stats['cluster'].map(lambda c: nombres_clusters[c]['color'])
df_m_stats_sorted = df_m_stats.sort_values(by=['tasaAusentismo', 'diasSaludTotales'], ascending=False).reset_index(drop=True)

joblib.dump(kmeans, os.path.join(MODELS_DIR, 'model_clusters.joblib'))
joblib.dump(scaler_clus, os.path.join(MODELS_DIR, 'scaler_clusters.joblib'))
joblib.dump(pca, os.path.join(MODELS_DIR, 'pca_clusters.joblib'))

# ==============================================================================
# MODELO 5: PROCEDENCIA DE CANJES (ESSALUD CITT VS PARTICULAR, SIN CONTAR PERDIDOS COMO ESSALUD)
# ==============================================================================
print('\n--- [MODELO 5] Clasificador de Procedencia (EsSalud CITT vs Particular) ---')

lics_origen_validas = [l for l in licencias_enr if l.get('origen') in ('ESSALUD_CITT', 'PARTICULAR')]
df_origen_ml = []
for l in lics_origen_validas:
    est = l.get('establecimiento') or 'NO ASIGNADO'
    m_red = l.get('microred') or 'NO ASIGNADA'
    dias_ot = max(1, int(l.get('diasOtorgados') or 1))
    mes_ej = int(l.get('_mes') or l.get('mesEjercicio') or 1)
    es_part = 1 if l.get('origen') == 'PARTICULAR' else 0
    cond = str(l.get('condicionLaboral') or '')
    is_cas = 1 if 'CAS' in cond.upper() else 0
    dist = get_distancia_microred(m_red)

    df_origen_ml.append({
        'establecimiento': est,
        'microred': m_red,
        'dias_otorgados': dias_ot,
        'mes_ejercicio': mes_ej,
        'mes_sin': np.sin(2 * np.pi * mes_ej / 12.0),
        'mes_cos': np.cos(2 * np.pi * mes_ej / 12.0),
        'es_cas': is_cas,
        'distancia_horas': dist,
        'es_particular': es_part
    })

df_origen = pd.DataFrame(df_origen_ml)
tasa_global_part = float(df_origen['es_particular'].mean()) if len(df_origen) > 0 else 0.0

if len(df_origen) > 0:
    est_rates = df_origen.groupby('establecimiento')['es_particular'].agg(['count', 'mean'])
    est_rates['smoothed_rate'] = (est_rates['count'] * est_rates['mean'] + 5 * tasa_global_part) / (est_rates['count'] + 5)
    smoothed_map = est_rates['smoothed_rate'].to_dict()
    df_origen['est_rate'] = df_origen['establecimiento'].map(lambda x: smoothed_map.get(x, tasa_global_part))
else:
    smoothed_map = {}

features_origen = ['est_rate', 'distancia_horas', 'es_cas', 'mes_sin', 'mes_cos', 'dias_otorgados']

acc_orig = roc_orig = f1_orig = 0.0
model_origen = None
if len(df_origen) >= 20 and df_origen['es_particular'].nunique() >= 2 and int(df_origen['es_particular'].value_counts().min()) >= 4:
    X_orig = df_origen[features_origen]
    y_orig = df_origen['es_particular']
    X_orig_train, X_orig_test, y_orig_train, y_orig_test = train_test_split(
        X_orig, y_orig, test_size=0.25, random_state=42, stratify=y_orig
    )
    model_origen = RandomForestClassifier(n_estimators=100, max_depth=4, random_state=42)
    model_origen.fit(X_orig_train, y_orig_train)
    y_orig_pred = model_origen.predict(X_orig_test)
    y_orig_proba = model_origen.predict_proba(X_orig_test)[:, 1]
    acc_orig = float(model_origen.score(X_orig_test, y_orig_test))
    roc_orig = float(roc_auc_score(y_orig_test, y_orig_proba))
    f1_orig = float(f1_score(y_orig_test, y_orig_pred, zero_division=0))

print(f'  * Accuracy: {acc_orig:.2%} | ROC-AUC: {roc_orig:.2%} | F1: {f1_orig:.2%} (n={len(df_origen)})')
joblib.dump(model_origen, os.path.join(MODELS_DIR, 'model_origen_citt.joblib'))

# Desglose por TODOS los establecimientos (incluyendo catálogo base, evitando colisiones por nombre entre microredes)
est_completo = {}
for e in establecimientos_raw:
    est_nom = e.get('establecimiento') or 'NO ASIGNADO'
    mr_nom = e.get('microred') or 'NO ASIGNADA'
    key = (est_nom, mr_nom)
    est_completo[key] = {
        'establecimiento': est_nom,
        'microred': mr_nom,
        'totalPersonal': int(e.get('totalPersonal') or 0),
        'totalLicencias': 0,
        'cantEsSalud': 0,
        'cantParticular': 0,
        'cantPerdidos': 0
    }

for t in trabajadores_raw:
    est_nom = t.get('establecimiento') or 'NO ASIGNADO'
    mr_nom = t.get('microred') or 'NO ASIGNADA'
    key = (est_nom, mr_nom)
    if key not in est_completo:
        est_completo[key] = {
            'establecimiento': est_nom,
            'microred': mr_nom,
            'totalPersonal': 0,
            'totalLicencias': 0,
            'cantEsSalud': 0,
            'cantParticular': 0,
            'cantPerdidos': 0
        }
    if not establecimientos_raw:
        est_completo[key]['totalPersonal'] += 1

for l in licencias_enr:
    est_nom = l.get('establecimiento') or 'NO ASIGNADO'
    mr_nom = l.get('microred') or 'NO ASIGNADA'
    key = (est_nom, mr_nom)
    if key not in est_completo:
        est_completo[key] = {
            'establecimiento': est_nom,
            'microred': mr_nom,
            'totalPersonal': 0,
            'totalLicencias': 0,
            'cantEsSalud': 0,
            'cantParticular': 0,
            'cantPerdidos': 0
        }
    origen = l.get('origen')
    if origen == 'PARTICULAR_PERDIDO':
        est_completo[key]['cantPerdidos'] += 1
        continue
    est_completo[key]['totalLicencias'] += 1
    if origen == 'PARTICULAR':
        est_completo[key]['cantParticular'] += 1
    elif origen == 'ESSALUD_CITT':
        est_completo[key]['cantEsSalud'] += 1

meses_activos_count = max(1, len(active_months)) if len(active_months) > 0 else 8
lista_establecimientos_origen = []
for (est_nom, _mr_nom), item in est_completo.items():
    tot_lic = item['totalLicencias']
    if tot_lic > 0:
        pct_part = round((item['cantParticular'] / tot_lic) * 100, 1)
        pct_ess = round((item['cantEsSalud'] / tot_lic) * 100, 1)
        if pct_part >= 50:
            alerta = 'ALTA_CARGA'
            alerta_desc = 'Alta Carga de Canje Administrativo'
            alerta_color = 'rose'
        elif pct_part >= 25:
            alerta = 'MODERADA'
            alerta_desc = 'Carga Moderada de Canje'
            alerta_color = 'amber'
        else:
            alerta = 'COBERTURA_DIRECTA'
            alerta_desc = 'Alta Cobertura Directa EsSalud'
            alerta_color = 'emerald'
    else:
        pct_part = 0.0
        pct_ess = 0.0
        alerta = 'COBERTURA_DIRECTA'
        alerta_desc = 'Sin registros en periodo'
        alerta_color = 'emerald'

    lic_est_mes = max(1, round(tot_lic / meses_activos_count)) if tot_lic > 0 else 0
    pred_part = round(lic_est_mes * (pct_part / 100.0)) if tot_lic > 0 else 0
    pred_ess = max(0, lic_est_mes - pred_part)

    lista_establecimientos_origen.append({
        'establecimiento': est_nom,
        'microred': item['microred'],
        'totalPersonal': item['totalPersonal'],
        'totalLicencias': tot_lic,
        'cantEsSalud': item['cantEsSalud'],
        'cantParticular': item['cantParticular'],
        'cantPerdidos': item['cantPerdidos'],
        'pctEsSalud': pct_ess,
        'pctParticular': pct_part,
        'alerta': alerta,
        'alertaDesc': alerta_desc,
        'alertaColor': alerta_color,
        'proyeccionMes': {
            'licenciasEsperadas': lic_est_mes,
            'esperadasEsSalud': pred_ess,
            'esperadasParticular': pred_part
        }
    })

lista_establecimientos_origen.sort(key=lambda x: (x['totalLicencias'], x['pctParticular'], x['totalPersonal']), reverse=True)

# Proyecciones mensuales de procedencia alineadas con meses dinámicos de Modelo 1
prom_lic_mes_red = round(float(active_months['num_licencias'].mean())) if len(active_months) > 0 else 25
prom_dias_por_lic = float(df_origen['dias_otorgados'].mean()) if len(df_origen) > 0 else 9.5
prop_cas_red = float(df_origen['es_cas'].mean()) if len(df_origen) > 0 else 0.5

proyecciones_mensuales_origen = []
for p in proyecciones:
    m_fut = int(p['mesNum'])
    lics_est_mes = max(1, int(round(max(prom_lic_mes_red * 0.7, p['diasSubsidioEstimados'] / max(3.5, prom_dias_por_lic * 0.5)))))
    if model_origen is not None:
        input_mes = pd.DataFrame([{
            'est_rate': tasa_global_part,
            'distancia_horas': 2.2,
            'es_cas': prop_cas_red,
            'mes_sin': np.sin(2 * np.pi * m_fut / 12.0),
            'mes_cos': np.cos(2 * np.pi * m_fut / 12.0),
            'dias_otorgados': prom_dias_por_lic
        }])
        prob_part_mes = float(model_origen.predict_proba(input_mes)[0][1])
    else:
        prob_part_mes = tasa_global_part

    part_est = int(round(lics_est_mes * prob_part_mes))
    ess_est = max(0, lics_est_mes - part_est)

    proyecciones_mensuales_origen.append({
        'mes': p['mes'],
        'anio': p['anio'],
        'totalLicenciasEstimadas': lics_est_mes,
        'licenciasEsSaludEstimadas': ess_est,
        'licenciasParticularEstimadas': part_est,
        'pctEsSalud': round((1.0 - prob_part_mes) * 100, 1),
        'pctParticular': round(prob_part_mes * 100, 1),
        'montoCanjeEnJuego': round(part_est * prom_dias_por_lic * COSTO_DIARIO_SUBSIDIO, 2)
    })

output_data = {
    'fechaEntrenamiento': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    'totalEstablecimientos': total_establecimientos_real,
    'modelo1_forecasting': {
        'algoritmoGanador': modelo_m1_nombre,
        'metricas': {'mae_dias': round(mae_final, 2), 'rmse_dias': round(rmse_final, 2)},
        'historialMensual': historial_mensual_ui,
        'historialPorMicrored': historial_por_microred,
        'proyeccionesProximosMeses': proyecciones
    },
    'modelo2_anomalias': {
        'totalAnalizados': len(df_perfil),
        'totalAtipicos': len(anomalias_detectadas),
        'distribucionRiesgo': distribucion_riesgo,
        'topCasosAtipicos': top_anomalias
    },
    'modelo3_riesgo_citt': {
        'metricas': {
            'recall': round(recall_citt * 100, 1),
            'f1_score': round(f1_citt * 100, 1),
            'roc_auc': round(roc_citt * 100, 1)
        },
        'fuenteValidacion': 'Calibracion operativa sobre parametros de transporte y plazo legal 30d',
        'factoresDecision': factores_decision,
        'recomendacion': 'Prioriza certificados particulares con mayor tiempo transcurrido y distancia geografica de traslado para evitar caducidad ante EsSalud.',
        'resumenAlertas': {
            'criticos': sum(1 for c in eval_citt_list if c['nivelRiesgo'] == 'CRÍTICO'),
            'moderados': sum(1 for c in eval_citt_list if c['nivelRiesgo'] == 'MODERADO'),
            'bajo': sum(1 for c in eval_citt_list if c['nivelRiesgo'] == 'BAJO')
        },
        'topCertificadosRiesgo': eval_citt_list
    },
    'modelo4_clustering': {
        'silhouetteScore': round(sil_score, 3),
        'resumenClusters': [
            {
                'nombre': nombres_clusters[c]['nombre'],
                'color': nombres_clusters[c]['color'],
                'accion': nombres_clusters[c]['accion'],
                'microredes': df_m_stats_sorted[df_m_stats_sorted['cluster'] == c]['microred'].tolist()
            }
            for c in orden_clusters
        ],
        'microredesDetalle': df_m_stats_sorted.to_dict(orient='records')
    },
    'modelo5_origen_canjes': {
        'metricas': {
            'accuracy': round(acc_orig * 100, 1),
            'roc_auc': round(roc_orig * 100, 1),
            'f1_score': round(f1_orig * 100, 1),
            'pctGlobalEsSalud': round((1.0 - tasa_global_part) * 100, 1),
            'pctGlobalParticular': round(tasa_global_part * 100, 1),
            'totalAnalizadas': len(df_origen)
        },
        'proyeccionesMensuales': proyecciones_mensuales_origen,
        'establecimientos': lista_establecimientos_origen
    }
}

json_output_path = os.path.join(OUTPUT_DIR, 'ml_insights.json')
with open(json_output_path, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, indent=2, ensure_ascii=False)

print(f'\n[OK] Entrenamiento completado exitosamente!')
print(f'[OK] Modelos guardados en: {MODELS_DIR}')
print(f'[OK] Insights para la web guardados en: {json_output_path}')
print('=' * 70)
