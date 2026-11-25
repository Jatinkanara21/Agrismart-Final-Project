# AgriSmart — AI-Powered Agricultural Field Companion

AgriSmart is a full-stack agricultural platform designed for South Asian farmers (acres, °C, mm rainfall, quintals/acre, Kharif/Rabi/Zaid seasons) and agricultural extension administrators.

## Modules Included

1. **AI Crop Recommendation** — Matches soil NPK, pH, rainfall, temperature, and irrigation to ranked South Asian crops via Ollama Cloud (`qwen2.5`) or transparent DEMO rules.
2. **Plant Disease Detection** — Secure JPEG/PNG/WebP leaf photo upload (max 5 MB) analyzed via Ollama Cloud (`llama3.2-vision`) or labeled DEMO pathology mode with organic and chemical treatments.
3. **Crop Yield Prediction** — Forecasts harvest output in quintals/acre, total quintals, and metric tonnes with expected range and improvement tips.
4. **Weather Forecast & Alerts** — Live keyless **Open-Meteo** geocoding and 7-day agricultural forecast with automated heat stress, heavy rainfall, spray-drift wind, fungal humidity, and frost alerts (clearly labeled DEMO fallback only if Open-Meteo is unreachable).
5. **AgriBot AI Chatbot** — Context-aware farming assistant connected to your active farm plot and persisted chat history.
6. **Farmer Profile & Farm Management** — Full farm plot CRUD with soil NPK/pH baseline, GPS district lookup, and farmer contact profile.
7. **AI Agricultural Decision Engine** — Combines soil profile, live weather, and recent leaf scans into a unified 7-day field schedule.
8. **Admin Dashboard** — Platform overview, farmer & plot directory, live regional advisory broadcasting, and in-app schema/setup reference.

## Database Schema (`firebase-blueprint.json`)

| Collection | Access & Purpose |
| :--- | :--- |
| `/users/{userId}` | Owner/Admin PII-isolated farmer & admin profiles (`role` locked against self-escalation). |
| `/admins/{adminId}` | Trusted admin role registry (read by owner/admin, written by admins only). |
| `/farms/{farmId}` | Owner-isolated farm plots with acreage, GPS, soil type, irrigation, NPK, and pH. |
| `/analyses/{analysisId}` | Owner-isolated AI analysis history verified against existing owned `farmId`. |
| `/chatMessages/{messageId}` | Owner-isolated AgriBot conversation turns. |
| `/advisories/{advisoryId}` | Admin-managed regional alerts readable by authenticated farmers when `active == true`. |

## Environment Variables (Server-Side Only)

Copy `.env.example` to `.env`:

```env
OLLAMA_BASE_URL="https://ollama.com"
OLLAMA_API_KEY="your-ollama-cloud-api-key"
OLLAMA_TEXT_MODEL="qwen2.5"
OLLAMA_VISION_MODEL="llama3.2-vision"
OLLAMA_TIMEOUT_MS="28000"
OPEN_METEO_TIMEOUT_MS="10000"
PORT="3000"
```

> **Important**: Never prefix `OLLAMA_API_KEY` with `VITE_`. All Ollama Cloud requests run exclusively through server-side `/api/ai/*` routes in `server.ts`.

## Local Setup & Testing

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. You can either:
- Sign in with **Google (Firebase Cloud)** to persist directly to Firestore, or
- Use the clearly labeled **Sample Farmer (DEMO)** or **Sample Admin (DEMO)** local sandbox buttons (persisted in `localStorage`, zero hardcoded production credentials).

Run automated unit & security rule checks:

```bash
npx tsx --test src/utils/agronomy.test.ts firestore.rules.test.ts
npx eslint firestore.rules
npm run lint
```

## Production Build & Deployment

```bash
npm run build
NODE_ENV=production npm start
```

Before sharing broadly, review and customize `firestore.rules` for your organization's specific admin list and deploy rules via Firebase CLI (`firebase deploy --only firestore:rules`).
