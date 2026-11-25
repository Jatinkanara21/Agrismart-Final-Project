import type {
  ChatRequestInput,
  ChatResponse,
  CropInput,
  CropRecommendationResponse,
  DecisionInput,
  DecisionPlanResponse,
  DiseaseDetectionResponse,
  DiseaseInput,
  YieldInput,
  YieldPredictionResponse,
} from '../src/types/agrismart.ts';
import {
  computeDemoAgriBotReply,
  computeDemoCropRecommendation,
  computeDemoDecisionPlan,
  computeDemoDiseaseDiagnosis,
  computeDemoYieldPrediction,
} from '../src/utils/agronomy.ts';

export interface OllamaConfig {
  configured: boolean;
  baseUrl: string;
  hostLabel: string;
  apiKey: string;
  textModel: string;
  visionModel: string;
  timeoutMs: number;
}

export function getOllamaConfig(): OllamaConfig {
  const rawBase = (process.env.OLLAMA_BASE_URL || 'https://ollama.com').trim().replace(/\/+$/, '');
  let safeBase = 'https://ollama.com';
  let hostLabel = 'ollama.com';
  try {
    const parsed = new URL(rawBase);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      safeBase = parsed.origin + parsed.pathname.replace(/\/+$/, '');
      hostLabel = parsed.host;
    }
  } catch {
    safeBase = 'https://ollama.com';
    hostLabel = 'ollama.com';
  }

  const apiKey = (process.env.OLLAMA_API_KEY || '').trim();
  const textModel = (process.env.OLLAMA_TEXT_MODEL || 'glm-5.3-flash').trim() || 'glm-5.3-flash';
  const visionModel = (process.env.OLLAMA_VISION_MODEL || 'gemma4:31b').trim() || 'gemma4:31b';
  const timeoutMs = Math.min(60000, Math.max(5000, Number(process.env.OLLAMA_TIMEOUT_MS) || 28000));

  return {
    configured: apiKey.length > 0,
    baseUrl: safeBase,
    hostLabel,
    apiKey,
    textModel,
    visionModel,
    timeoutMs,
  };
}

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

let cachedTags: { fetchedAt: number; baseUrl: string; models: string[] } | null = null;

async function fetchAvailableOllamaModels(cfg: OllamaConfig): Promise<string[]> {
  if (cachedTags && cachedTags.baseUrl === cfg.baseUrl && Date.now() - cachedTags.fetchedAt < 300000) {
    return cachedTags.models;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${cfg.baseUrl}/api/tags`, {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { models?: Array<{ name?: string }> };
    const models = (data.models || [])
      .map((m) => (typeof m?.name === 'string' ? m.name.trim() : ''))
      .filter(Boolean);
    cachedTags = { fetchedAt: Date.now(), baseUrl: cfg.baseUrl, models };
    return models;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function pickFallbackModel(available: string[], isVision: boolean): string | null {
  if (!available.length) return null;
  const preferred = isVision
    ? ['gemma4:31b', 'gemma4', 'llama3.2-vision', 'qwen2.5vl', 'glm-5.3-flash', 'mistral-large-4']
    : ['glm-5.3-flash', 'gemma4:31b', 'deepseek-v4.1-flash', 'gpt-oss:20b', 'mistral-large-4'];
  for (const candidate of preferred) {
    const exact = available.find((m) => m === candidate || m.startsWith(`${candidate}:`));
    if (exact) return exact;
  }
  return available[0];
}

async function sendOllamaRequest(
  cfg: OllamaConfig,
  messages: OllamaChatMessage[],
  options: { model: string; expectJson?: boolean }
): Promise<{ ok: true; content: string } | { ok: false; status: number; errText: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    const response = await fetch(`${cfg.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages,
        stream: false,
        ...(options.expectJson ? { format: 'json' } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errSnippet = (await response.text().catch(() => '')).slice(0, 200);
      return { ok: false, status: response.status, errText: errSnippet || response.statusText };
    }

    const data = (await response.json()) as {
      message?: { content?: string };
      response?: string;
    };

    const content = data.message?.content ?? data.response ?? '';
    if (!content.trim()) {
      throw new Error('Ollama Cloud returned an empty response.');
    }
    return { ok: true, content };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Ollama Cloud request timed out after ${Math.round(cfg.timeoutMs / 1000)} seconds.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function callOllamaChat(
  messages: OllamaChatMessage[],
  options: { model: string; expectJson?: boolean; isVision?: boolean }
): Promise<{ content: string; modelUsed: string }> {
  const cfg = getOllamaConfig();
  if (!cfg.configured) {
    throw new Error('OLLAMA_NOT_CONFIGURED');
  }

  const first = await sendOllamaRequest(cfg, messages, options);
  if (first.ok) {
    return { content: first.content, modelUsed: options.model };
  }

  // If the requested model isn't available on the Ollama Cloud host, discover an active live model and retry once
  if (first.status === 404) {
    const available = await fetchAvailableOllamaModels(cfg);
    const fallbackModel = pickFallbackModel(available, Boolean(options.isVision));
    if (fallbackModel && fallbackModel !== options.model) {
      const retry = await sendOllamaRequest(cfg, messages, {
        ...options,
        model: fallbackModel,
      });
      if (retry.ok) {
        return { content: retry.content, modelUsed: fallbackModel };
      }
      throw new Error(`Ollama Cloud returned HTTP ${retry.status}: ${retry.errText}`);
    }
  }

  throw new Error(`Ollama Cloud returned HTTP ${first.status}: ${first.errText}`);
}

function extractJsonObject<T>(raw: string): T {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Could not parse JSON structure from Ollama response.');
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}

function buildDemoFallbackNotice(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Upstream service unavailable';
  if (/HTTP 402/i.test(raw)) {
    return 'DEMO Fallback Active: Ollama Cloud returned HTTP 402 (usage credits or plan required at ollama.com/plans). Showing transparent offline agronomic guidance — not live AI.';
  }
  if (/HTTP 401|HTTP 403/i.test(raw)) {
    return 'DEMO Fallback Active: Ollama Cloud rejected the configured API key (HTTP 401/403). Showing transparent offline agronomic guidance — not live AI.';
  }
  if (/HTTP 429/i.test(raw)) {
    return 'DEMO Fallback Active: Ollama Cloud rate limit reached (HTTP 429). Showing transparent offline agronomic guidance — not live AI.';
  }
  const cleanReason = raw.replace(/\s+/g, ' ').slice(0, 140);
  return `DEMO Fallback Active: Live Ollama Cloud is temporarily unavailable (${cleanReason}). Showing transparent offline agronomic guidance — not live AI.`;
}

export async function runCropRecommendation(
  input: CropInput
): Promise<CropRecommendationResponse> {
  const cfg = getOllamaConfig();
  if (!cfg.configured) {
    return computeDemoCropRecommendation(input);
  }

  const systemPrompt =
    'You are an expert South Asian agronomist advising farmers in simple, clear English. Use acres, Celsius, mm rainfall, quintals/acre, and Kharif/Rabi/Zaid seasons. Return ONLY valid JSON matching the requested schema.';
  const userPrompt = `Recommend the top 3 crops for this farm plot:
- Location: ${input.district}, ${input.state}
- Season: ${input.season}, Area: ${input.areaAcres} acres
- Soil: ${input.soilType}, pH ${input.soilPh}, N=${input.nitrogen} P=${input.phosphorus} K=${input.potassium} kg/ha
- Irrigation: ${input.irrigationType}
- Weather: ${input.temperatureC}C, ${input.humidityPct}% humidity, ${input.rainfallMm} mm seasonal rainfall

Return strict JSON:
{
  "summary": "2-sentence plain-language summary",
  "soilHealthNote": "practical note on soil pH and NPK",
  "recommendations": [
    {
      "cropName": "string",
      "localName": "string",
      "suitabilityScore": 85,
      "expectedYieldQuintalsPerAcre": 16.5,
      "waterNeed": "Low|Moderate|High",
      "sowingWindow": "string",
      "durationDays": "string",
      "whyItFits": "short clear reason",
      "fertilizerTip": "practical fertilizer advice"
    }
  ]
}`;

  try {
    const { content: raw, modelUsed } = await callOllamaChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { model: cfg.textModel, expectJson: true }
    );

    const parsed = extractJsonObject<Omit<CropRecommendationResponse, 'source' | 'model'>>(raw);
    if (!Array.isArray(parsed.recommendations) || parsed.recommendations.length === 0) {
      throw new Error('Ollama response did not include crop recommendations.');
    }

    return {
      source: 'LIVE_OLLAMA',
      model: modelUsed,
      summary: String(parsed.summary || ''),
      soilHealthNote: String(parsed.soilHealthNote || ''),
      recommendations: parsed.recommendations.slice(0, 3),
    };
  } catch (err) {
    return {
      ...computeDemoCropRecommendation(input),
      notice: buildDemoFallbackNotice(err),
    };
  }
}

export async function runDiseaseDetection(
  input: DiseaseInput
): Promise<DiseaseDetectionResponse> {
  const cfg = getOllamaConfig();
  if (!cfg.configured) {
    return computeDemoDiseaseDiagnosis(input);
  }

  const cleanBase64 = input.imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

  const systemPrompt =
    'You are a South Asian plant pathologist helping farmers diagnose crop leaf diseases from photos in simple, actionable language. Return ONLY valid JSON.';
  const userPrompt = `Inspect this plant leaf photo carefully.
Crop: ${input.cropName || 'Unknown crop'}
Farmer symptom note: ${input.symptomsNote || 'None provided'}
Region/Season: ${input.district || 'South Asia'} (${input.season || 'Current season'})

Return strict JSON:
{
  "diseaseName": "string",
  "scientificName": "string",
  "affectedCrop": "string",
  "severity": "normal|moderate|high",
  "confidenceLabel": "High|Medium|Low",
  "plainExplanation": "simple farmer-friendly explanation",
  "visibleSymptoms": ["symptom 1", "symptom 2"],
  "organicTreatments": ["organic step 1", "organic step 2"],
  "chemicalTreatments": ["chemical option with safety note"],
  "preventionSteps": ["prevention 1", "prevention 2"],
  "urgentAction": "single most important next step"
}`;

  try {
    const { content: raw, modelUsed } = await callOllamaChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt, images: [cleanBase64] },
      ],
      { model: cfg.visionModel, expectJson: true, isVision: true }
    );

    const parsed = extractJsonObject<Omit<DiseaseDetectionResponse, 'source' | 'model'>>(raw);
    return {
      source: 'LIVE_OLLAMA',
      model: modelUsed,
      diseaseName: String(parsed.diseaseName || 'Leaf Condition Identified'),
      scientificName: String(parsed.scientificName || 'Unspecified'),
      affectedCrop: String(parsed.affectedCrop || input.cropName || 'Crop Leaf'),
      severity: parsed.severity === 'high' || parsed.severity === 'moderate' ? parsed.severity : 'normal',
      confidenceLabel: String(parsed.confidenceLabel || 'Medium'),
      plainExplanation: String(parsed.plainExplanation || ''),
      visibleSymptoms: Array.isArray(parsed.visibleSymptoms) ? parsed.visibleSymptoms.slice(0, 5) : [],
      organicTreatments: Array.isArray(parsed.organicTreatments) ? parsed.organicTreatments.slice(0, 5) : [],
      chemicalTreatments: Array.isArray(parsed.chemicalTreatments) ? parsed.chemicalTreatments.slice(0, 4) : [],
      preventionSteps: Array.isArray(parsed.preventionSteps) ? parsed.preventionSteps.slice(0, 5) : [],
      urgentAction: String(parsed.urgentAction || 'Consult your local KVK officer if spread continues.'),
    };
  } catch (err) {
    return {
      ...computeDemoDiseaseDiagnosis(input),
      notice: buildDemoFallbackNotice(err),
    };
  }
}

export async function runYieldPrediction(input: YieldInput): Promise<YieldPredictionResponse> {
  const cfg = getOllamaConfig();
  if (!cfg.configured) {
    return computeDemoYieldPrediction(input);
  }

  const systemPrompt =
    'You are an agricultural economist and agronomist estimating realistic South Asian crop yields in quintals/acre and metric tonnes. Return ONLY valid JSON.';
  const userPrompt = `Estimate harvest yield for:
- Crop: ${input.cropName}, Area: ${input.areaAcres} acres, Season: ${input.season}, District: ${input.district}
- Soil: ${input.soilType}, pH ${input.soilPh}, NPK=${input.nitrogen}-${input.phosphorus}-${input.potassium}
- Irrigation: ${input.irrigationType}, Expected Rainfall: ${input.expectedRainfallMm} mm, Fertilizer: ${input.fertilizerLevel}

Return strict JSON:
{
  "predictedQuintalsPerAcre": 15.5,
  "predictedTotalQuintals": 46.5,
  "predictedTotalTonnes": 4.65,
  "lowRangeQuintals": 40.0,
  "highRangeQuintals": 52.0,
  "outlook": "Favorable|Moderate|At Risk",
  "summary": "2-sentence farmer-friendly summary",
  "limitingFactors": ["factor 1"],
  "improvementActions": ["action 1", "action 2"]
}`;

  try {
    const { content: raw, modelUsed } = await callOllamaChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { model: cfg.textModel, expectJson: true }
    );

    const parsed = extractJsonObject<Omit<YieldPredictionResponse, 'source' | 'model' | 'cropName'>>(raw);
    const perAcre = Number(parsed.predictedQuintalsPerAcre) || 12;
    const totalQ = Number(parsed.predictedTotalQuintals) || Number((perAcre * input.areaAcres).toFixed(1));
    return {
      source: 'LIVE_OLLAMA',
      model: modelUsed,
      cropName: input.cropName,
      predictedQuintalsPerAcre: perAcre,
      predictedTotalQuintals: totalQ,
      predictedTotalTonnes: Number(parsed.predictedTotalTonnes) || Number((totalQ / 10).toFixed(2)),
      lowRangeQuintals: Number(parsed.lowRangeQuintals) || Number((totalQ * 0.88).toFixed(1)),
      highRangeQuintals: Number(parsed.highRangeQuintals) || Number((totalQ * 1.12).toFixed(1)),
      outlook:
        parsed.outlook === 'Favorable' || parsed.outlook === 'At Risk' ? parsed.outlook : 'Moderate',
      summary: String(parsed.summary || ''),
      limitingFactors: Array.isArray(parsed.limitingFactors) ? parsed.limitingFactors.slice(0, 5) : [],
      improvementActions: Array.isArray(parsed.improvementActions) ? parsed.improvementActions.slice(0, 5) : [],
    };
  } catch (err) {
    return {
      ...computeDemoYieldPrediction(input),
      notice: buildDemoFallbackNotice(err),
    };
  }
}

export async function runDecisionEngine(input: DecisionInput): Promise<DecisionPlanResponse> {
  const cfg = getOllamaConfig();
  if (!cfg.configured) {
    return computeDemoDecisionPlan(input);
  }

  const systemPrompt =
    'You are AgriSmart Decision Engine, a practical South Asian farm advisor turning soil, weather, and crop health signals into a clear 7-day action plan for farmers. Return ONLY valid JSON.';
  const userPrompt = `Create a unified 7-day farm decision plan:
- Farm: ${input.farm.name}, ${input.farm.areaAcres} acres, ${input.farm.district}, ${input.farm.state}
- Season: ${input.farm.season}, Crop: ${input.farm.currentCrop || 'Upcoming sowing'}
- Soil: ${input.farm.soilType}, pH ${input.farm.soilPh}, NPK=${input.farm.nitrogen}-${input.farm.phosphorus}-${input.farm.potassium}, Irrigation=${input.farm.irrigationType}
- Weather (${input.weatherSource}): ${input.weatherSummary}
- Recent disease notes: ${input.recentDiseaseNote || 'None'}
- Farmer goal: ${input.farmerGoal || 'Healthy harvest'}

Return strict JSON:
{
  "planTitle": "string",
  "executiveSummary": "2-sentence plain summary",
  "riskLevel": "normal|moderate|high",
  "actionBlocks": [
    { "area": "Irrigation Plan", "priority": "Immediate|This Week|Monitor", "headline": "string", "steps": ["step 1", "step 2"] },
    { "area": "Fertilizer & Soil", "priority": "Immediate|This Week|Monitor", "headline": "string", "steps": ["step 1", "step 2"] },
    { "area": "Pest & Disease Watch", "priority": "Immediate|This Week|Monitor", "headline": "string", "steps": ["step 1", "step 2"] },
    { "area": "Harvest & Market", "priority": "Immediate|This Week|Monitor", "headline": "string", "steps": ["step 1", "step 2"] }
  ],
  "sevenDaySchedule": [
    { "day": "Day 1", "task": "string" }
  ]
}`;

  try {
    const { content: raw, modelUsed } = await callOllamaChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { model: cfg.textModel, expectJson: true }
    );

    const parsed = extractJsonObject<Omit<DecisionPlanResponse, 'source' | 'model'>>(raw);
    return {
      source: 'LIVE_OLLAMA',
      model: modelUsed,
      planTitle: String(parsed.planTitle || `7-Day Field Plan — ${input.farm.name}`),
      executiveSummary: String(parsed.executiveSummary || ''),
      riskLevel: parsed.riskLevel === 'high' || parsed.riskLevel === 'moderate' ? parsed.riskLevel : 'normal',
      actionBlocks: Array.isArray(parsed.actionBlocks) ? parsed.actionBlocks.slice(0, 4) : [],
      sevenDaySchedule: Array.isArray(parsed.sevenDaySchedule) ? parsed.sevenDaySchedule.slice(0, 7) : [],
    };
  } catch (err) {
    return {
      ...computeDemoDecisionPlan(input),
      notice: buildDemoFallbackNotice(err),
    };
  }
}

export async function runAgriBotChat(input: ChatRequestInput): Promise<ChatResponse> {
  const cfg = getOllamaConfig();
  if (!cfg.configured) {
    return computeDemoAgriBotReply(input);
  }

  const ctx = input.farmContext;
  const farmContextLine = ctx
    ? `Active farm context: ${ctx.name} (${ctx.areaAcres} acres in ${ctx.district}, ${ctx.state}; ${ctx.soilType} soil, pH ${ctx.soilPh}; ${ctx.irrigationType}; ${ctx.season} season; current crop: ${ctx.currentCrop || 'not set'}).`
    : 'No specific farm plot selected.';

  const messages: OllamaChatMessage[] = [
    {
      role: 'system',
      content: `You are AgriBot, a helpful, plain-speaking South Asian agricultural advisor. Give concise, practical, farmer-friendly answers using acres, Celsius, mm, and quintals/acre. Never invent live weather numbers. ${farmContextLine}`,
    },
    ...input.history.slice(-8).map((turn) => ({
      role: turn.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: turn.content.slice(0, 1500),
    })),
    { role: 'user', content: input.message.slice(0, 2000) },
  ];

  try {
    const { content: reply, modelUsed } = await callOllamaChat(messages, {
      model: cfg.textModel,
      expectJson: false,
    });
    return {
      source: 'LIVE_OLLAMA',
      model: modelUsed,
      reply: reply.trim(),
    };
  } catch (err) {
    return {
      ...computeDemoAgriBotReply(input),
      notice: buildDemoFallbackNotice(err),
    };
  }
}
