import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchLiveWeatherForecast, geocodeLocation } from './weather';
import {
  getOllamaConfig,
  runAgriBotChat,
  runCropRecommendation,
  runDecisionEngine,
  runDiseaseDetection,
  runYieldPrediction,
} from './ollama';

test('Weather DEMO fallback activates cleanly with transparent DEMO label when Open-Meteo is unreachable', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('Simulated Open-Meteo network failure');
  }) as typeof fetch;

  try {
    const report = await fetchLiveWeatherForecast(22.5645, 72.9289, 'Anand, Gujarat');
    assert.equal(report.source, 'DEMO');
    assert.match(report.providerLabel, /DEMO/i);
    assert.ok(report.notice && report.notice.toUpperCase().includes('DEMO'));
    assert.equal(report.daily.length, 7);
    assert.ok(report.alerts.length >= 1);

    const geo = await geocodeLocation('Ludhiana');
    assert.equal(geo.source, 'DEMO');
    assert.ok(geo.results.some((r) => r.name === 'Ludhiana'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Weather live Open-Meteo API returns real Indian location forecast', async () => {
  const report = await fetchLiveWeatherForecast(30.901, 75.8573, 'Ludhiana, Punjab');
  assert.equal(report.source, 'LIVE_OPEN_METEO');
  assert.equal(report.daily.length, 7);
  assert.ok(Number.isFinite(report.current.temperatureC));
  assert.ok(report.alerts.length >= 1);
});

test('Ollama Cloud text and vision requests send server-side Bearer auth and parse LIVE_OLLAMA responses', async () => {
  const originalFetch = globalThis.fetch;
  const prevKey = process.env.OLLAMA_API_KEY;
  const prevBase = process.env.OLLAMA_BASE_URL;
  const prevText = process.env.OLLAMA_TEXT_MODEL;
  const prevVision = process.env.OLLAMA_VISION_MODEL;

  const capturedCalls: Array<{ url: string; authHeader: string | null; body: Record<string, unknown> }> = [];

  process.env.OLLAMA_API_KEY = 'test-server-only-key';
  process.env.OLLAMA_BASE_URL = 'https://ollama.com';
  process.env.OLLAMA_TEXT_MODEL = 'qwen2.5';
  process.env.OLLAMA_VISION_MODEL = 'llama3.2-vision';

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    const body = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
    capturedCalls.push({ url, authHeader: headers.get('Authorization'), body });

    if (body.model === 'llama3.2-vision') {
      return new Response(
        JSON.stringify({
          message: {
            content: JSON.stringify({
              diseaseName: 'Early Blight',
              scientificName: 'Alternaria solani',
              affectedCrop: 'Tomato',
              severity: 'moderate',
              confidenceLabel: 'High',
              plainExplanation: 'Concentric dark rings with yellow borders indicate Early Blight.',
              visibleSymptoms: ['Brown target rings', 'Yellowing lower leaf edge'],
              organicTreatments: ['Spray neem oil 3 ml/L in the evening'],
              chemicalTreatments: ['Mancozeb 75 WP at 2 g/L with 7-day wait'],
              preventionSteps: ['Avoid overhead evening watering'],
              urgentAction: 'Prune affected lower leaves today.',
            }),
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.format === 'json') {
      const prompt = String((body.messages as Array<{ content: string }>)[1]?.content || '');
      if (prompt.includes('Recommend the top 3 crops')) {
        return new Response(
          JSON.stringify({
            message: {
              content: JSON.stringify({
                summary: 'Alluvial soil with pH 7.0 suits Kharif paddy and groundnut.',
                soilHealthNote: 'Soil nitrogen is balanced; split urea application.',
                recommendations: [
                  {
                    cropName: 'Basmati Paddy (Rice)',
                    localName: 'Dhan',
                    suitabilityScore: 91,
                    expectedYieldQuintalsPerAcre: 19.5,
                    waterNeed: 'High',
                    sowingWindow: 'June - July',
                    durationDays: '125-135 days',
                    whyItFits: 'Matches canal irrigation and alluvial loam.',
                    fertilizerTip: 'Apply zinc sulphate at puddling.',
                  },
                ],
              }),
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (prompt.includes('Estimate harvest yield')) {
        return new Response(
          JSON.stringify({
            message: {
              content: JSON.stringify({
                predictedQuintalsPerAcre: 18.2,
                predictedTotalQuintals: 54.6,
                predictedTotalTonnes: 5.46,
                lowRangeQuintals: 49.0,
                highRangeQuintals: 60.0,
                outlook: 'Favorable',
                summary: 'Expected harvest is favorable under canal irrigation.',
                limitingFactors: ['Watch mid-season stem borer'],
                improvementActions: ['Top-dress nitrogen at panicle initiation'],
              }),
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          message: {
            content: JSON.stringify({
              planTitle: '7-Day Field Plan — North Canal Plot',
              executiveSummary: 'Irrigate lightly on Day 1 and scout lower leaves on Day 2.',
              riskLevel: 'normal',
              actionBlocks: [
                {
                  area: 'Irrigation Plan',
                  priority: 'Immediate',
                  headline: 'Maintain 3 cm shallow standing water',
                  steps: ['Irrigate before 8 AM'],
                },
              ],
              sevenDaySchedule: [{ day: 'Day 1', task: 'Inspect bunds and irrigate lightly.' }],
            }),
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        message: { content: 'Split your urea into 3 doses during active tillering for best uptake.' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    assert.equal(getOllamaConfig().configured, true);

    const crop = await runCropRecommendation({
      nitrogen: 80,
      phosphorus: 40,
      potassium: 50,
      soilPh: 7.0,
      temperatureC: 30,
      rainfallMm: 750,
      humidityPct: 72,
      areaAcres: 3,
      soilType: 'Alluvial',
      irrigationType: 'Canal',
      season: 'Kharif',
      district: 'Anand',
      state: 'Gujarat',
    });
    assert.equal(crop.source, 'LIVE_OLLAMA');
    assert.equal(crop.model, 'qwen2.5');
    assert.equal(crop.recommendations[0].cropName, 'Basmati Paddy (Rice)');

    const disease = await runDiseaseDetection({
      imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      mimeType: 'image/png',
      fileName: 'leaf.png',
      cropName: 'Tomato',
      symptomsNote: 'Brown rings',
    });
    assert.equal(disease.source, 'LIVE_OLLAMA');
    assert.equal(disease.model, 'llama3.2-vision');
    assert.equal(disease.diseaseName, 'Early Blight');

    const yld = await runYieldPrediction({
      cropName: 'Basmati Paddy (Rice)',
      areaAcres: 3,
      season: 'Kharif',
      soilType: 'Alluvial',
      irrigationType: 'Canal',
      nitrogen: 80,
      phosphorus: 40,
      potassium: 50,
      soilPh: 7.0,
      expectedRainfallMm: 750,
      fertilizerLevel: 'Balanced',
      district: 'Anand',
    });
    assert.equal(yld.source, 'LIVE_OLLAMA');

    const plan = await runDecisionEngine({
      farm: {
        name: 'North Canal Plot',
        district: 'Anand',
        state: 'Gujarat',
        areaAcres: 3,
        soilType: 'Alluvial',
        irrigationType: 'Canal',
        season: 'Kharif',
        currentCrop: 'Basmati Paddy (Rice)',
        nitrogen: 80,
        phosphorus: 40,
        potassium: 50,
        soilPh: 7.0,
      },
      weatherSummary: '28°C clear sky',
      weatherSource: 'LIVE_OPEN_METEO',
      recentDiseaseNote: 'None',
      farmerGoal: 'High grain quality',
    });
    assert.equal(plan.source, 'LIVE_OLLAMA');

    const chat = await runAgriBotChat({
      message: 'When should I apply urea to Kharif paddy?',
      history: [],
    });
    assert.equal(chat.source, 'LIVE_OLLAMA');
    assert.match(chat.reply, /urea/i);

    assert.equal(capturedCalls.length, 5);
    for (const call of capturedCalls) {
      assert.equal(call.url, 'https://ollama.com/api/chat');
      assert.equal(call.authHeader, 'Bearer test-server-only-key');
    }
    const visionCall = capturedCalls.find((c) => c.body.model === 'llama3.2-vision');
    assert.ok(visionCall);
    const visionMsgs = visionCall.body.messages as Array<{ images?: string[] }>;
    assert.ok(Array.isArray(visionMsgs[1]?.images));
    assert.ok(!visionMsgs[1].images![0].startsWith('data:'));
  } finally {
    globalThis.fetch = originalFetch;
    if (prevKey === undefined) delete process.env.OLLAMA_API_KEY;
    else process.env.OLLAMA_API_KEY = prevKey;
    if (prevBase === undefined) delete process.env.OLLAMA_BASE_URL;
    else process.env.OLLAMA_BASE_URL = prevBase;
    if (prevText === undefined) delete process.env.OLLAMA_TEXT_MODEL;
    else process.env.OLLAMA_TEXT_MODEL = prevText;
    if (prevVision === undefined) delete process.env.OLLAMA_VISION_MODEL;
    else process.env.OLLAMA_VISION_MODEL = prevVision;
  }
});

test('Ollama Cloud HTTP 402 falls back transparently to DEMO with explicit notice', async () => {
  const originalFetch = globalThis.fetch;
  const prevKey = process.env.OLLAMA_API_KEY;
  process.env.OLLAMA_API_KEY = 'test-server-only-key';

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ error: 'Add usage credits or subscribe: https://ollama.com/plans' }),
      { status: 402, headers: { 'Content-Type': 'application/json' } }
    )) as typeof fetch;

  try {
    const chat = await runAgriBotChat({
      message: 'Best urea schedule for paddy?',
      history: [],
    });
    assert.equal(chat.source, 'DEMO');
    assert.ok(chat.reply.length > 10);
    assert.ok(chat.notice && /DEMO/i.test(chat.notice) && /402/.test(chat.notice));
  } finally {
    globalThis.fetch = originalFetch;
    if (prevKey === undefined) delete process.env.OLLAMA_API_KEY;
    else process.env.OLLAMA_API_KEY = prevKey;
  }
});
