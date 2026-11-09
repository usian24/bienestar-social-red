export const GEMINI_ACTIVE_CHAT_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.6-flash',
] as const;

export const GEMINI_ACTIVE_OCR_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
] as const;

export const GEMINI_RECOMMENDED_MODEL = GEMINI_ACTIVE_CHAT_MODELS[0];

export function getConfiguredGeminiKeys(prefer: 'chat' | 'scanner' = 'chat'): string[] {
  const ordered =
    prefer === 'scanner'
      ? [
          process.env.GEMINI_API_KEY_SCANNER,
          process.env.GEMINI_API_KEY_OCR,
          process.env.GEMINI_API_KEY_CHAT,
          process.env.GEMINI_API_KEY,
        ]
      : [
          process.env.GEMINI_API_KEY_CHAT,
          process.env.GEMINI_API_KEY,
          process.env.GEMINI_API_KEY_SCANNER,
        ];

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of ordered) {
    const k = raw?.trim();
    if (k && k.length > 10 && !seen.has(k)) {
      seen.add(k);
      unique.push(k);
    }
  }
  return unique;
}

export function extractGeminiText(data: any): string | null {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return null;
  const nonThought = parts
    .filter((p: any) => !p?.thought && typeof p?.text === 'string')
    .map((p: any) => p.text)
    .join('')
    .trim();
  if (nonThought) return nonThought;
  const fallback = parts
    .filter((p: any) => typeof p?.text === 'string')
    .map((p: any) => p.text)
    .join('')
    .trim();
  return fallback || null;
}

export interface GeminiCallResult {
  text: string | null;
  model: string | null;
  attempts: number;
  lastStatus?: number;
}

export async function callGeminiGenerateContent(params: {
  payload: Record<string, any>;
  models: readonly string[];
  apiKeys: string[];
  logTag: string;
  liteTimeoutMs?: number;
  flashTimeoutMs?: number;
}): Promise<GeminiCallResult> {
  const {
    payload,
    models,
    apiKeys,
    logTag,
    liteTimeoutMs = 15000,
    flashTimeoutMs = 22000,
  } = params;

  let attempts = 0;
  let lastStatus: number | undefined;

  for (const model of models) {
    const isLite = model.includes('lite');
    const timeoutMs = isLite ? liteTimeoutMs : flashTimeoutMs;

    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      attempts++;
      const t0 = Date.now();
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(timeoutMs),
          }
        );

        lastStatus = res.status;
        const durMs = Date.now() - t0;

        if (res.ok) {
          const json = await res.json();
          const text = extractGeminiText(json);
          if (text) {
            console.log(`${logTag} Éxito con ${model} (clave ${i + 1}/${apiKeys.length}) en ${durMs}ms`);
            return { text, model, attempts, lastStatus: res.status };
          }
          console.warn(`${logTag} ${model} devolvió HTTP 200 sin contenido textual útil (${durMs}ms)`);
          break; // Probar siguiente modelo
        }

        if (res.status === 404) {
          console.warn(`${logTag} Modelo ${model} no disponible (404), saltando al siguiente modelo.`);
          break; // No desperdiciar otras claves en un modelo 404
        }

        if (res.status === 429 || res.status === 503 || res.status === 500) {
          console.warn(`${logTag} ${model} estado ${res.status} en clave ${i + 1}/${apiKeys.length} (${durMs}ms), rotando...`);
          await new Promise((r) => setTimeout(r, 350));
          continue;
        }

        console.warn(`${logTag} ${model} respondió HTTP ${res.status} en clave ${i + 1}/${apiKeys.length} (${durMs}ms)`);
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          continue; // Puede ser clave restringida o payload en este key
        }
        break;
      } catch (err: any) {
        const durMs = Date.now() - t0;
        console.warn(`${logTag} Error/Timeout en ${model} clave ${i + 1}/${apiKeys.length} (${durMs}ms):`, err?.message || err);
        continue;
      }
    }
  }

  return { text: null, model: null, attempts, lastStatus };
}

