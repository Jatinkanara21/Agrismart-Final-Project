import type {
  ChatRequestInput,
  ChatResponse,
  CropInput,
  CropRecommendationResponse,
  DecisionInput,
  DecisionPlanResponse,
  DiseaseDetectionResponse,
  DiseaseInput,
  GeocodeResult,
  SystemStatusResponse,
  WeatherReport,
  YieldInput,
  YieldPredictionResponse,
} from '../types/agrismart';

async function apiFetch<T>(url: string, options?: RequestInit, timeoutMs = 32000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      signal: controller.signal,
    });

    const rawText = await res.text().catch(() => '');
    let data: Record<string, unknown> | null = null;
    if (rawText) {
      try {
        data = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        data = null;
      }
    }

    if (!res.ok) {
      const msg =
        typeof data?.error === 'string' && data.error
          ? data.error
          : `Request failed (HTTP ${res.status}).`;
      throw new Error(msg);
    }

    if (data === null) {
      throw new Error('The server returned an unexpected non-JSON response. Please retry.');
    }
    return data as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('The request took too long to finish. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const apiClient = {
  getStatus: () => apiFetch<SystemStatusResponse>('/api/status', undefined, 8000),

  geocode: (query: string) =>
    apiFetch<{ results: GeocodeResult[]; source: 'LIVE_OPEN_METEO' | 'DEMO' }>(
      `/api/weather/geocode?q=${encodeURIComponent(query)}`,
      undefined,
      12000
    ),

  getWeather: (lat: number, lon: number, label: string) =>
    apiFetch<WeatherReport>(
      `/api/weather/forecast?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&label=${encodeURIComponent(label)}`,
      undefined,
      14000
    ),

  recommendCrop: (input: CropInput) =>
    apiFetch<CropRecommendationResponse>('/api/ai/crop', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  detectDisease: (input: DiseaseInput) =>
    apiFetch<DiseaseDetectionResponse>('/api/ai/disease', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  predictYield: (input: YieldInput) =>
    apiFetch<YieldPredictionResponse>('/api/ai/yield', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  generateDecisionPlan: (input: DecisionInput) =>
    apiFetch<DecisionPlanResponse>('/api/ai/decision', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  chatAgriBot: (input: ChatRequestInput) =>
    apiFetch<ChatResponse>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
