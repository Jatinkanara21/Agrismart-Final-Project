import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getOllamaConfig,
  runAgriBotChat,
  runCropRecommendation,
  runDecisionEngine,
  runDiseaseDetection,
  runYieldPrediction,
} from './server/ollama.ts';
import { fetchLiveWeatherForecast, geocodeLocation } from './server/weather.ts';
import {
  MAX_IMAGE_BYTES,
  sanitizeString,
  validateCropInput,
  validateImageUpload,
  validateYieldInput,
} from './src/utils/agronomy.ts';
import type {
  ChatRequestInput,
  CropInput,
  DecisionInput,
  DiseaseInput,
  YieldInput,
} from './src/types/agrismart.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '8mb' }));

  // Basic security headers compatible with AI Studio iframe preview
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Safe configuration & health status endpoint (never exposes secrets)
  app.get('/api/status', (_req, res) => {
    const cfg = getOllamaConfig();
    const firebaseConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
    res.json({
      ollamaConfigured: cfg.configured,
      ollamaHost: cfg.hostLabel,
      textModel: cfg.textModel,
      visionModel: cfg.visionModel,
      weatherProvider: 'Open-Meteo Live API',
      firebaseConfigPresent: fs.existsSync(firebaseConfigPath),
      serverTime: new Date().toISOString(),
    });
  });

  // Weather geocoding endpoint
  app.get('/api/weather/geocode', async (req, res) => {
    const q = sanitizeString(req.query.q, 80);
    if (q.length < 2) {
      res.status(400).json({ error: 'Please enter at least 2 characters to search a town or district.' });
      return;
    }
    try {
      const result = await geocodeLocation(q);
      res.json(result);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to search locations right now.',
      });
    }
  });

  // Weather 7-day agricultural forecast endpoint
  app.get('/api/weather/forecast', async (req, res) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const label = sanitizeString(req.query.label, 120) || 'Anand, Gujarat';

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.status(400).json({ error: 'Valid latitude (-90..90) and longitude (-180..180) are required.' });
      return;
    }

    try {
      const report = await fetchLiveWeatherForecast(lat, lon, label);
      res.json(report);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to load weather forecast.',
      });
    }
  });

  // Module 1: AI Crop Recommendation
  app.post('/api/ai/crop', async (req, res) => {
    const body = req.body as Partial<CropInput>;
    const validation = validateCropInput(body);
    if (!validation.valid) {
      res.status(400).json({ error: 'Please check your soil and field values.', details: validation.errors });
      return;
    }

    const input: CropInput = {
      nitrogen: Number(body.nitrogen),
      phosphorus: Number(body.phosphorus),
      potassium: Number(body.potassium),
      soilPh: Number(body.soilPh),
      temperatureC: Number(body.temperatureC),
      rainfallMm: Number(body.rainfallMm),
      humidityPct: Number(body.humidityPct),
      areaAcres: Number(body.areaAcres),
      soilType: body.soilType || 'Alluvial',
      irrigationType: body.irrigationType || 'Canal',
      season: body.season || 'Kharif',
      district: sanitizeString(body.district, 80) || 'Anand',
      state: sanitizeString(body.state, 80) || 'Gujarat',
    };

    try {
      const result = await runCropRecommendation(input);
      res.json(result);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Crop recommendation failed.',
      });
    }
  });

  // Module 2: Plant Disease Detection (Image Upload)
  app.post('/api/ai/disease', async (req, res) => {
    const body = req.body as Partial<DiseaseInput>;
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
    const mimeType = sanitizeString(body.mimeType, 40);

    if (!imageBase64) {
      res.status(400).json({ error: 'Please upload a plant leaf image to diagnose.' });
      return;
    }

    const rawBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
    const approxBytes = Math.ceil((rawBase64.length * 3) / 4);
    const imgCheck = validateImageUpload(mimeType, approxBytes);
    if (!imgCheck.valid) {
      res.status(400).json({ error: imgCheck.error });
      return;
    }
    if (approxBytes > MAX_IMAGE_BYTES) {
      res.status(413).json({ error: 'Image exceeds the 5 MB upload limit.' });
      return;
    }

    const input: DiseaseInput = {
      imageBase64: rawBase64,
      mimeType,
      fileName: sanitizeString(body.fileName, 120) || 'leaf.jpg',
      cropName: sanitizeString(body.cropName, 80) || 'Crop Leaf',
      symptomsNote: sanitizeString(body.symptomsNote, 500),
      district: sanitizeString(body.district, 80),
      season: body.season,
    };

    try {
      const result = await runDiseaseDetection(input);
      res.json(result);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Plant disease analysis failed.',
      });
    }
  });

  // Module 3: Crop Yield Prediction
  app.post('/api/ai/yield', async (req, res) => {
    const body = req.body as Partial<YieldInput>;
    const validation = validateYieldInput(body);
    if (!validation.valid) {
      res.status(400).json({ error: 'Please check your crop and field inputs.', details: validation.errors });
      return;
    }

    const input: YieldInput = {
      cropName: sanitizeString(body.cropName, 80),
      areaAcres: Number(body.areaAcres),
      season: body.season || 'Kharif',
      soilType: body.soilType || 'Alluvial',
      irrigationType: body.irrigationType || 'Canal',
      nitrogen: Number(body.nitrogen) || 70,
      phosphorus: Number(body.phosphorus) || 35,
      potassium: Number(body.potassium) || 45,
      soilPh: Number(body.soilPh) || 7.0,
      expectedRainfallMm: Number(body.expectedRainfallMm) || 550,
      fertilizerLevel: body.fertilizerLevel || 'Balanced',
      district: sanitizeString(body.district, 80) || 'Anand',
    };

    try {
      const result = await runYieldPrediction(input);
      res.json(result);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Yield prediction failed.',
      });
    }
  });

  // Module 5: AgriBot AI Chatbot
  app.post('/api/ai/chat', async (req, res) => {
    const body = req.body as Partial<ChatRequestInput>;
    const message = sanitizeString(body.message, 2000);
    if (!message) {
      res.status(400).json({ error: 'Please type a farming question for AgriBot.' });
      return;
    }

    const history = Array.isArray(body.history)
      ? body.history
          .filter(
            (h): h is { sender: 'user' | 'assistant'; content: string } =>
              (h?.sender === 'user' || h?.sender === 'assistant') && typeof h?.content === 'string'
          )
          .slice(-8)
      : [];

    try {
      const result = await runAgriBotChat({
        message,
        history,
        farmContext: body.farmContext,
      });
      res.json(result);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'AgriBot could not respond right now.',
      });
    }
  });

  // Module 7: AI Agricultural Decision Engine
  app.post('/api/ai/decision', async (req, res) => {
    const body = req.body as Partial<DecisionInput>;
    if (!body.farm || !sanitizeString(body.farm.name, 100)) {
      res.status(400).json({ error: 'Please select a farm plot before generating a decision plan.' });
      return;
    }

    const input: DecisionInput = {
      farm: {
        name: sanitizeString(body.farm.name, 100),
        district: sanitizeString(body.farm.district, 80) || 'Anand',
        state: sanitizeString(body.farm.state, 80) || 'Gujarat',
        areaAcres: Number(body.farm.areaAcres) || 2,
        soilType: body.farm.soilType || 'Alluvial',
        irrigationType: body.farm.irrigationType || 'Canal',
        season: body.farm.season || 'Kharif',
        currentCrop: sanitizeString(body.farm.currentCrop, 80),
        nitrogen: Number(body.farm.nitrogen) || 70,
        phosphorus: Number(body.farm.phosphorus) || 35,
        potassium: Number(body.farm.potassium) || 45,
        soilPh: Number(body.farm.soilPh) || 7.0,
      },
      weatherSummary: sanitizeString(body.weatherSummary, 400) || 'Moderate seasonal conditions',
      weatherSource: body.weatherSource === 'LIVE_OPEN_METEO' ? 'LIVE_OPEN_METEO' : 'DEMO',
      recentDiseaseNote: sanitizeString(body.recentDiseaseNote, 300) || 'None reported',
      farmerGoal: sanitizeString(body.farmerGoal, 240) || 'Healthy harvest and water efficiency',
    };

    try {
      const result = await runDecisionEngine(input);
      res.json(result);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Decision Engine failed to generate plan.',
      });
    }
  });

  const httpServer = http.createServer(app);

  const distDir = path.resolve(__dirname, 'dist');
  const serveStaticProd =
    (IS_PROD || process.env.npm_lifecycle_event === 'start') &&
    fs.existsSync(path.join(distDir, 'index.html'));

  // Frontend Vite Dev Middleware or Static Production Build
  if (!serveStaticProd) {
    const { createServer: createViteServer } = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`AgriSmart server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AgriSmart server:', err);
  process.exit(1);
});
