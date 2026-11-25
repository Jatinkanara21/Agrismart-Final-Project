import type {
  AdvisoryCategory,
  AdvisorySeverity,
  ChatRequestInput,
  ChatResponse,
  CropInput,
  CropRecommendationResponse,
  CroppingSeason,
  DecisionInput,
  DecisionPlanResponse,
  DiseaseDetectionResponse,
  DiseaseInput,
  FarmPlot,
  IrrigationType,
  RecommendedCrop,
  SoilType,
  WeatherAlert,
  WeatherCurrent,
  WeatherDayForecast,
  WeatherReport,
  YieldInput,
  YieldPredictionResponse,
} from '../types/agrismart.ts';

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export function generateSafeId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'rec';
  return `${cleanPrefix}_${Date.now().toString(36)}_${randomPart}`;
}

export function sanitizeString(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

export function clampNumber(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.min(max, Math.max(min, val));
}

export function validateFarmInput(
  input: Partial<FarmPlot>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const name = sanitizeString(input.name, 100);
  const district = sanitizeString(input.district, 80);
  const state = sanitizeString(input.state, 80);

  if (name.length < 2) errors.name = 'Enter a farm plot name (at least 2 characters).';
  if (district.length < 2) errors.district = 'Enter your district or taluka.';
  if (state.length < 2) errors.state = 'Select or enter your state.';

  const acres = Number(input.areaAcres);
  if (!Number.isFinite(acres) || acres < 0.05 || acres > 50000) {
    errors.areaAcres = 'Enter a valid area between 0.05 and 50,000 acres.';
  }

  const ph = Number(input.soilPh);
  if (!Number.isFinite(ph) || ph < 3.0 || ph > 10.0) {
    errors.soilPh = 'Soil pH must be between 3.0 and 10.0.';
  }

  const n = Number(input.nitrogen);
  const p = Number(input.phosphorus);
  const k = Number(input.potassium);
  if (!Number.isFinite(n) || n < 0 || n > 300) errors.nitrogen = 'Nitrogen must be 0–300 kg/ha.';
  if (!Number.isFinite(p) || p < 0 || p > 300) errors.phosphorus = 'Phosphorus must be 0–300 kg/ha.';
  if (!Number.isFinite(k) || k < 0 || k > 400) errors.potassium = 'Potassium must be 0–400 kg/ha.';

  const lat = Number(input.latitude);
  const lon = Number(input.longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.latitude = 'Latitude must be -90 to 90.';
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) errors.longitude = 'Longitude must be -180 to 180.';

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateCropInput(
  input: Partial<CropInput>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const n = Number(input.nitrogen);
  const p = Number(input.phosphorus);
  const k = Number(input.potassium);
  const ph = Number(input.soilPh);
  const temp = Number(input.temperatureC);
  const rain = Number(input.rainfallMm);
  const hum = Number(input.humidityPct);
  const acres = Number(input.areaAcres);

  if (!Number.isFinite(n) || n < 0 || n > 300) errors.nitrogen = 'Nitrogen must be 0–300 kg/ha.';
  if (!Number.isFinite(p) || p < 0 || p > 300) errors.phosphorus = 'Phosphorus must be 0–300 kg/ha.';
  if (!Number.isFinite(k) || k < 0 || k > 400) errors.potassium = 'Potassium must be 0–400 kg/ha.';
  if (!Number.isFinite(ph) || ph < 3.0 || ph > 10.0) errors.soilPh = 'Soil pH must be 3.0–10.0.';
  if (!Number.isFinite(temp) || temp < -5 || temp > 55) errors.temperatureC = 'Temperature must be -5 to 55 °C.';
  if (!Number.isFinite(rain) || rain < 0 || rain > 5000) errors.rainfallMm = 'Seasonal rainfall must be 0–5000 mm.';
  if (!Number.isFinite(hum) || hum < 5 || hum > 100) errors.humidityPct = 'Humidity must be 5–100%.';
  if (!Number.isFinite(acres) || acres < 0.05 || acres > 50000) errors.areaAcres = 'Area must be at least 0.05 acres.';

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateYieldInput(
  input: Partial<YieldInput>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (sanitizeString(input.cropName, 80).length < 2) {
    errors.cropName = 'Select or enter a crop name.';
  }
  const acres = Number(input.areaAcres);
  if (!Number.isFinite(acres) || acres < 0.05 || acres > 50000) {
    errors.areaAcres = 'Enter a valid plot area in acres.';
  }
  const ph = Number(input.soilPh);
  if (!Number.isFinite(ph) || ph < 3.0 || ph > 10.0) {
    errors.soilPh = 'Soil pH must be between 3.0 and 10.0.';
  }
  const rain = Number(input.expectedRainfallMm);
  if (!Number.isFinite(rain) || rain < 0 || rain > 5000) {
    errors.expectedRainfallMm = 'Rainfall must be 0–5000 mm.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateImageUpload(
  mimeType: string,
  byteSize: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    return { valid: false, error: 'Please upload a JPEG, PNG, or WebP leaf photo.' };
  }
  if (!Number.isFinite(byteSize) || byteSize <= 0) {
    return { valid: false, error: 'The uploaded image appears empty.' };
  }
  if (byteSize > MAX_IMAGE_BYTES) {
    return { valid: false, error: 'Image must be 5 MB or smaller. Please compress or retake.' };
  }
  return { valid: true };
}

export function validateAdvisoryInput(input: {
  title?: string;
  region?: string;
  category?: AdvisoryCategory;
  severity?: AdvisorySeverity;
  message?: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (sanitizeString(input.title, 140).length < 3) {
    errors.title = 'Advisory title must be at least 3 characters.';
  }
  if (sanitizeString(input.region, 100).length < 2) {
    errors.region = 'Enter target district or state (e.g., Anand, Gujarat).';
  }
  if (sanitizeString(input.message, 1200).length < 5) {
    errors.message = 'Provide clear guidance for farmers (at least 5 characters).';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

// --- South Asian Crop Profile Knowledge Base (Deterministic DEMO Mode) ---

interface CropAgronomyProfile {
  cropName: string;
  localName: string;
  seasons: CroppingSeason[];
  preferredSoils: SoilType[];
  phRange: [number, number];
  tempRange: [number, number];
  rainRange: [number, number];
  waterNeed: 'Low' | 'Moderate' | 'High';
  baseQuintalsPerAcre: number;
  sowingWindow: string;
  durationDays: string;
  fertilizerTip: string;
  fitNote: string;
}

const SOUTH_ASIA_CROPS: CropAgronomyProfile[] = [
  {
    cropName: 'Basmati Paddy (Rice)',
    localName: 'Dhan / Basmati',
    seasons: ['Kharif'],
    preferredSoils: ['Alluvial', 'Clay Loam'],
    phRange: [5.5, 7.5],
    tempRange: [22, 36],
    rainRange: [750, 2200],
    waterNeed: 'High',
    baseQuintalsPerAcre: 19.5,
    sowingWindow: 'June 15 – July 25',
    durationDays: '125–140 days',
    fertilizerTip: 'Apply basal DAP + Potash before puddling, and split Urea in 3 doses at 21 and 42 days.',
    fitNote: 'Thrives in warm Kharif humidity with canal or borewell water assurance.',
  },
  {
    cropName: 'Bt Cotton',
    localName: 'Kapas',
    seasons: ['Kharif'],
    preferredSoils: ['Black Cotton', 'Alluvial', 'Red Loam'],
    phRange: [6.0, 8.2],
    tempRange: [24, 38],
    rainRange: [450, 1100],
    waterNeed: 'Moderate',
    baseQuintalsPerAcre: 9.8,
    sowingWindow: 'May 20 – July 10',
    durationDays: '150–170 days',
    fertilizerTip: 'Use neem-coated Urea with 2% Magnesium Sulphate foliar spray during boll formation.',
    fitNote: 'Deep moisture-retaining Black Cotton and Alluvial soils support strong boll retention.',
  },
  {
    cropName: 'Groundnut',
    localName: 'Moongfali / Singdana',
    seasons: ['Kharif', 'Zaid'],
    preferredSoils: ['Sandy Loam', 'Red Loam', 'Alluvial'],
    phRange: [6.0, 7.5],
    tempRange: [24, 35],
    rainRange: [400, 950],
    waterNeed: 'Low',
    baseQuintalsPerAcre: 8.6,
    sowingWindow: 'June 15 – July 15 (Kharif)',
    durationDays: '105–120 days',
    fertilizerTip: 'Apply Gypsum (200 kg/acre) at pegging stage for well-filled pods.',
    fitNote: 'Fixes atmospheric nitrogen naturally and suits lighter well-drained soils.',
  },
  {
    cropName: 'Wheat (HD-2967 / GW-496)',
    localName: 'Gehu',
    seasons: ['Rabi'],
    preferredSoils: ['Alluvial', 'Clay Loam', 'Black Cotton'],
    phRange: [6.2, 7.8],
    tempRange: [12, 26],
    rainRange: [50, 450],
    waterNeed: 'Moderate',
    baseQuintalsPerAcre: 18.2,
    sowingWindow: 'November 1 – November 30',
    durationDays: '115–130 days',
    fertilizerTip: 'Give first irrigation at Crown Root Initiation (21 days) alongside top-dressed Urea.',
    fitNote: 'Cool Rabi nights promote dense grain filling and strong market demand.',
  },
  {
    cropName: 'Indian Mustard',
    localName: 'Sarson / Rai',
    seasons: ['Rabi'],
    preferredSoils: ['Sandy Loam', 'Alluvial', 'Red Loam'],
    phRange: [6.0, 8.0],
    tempRange: [10, 26],
    rainRange: [30, 350],
    waterNeed: 'Low',
    baseQuintalsPerAcre: 7.4,
    sowingWindow: 'October 10 – November 10',
    durationDays: '110–125 days',
    fertilizerTip: 'Include Sulphur (Single Super Phosphate) to raise seed oil content by 2–3%.',
    fitNote: 'Low irrigation requirement makes Mustard dependable in winter with just 2–3 irrigations.',
  },
  {
    cropName: 'Chickpea (Desi Chana)',
    localName: 'Chana',
    seasons: ['Rabi'],
    preferredSoils: ['Black Cotton', 'Clay Loam', 'Sandy Loam'],
    phRange: [6.0, 8.0],
    tempRange: [12, 27],
    rainRange: [25, 300],
    waterNeed: 'Low',
    baseQuintalsPerAcre: 7.8,
    sowingWindow: 'October 15 – November 20',
    durationDays: '100–115 days',
    fertilizerTip: 'Treat seed with Rhizobium culture before sowing; avoid excess Nitrogen.',
    fitNote: 'Improves soil fertility for the next season and tolerates residual winter soil moisture.',
  },
  {
    cropName: 'Green Gram (Moong Dal)',
    localName: 'Moong',
    seasons: ['Zaid', 'Kharif'],
    preferredSoils: ['Sandy Loam', 'Alluvial', 'Red Loam'],
    phRange: [6.2, 7.8],
    tempRange: [25, 39],
    rainRange: [150, 650],
    waterNeed: 'Low',
    baseQuintalsPerAcre: 4.5,
    sowingWindow: 'March 1 – April 10 (Zaid)',
    durationDays: '60–70 days',
    fertilizerTip: 'Basal DAP (40 kg/acre) plus 2% DAP spray at flowering boosts pod count.',
    fitNote: 'Short 65-day cycle fits summer Zaid gap between Rabi harvest and Monsoon sowing.',
  },
  {
    cropName: 'Pearl Millet (Bajra)',
    localName: 'Bajra',
    seasons: ['Kharif', 'Zaid'],
    preferredSoils: ['Sandy Loam', 'Red Loam', 'Laterite'],
    phRange: [5.8, 8.3],
    tempRange: [26, 42],
    rainRange: [200, 650],
    waterNeed: 'Low',
    baseQuintalsPerAcre: 10.5,
    sowingWindow: 'June 20 – July 20 / March (Zaid)',
    durationDays: '75–85 days',
    fertilizerTip: 'Apply Zinc Sulphate (10 kg/acre) if light sandy soils show pale upper leaves.',
    fitNote: 'Highly heat- and drought-resilient grain + valuable dry fodder for livestock.',
  },
  {
    cropName: 'Hybrid Maize',
    localName: 'Makka',
    seasons: ['Kharif', 'Rabi', 'Zaid'],
    preferredSoils: ['Alluvial', 'Red Loam', 'Clay Loam'],
    phRange: [5.8, 7.6],
    tempRange: [18, 35],
    rainRange: [350, 1000],
    waterNeed: 'Moderate',
    baseQuintalsPerAcre: 22.0,
    sowingWindow: 'June 15 – July 15 / Oct 20 – Nov 20',
    durationDays: '95–110 days',
    fertilizerTip: 'Never allow standing water in furrows; side-dress Urea at knee-high stage.',
    fitNote: 'Versatile high-output cereal with steady poultry and dairy feed demand.',
  },
  {
    cropName: 'Tomato (Hybrid)',
    localName: 'Tamatar',
    seasons: ['Rabi', 'Kharif', 'Zaid'],
    preferredSoils: ['Red Loam', 'Sandy Loam', 'Alluvial'],
    phRange: [6.0, 7.2],
    tempRange: [18, 32],
    rainRange: [250, 900],
    waterNeed: 'Moderate',
    baseQuintalsPerAcre: 95.0,
    sowingWindow: 'Year-round nursery (best Aug–Nov)',
    durationDays: '110–130 days',
    fertilizerTip: 'Use drip fertigation with Calcium Nitrate to prevent blossom-end rot.',
    fitNote: 'High per-acre income when paired with drip irrigation and mulching.',
  },
];

export function computeDemoCropRecommendation(input: CropInput): CropRecommendationResponse {
  const scored: { profile: CropAgronomyProfile; score: number }[] = SOUTH_ASIA_CROPS.map(
    (crop) => {
      let score = 50;
      if (crop.seasons.includes(input.season)) score += 22;
      else score -= 18;

      if (crop.preferredSoils.includes(input.soilType)) score += 12;

      if (input.soilPh >= crop.phRange[0] && input.soilPh <= crop.phRange[1]) {
        score += 10;
      } else {
        score -= 8;
      }

      if (input.temperatureC >= crop.tempRange[0] && input.temperatureC <= crop.tempRange[1]) {
        score += 8;
      } else {
        score -= 7;
      }

      if (input.rainfallMm >= crop.rainRange[0] && input.rainfallMm <= crop.rainRange[1]) {
        score += 7;
      } else if (input.irrigationType === 'Rainfed Only' && crop.waterNeed === 'High') {
        score -= 22;
      } else if (
        (input.irrigationType === 'Drip Irrigation' || input.irrigationType === 'Canal') &&
        crop.waterNeed !== 'Low'
      ) {
        score += 5;
      }

      // Bonus for NPK match
      if (crop.cropName.includes('Rice') || crop.cropName.includes('Wheat') || crop.cropName.includes('Maize')) {
        if (input.nitrogen >= 70) score += 4;
      } else if (crop.cropName.includes('Groundnut') || crop.cropName.includes('Chickpea') || crop.cropName.includes('Green Gram')) {
        if (input.nitrogen <= 85) score += 5;
      }

      return { profile: crop, score: Math.round(clampNumber(score, 42, 97)) };
    }
  ).sort((a, b) => b.score - a.score);

  const topThree: RecommendedCrop[] = scored.slice(0, 3).map(({ profile, score }) => ({
    cropName: profile.cropName,
    localName: profile.localName,
    suitabilityScore: score,
    expectedYieldQuintalsPerAcre: Number(
      (profile.baseQuintalsPerAcre * (0.85 + (score / 100) * 0.25)).toFixed(1)
    ),
    waterNeed: profile.waterNeed,
    sowingWindow: profile.sowingWindow,
    durationDays: profile.durationDays,
    whyItFits: `${profile.fitNote} Matched for ${input.soilType} soil (pH ${input.soilPh}) in ${input.season} season.`,
    fertilizerTip: profile.fertilizerTip,
  }));

  const phNote =
    input.soilPh < 6.0
      ? `Soil is slightly acidic (pH ${input.soilPh}). Apply agricultural lime (200 kg/acre) before sowing.`
      : input.soilPh > 7.9
        ? `Soil is alkaline (pH ${input.soilPh}). Incorporate gypsum and well-rotted farmyard manure (FYM) to improve nutrient uptake.`
        : `Soil pH (${input.soilPh}) is in the healthy neutral range for nutrient availability.`;

  const npkNote =
    input.nitrogen < 55
      ? 'Nitrogen is on the lower side — include compost/FYM or leguminous rotation.'
      : 'Nitrogen reserves are adequate for early vegetative growth.';

  return {
    source: 'DEMO',
    model: 'agrismart-demo-agronomy-v1',
    notice:
      'DEMO Advisory Mode: OLLAMA_API_KEY is not configured on the server. Results are calculated by our deterministic South Asian agronomy rules, not live Ollama Cloud inference.',
    summary: `For ${input.areaAcres} acres of ${input.soilType} soil in ${input.district || 'your district'} during ${input.season}, ${topThree[0].cropName} is the strongest match followed by ${topThree[1].cropName}.`,
    soilHealthNote: `${phNote} ${npkNote}`,
    recommendations: topThree,
  };
}

export function computeDemoYieldPrediction(input: YieldInput): YieldPredictionResponse {
  const matched = SOUTH_ASIA_CROPS.find((c) =>
    c.cropName.toLowerCase().includes(input.cropName.toLowerCase().split(' ')[0])
  );
  const basePerAcre = matched ? matched.baseQuintalsPerAcre : 14.0;

  let multiplier = 1.0;
  const limitingFactors: string[] = [];
  const improvementActions: string[] = [];

  if (input.soilPh < 5.8 || input.soilPh > 8.2) {
    multiplier -= 0.12;
    limitingFactors.push(`Soil pH (${input.soilPh}) is outside the optimal 6.0–7.8 band.`);
    improvementActions.push(
      input.soilPh < 5.8
        ? 'Apply agricultural lime at 150–200 kg/acre prior to land preparation.'
        : 'Add gypsum and organic compost (3–4 tonnes/acre) to reduce alkalinity.'
    );
  }

  if (input.nitrogen < 50) {
    multiplier -= 0.1;
    limitingFactors.push(`Low Nitrogen (${input.nitrogen} kg/ha) may restrict leaf canopy growth.`);
    improvementActions.push('Split nitrogen application in 2–3 doses using neem-coated Urea.');
  } else if (input.nitrogen >= 75) {
    multiplier += 0.05;
  }

  if (input.phosphorus < 25) {
    multiplier -= 0.06;
    limitingFactors.push(`Low Phosphorus (${input.phosphorus} kg/ha) can slow early root development.`);
    improvementActions.push('Band-place DAP or SSP near the root zone at sowing.');
  }

  if (input.irrigationType === 'Drip Irrigation') {
    multiplier += 0.12;
  } else if (input.irrigationType === 'Canal' || input.irrigationType === 'Borewell / Tubewell') {
    multiplier += 0.04;
  } else if (input.irrigationType === 'Rainfed Only' && input.expectedRainfallMm < 400) {
    multiplier -= 0.18;
    limitingFactors.push(`Rainfed plot with limited expected rainfall (${input.expectedRainfallMm} mm).`);
    improvementActions.push('Use crop residue mulching and ridge-furrow sowing to conserve moisture.');
  }

  if (input.fertilizerLevel === 'Balanced') multiplier += 0.06;
  if (input.fertilizerLevel === 'Intensive') multiplier += 0.09;
  if (input.fertilizerLevel === 'Low') {
    multiplier -= 0.1;
    limitingFactors.push('Low fertilizer input limits peak grain/pod filling.');
    improvementActions.push('Adopt soil-test-based balanced NPK plus micronutrients (Zinc/Boron).');
  }

  if (matched && !matched.seasons.includes(input.season)) {
    multiplier -= 0.16;
    limitingFactors.push(`${input.cropName} is off-season for ${input.season} in most South Asian belts.`);
    improvementActions.push(`Consider varieties specifically bred for ${input.season} planting.`);
  }

  if (improvementActions.length < 2) {
    improvementActions.push('Schedule critical-stage irrigation during flowering and grain/pod filling.');
    improvementActions.push('Inspect field borders weekly for early pest or fungal patches.');
  }
  if (limitingFactors.length === 0) {
    limitingFactors.push('No major soil or irrigation bottlenecks detected for this configuration.');
  }

  const perAcre = Number(clampNumber(basePerAcre * multiplier, 2.5, 160).toFixed(1));
  const totalQuintals = Number((perAcre * input.areaAcres).toFixed(1));
  const totalTonnes = Number((totalQuintals / 10).toFixed(2));
  const lowRange = Number((totalQuintals * 0.88).toFixed(1));
  const highRange = Number((totalQuintals * 1.12).toFixed(1));

  const outlook: 'Favorable' | 'Moderate' | 'At Risk' =
    multiplier >= 1.03 ? 'Favorable' : multiplier >= 0.85 ? 'Moderate' : 'At Risk';

  return {
    source: 'DEMO',
    model: 'agrismart-demo-yield-v1',
    notice:
      'DEMO Advisory Mode: Calculated using South Asian crop baseline curves because OLLAMA_API_KEY is not configured. Do not treat as a live AI forecast.',
    cropName: input.cropName,
    predictedQuintalsPerAcre: perAcre,
    predictedTotalQuintals: totalQuintals,
    predictedTotalTonnes: totalTonnes,
    lowRangeQuintals: lowRange,
    highRangeQuintals: highRange,
    outlook,
    summary: `Estimated harvest for ${input.areaAcres} acres of ${input.cropName} (${input.season}) is ${totalQuintals} quintals (${perAcre} qtl/acre, or ${totalTonnes} metric tonnes).`,
    limitingFactors,
    improvementActions,
  };
}

export function computeDemoDiseaseDiagnosis(input: DiseaseInput): DiseaseDetectionResponse {
  const note = `${input.cropName} ${input.symptomsNote}`.toLowerCase();

  let diseaseName = 'Early Leaf Spot / Blight (Sample Advisory)';
  let scientificName = 'Alternaria solani / Cercospora spp.';
  let severity: 'normal' | 'moderate' | 'high' = 'moderate';
  let plainExplanation =
    'Brown concentric rings with faint yellow edges typically indicate fungal leaf spot triggered by warm, humid mornings and leaf wetness.';
  let visibleSymptoms = [
    'Dark brown target-like spots starting on older lower leaves',
    'Yellowing halo around leaf lesions',
    'Gradual drying of leaf margins if left untreated',
  ];
  let organicTreatments = [
    'Remove and destroy heavily spotted lower leaves away from the field.',
    'Spray Neem Oil (3 ml/litre water + mild soap sticker) in the early morning.',
    'Apply Trichoderma viride or Pseudomonas fluorescens bio-fungicide (5 g/litre) as foliar spray.',
  ];
  let chemicalTreatments = [
    'Spray Mancozeb 75% WP (2.5 g/litre water) or Azoxystrobin 23% SC (1 ml/litre) — follow label safety interval.',
    'Avoid spraying during high afternoon heat or wind speeds above 15 km/h.',
  ];
  let preventionSteps = [
    'Irrigate at the root zone in the morning so foliage dries before evening.',
    'Maintain proper plant spacing for airflow and rotate crops next season.',
    'Use certified disease-free seed treated with Carbendazim or Trichoderma.',
  ];
  let urgentAction = 'Isolate affected patches and spray bio-fungicide within 48 hours before humidity spreads spores.';

  if (note.includes('yellow') || note.includes('mosaic') || note.includes('curl') || note.includes('whitefly')) {
    diseaseName = 'Leaf Curl / Mosaic Virus (Vector-Borne Sample Advisory)';
    scientificName = 'Begomovirus (transmitted by Whitefly / Bemisia tabaci)';
    severity = 'high';
    plainExplanation =
      'Upward curling, crinkling, and yellow-green mottling are classic signs of viral infection spread by whiteflies or aphids.';
    visibleSymptoms = [
      'Upward curling and thickening of young leaves',
      'Yellow-green patchy mosaic pattern along leaf veins',
      'Stunted plant tips and flower drop',
    ];
    organicTreatments = [
      'Install 12–15 yellow sticky traps per acre immediately to trap whiteflies.',
      'Uproot and bury severely curled plants to stop spread to healthy rows.',
      'Spray Neem Seed Kernel Extract (NSKE 5%) at 5 ml/litre every 7 days.',
    ];
    chemicalTreatments = [
      'Control whitefly vectors using Imidacloprid 17.8% SL (0.5 ml/litre) or Diafenthiuron 50% WP (1 g/litre) as per local KVK guidance.',
    ];
    urgentAction = 'Control whitefly vectors immediately with yellow sticky traps and remove heavily infected plants.';
  } else if (note.includes('rust') || note.includes('orange') || note.includes('powder') || note.includes('white dust')) {
    diseaseName = 'Powdery Mildew / Leaf Rust (Sample Advisory)';
    scientificName = 'Puccinia spp. / Erysiphe spp.';
    severity = 'moderate';
    plainExplanation =
      'Powdery white or rusty orange-brown pustules on leaves reduce photosynthesis and spread quickly on dry, breezy afternoons after cool dewy nights.';
    visibleSymptoms = [
      'Powdery white coating or orange-brown spore dust on leaf surfaces',
      'Leaves turning pale yellow and curling inward',
      'Reduced pod or grain size during flowering',
    ];
    organicTreatments = [
      'Spray Wettable Sulphur (2 g/litre water) during cool morning hours.',
      'Use diluted sour buttermilk (1:10 with water) as a traditional organic foliar suppressant.',
    ];
    chemicalTreatments = [
      'Apply Propiconazole 25% EC (1 ml/litre) or Tebuconazole 25.9% EC (1 ml/litre) at first rust sign.',
    ];
    urgentAction = 'Apply Wettable Sulphur or recommended triazole spray before flowering stage.';
  } else if (note.includes('blast') || note.includes('rice') || note.includes('paddy') || note.includes('spindle')) {
    diseaseName = 'Rice Leaf Blast (Sample Advisory)';
    scientificName = 'Magnaporthe oryzae';
    severity = 'high';
    plainExplanation =
      'Diamond- or spindle-shaped spots with grey centres and brown borders appear rapidly when nitrogen is over-applied during humid monsoon nights.';
    visibleSymptoms = [
      'Spindle-shaped lesions with greyish-white centre and dark brown edge',
      'Lesions merging to dry out leaf tips',
      'Risk of neck blast at panicle emergence',
    ];
    organicTreatments = [
      'Pause Urea top-dressing immediately until infection stabilizes.',
      'Spray Pseudomonas fluorescens (10 g/litre water) twice at 10-day intervals.',
    ];
    chemicalTreatments = [
      'Spray Tricyclazole 75% WP (0.6 g/litre water) or Isoprothiolane 40% EC (1.5 ml/litre) covering leaf sheaths.',
    ];
    urgentAction = 'Stop extra Urea immediately and protect panicles with a preventive blast spray.';
  }

  return {
    source: 'DEMO',
    model: 'agrismart-demo-pathology-v1',
    notice:
      'DEMO Advisory Mode: Your photo was validated securely, but OLLAMA_API_KEY is not configured for live llama3.2-vision inspection. This advisory is matched from your crop and symptom notes for demonstration.',
    diseaseName,
    scientificName,
    affectedCrop: input.cropName || 'Crop Leaf',
    severity,
    confidenceLabel: 'DEMO Advisory (Configure Ollama Cloud for live vision scan)',
    plainExplanation,
    visibleSymptoms,
    organicTreatments,
    chemicalTreatments,
    preventionSteps,
    urgentAction,
  };
}

export function computeDemoDecisionPlan(input: DecisionInput): DecisionPlanResponse {
  const { farm, weatherSummary, recentDiseaseNote, farmerGoal } = input;
  const hasDiseaseRisk = recentDiseaseNote && !recentDiseaseNote.toLowerCase().includes('none');
  const hotWeather = weatherSummary.toLowerCase().includes('heat') || weatherSummary.includes('38');
  const heavyRain = weatherSummary.toLowerCase().includes('heavy rain') || weatherSummary.toLowerCase().includes('storm');

  const riskLevel: 'normal' | 'moderate' | 'high' =
    heavyRain || hasDiseaseRisk ? 'high' : hotWeather ? 'moderate' : 'normal';

  return {
    source: 'DEMO',
    model: 'agrismart-demo-decision-v1',
    notice:
      'DEMO Decision Plan: Synthesized deterministically from your farm plot and weather data because OLLAMA_API_KEY is not set on the server.',
    planTitle: `7-Day Field Action Plan — ${farm.name} (${farm.season})`,
    executiveSummary: `Tailored for ${farm.areaAcres} acres of ${farm.soilType} soil (${farm.currentCrop || 'planned crop'}) in ${farm.district}, ${farm.state}. Primary focus: ${farmerGoal || 'protecting yield and balancing soil moisture'}. Weather context (${input.weatherSource === 'LIVE_OPEN_METEO' ? 'Live Open-Meteo' : 'DEMO'}): ${weatherSummary}`,
    riskLevel,
    actionBlocks: [
      {
        area: 'Irrigation Plan',
        priority: heavyRain || hotWeather ? 'Immediate' : 'This Week',
        headline: heavyRain
          ? 'Pause irrigation and clear field drainage channels'
          : hotWeather
            ? 'Shift irrigation to early morning (5:30–8:00 AM)'
            : `Maintain scheduled ${farm.irrigationType} moisture cycle`,
        steps: heavyRain
          ? [
              'Open perimeter bund outlets to prevent standing water for more than 12 hours.',
              'Hold irrigation for 4–5 days after significant rainfall.',
            ]
          : [
              `Run ${farm.irrigationType} during cooler morning hours to cut evaporation loss.`,
              'Check topsoil moisture at 4-inch depth before scheduling the next cycle.',
            ],
      },
      {
        area: 'Fertilizer & Soil',
        priority: farm.nitrogen < 55 || farm.soilPh < 6 || farm.soilPh > 8 ? 'This Week' : 'Monitor',
        headline: `Balance NPK (${farm.nitrogen}-${farm.phosphorus}-${farm.potassium}) at pH ${farm.soilPh}`,
        steps: [
          farm.nitrogen < 55
            ? 'Apply split neem-coated Urea top-dressing after light irrigation.'
            : 'Nitrogen is adequate; avoid over-applying Urea during humid evenings.',
          farm.soilPh > 7.9
            ? 'Incorporate compost/FYM and gypsum before next sowing to ease alkalinity.'
            : 'Maintain organic matter with mulching or green manure between cycles.',
        ],
      },
      {
        area: 'Pest & Disease Watch',
        priority: hasDiseaseRisk ? 'Immediate' : 'Monitor',
        headline: hasDiseaseRisk
          ? `Follow up on recent scan: ${recentDiseaseNote.slice(0, 70)}`
          : 'Walk diagonal field rows twice this week for early leaf spots or sucking pests',
        steps: [
          'Inspect underside of young leaves at sunrise for whiteflies, aphids, or fungal spots.',
          'Install pheromone or yellow sticky traps (10–12/acre) before chemical spraying.',
          'Only spray when wind speed is under 15 km/h and no rain is forecast for 6 hours.',
        ],
      },
      {
        area: 'Harvest & Market',
        priority: 'Monitor',
        headline: 'Track local APMC mandi rates and keep storage moisture below 12%',
        steps: [
          'Compare nearest APMC mandi and FPO buyer prices 10 days before harvest.',
          'Dry harvested grain on clean tarpaulin to avoid aflatoxin or fungal spoilage.',
        ],
      },
    ],
    sevenDaySchedule: [
      { day: 'Day 1 (Today)', task: heavyRain ? 'Inspect drainage bunds and delay spraying.' : 'Check soil moisture and inspect lower crop leaves.' },
      { day: 'Day 2', task: 'Install/check sticky traps and review nutrient foliar needs.' },
      { day: 'Day 3', task: `Scheduled ${farm.irrigationType} check + weed clearing along bunds.` },
      { day: 'Day 4', task: 'Mid-week weather alert check before any fertilizer or bio-spray.' },
      { day: 'Day 5', task: 'Record crop growth stage and update farm plot notes in AgriSmart.' },
      { day: 'Day 6', task: 'Check local mandi rates and input stock for next week.' },
      { day: 'Day 7', task: 'Weekly farm walk & review next week weather forecast.' },
    ],
  };
}

export function computeDemoAgriBotReply(input: ChatRequestInput): ChatResponse {
  const q = input.message.toLowerCase();
  const ctx = input.farmContext;
  const plotIntro = ctx
    ? `For your plot "${ctx.name}" (${ctx.areaAcres} acres, ${ctx.soilType} soil, pH ${ctx.soilPh}, ${ctx.season} season in ${ctx.district}): `
    : '';

  let reply = '';

  if (q.includes('fertilizer') || q.includes('urea') || q.includes('dap') || q.includes('npk')) {
    reply = `${plotIntro}Always split Nitrogen (Urea) into 2–3 doses instead of dumping it all at once—basal at sowing, first top-dress at 21–25 days, and second at 45 days. Apply DAP and Potash at sowing near the root zone, and add 2–3 tonnes/acre of well-rotted FYM compost so roots absorb nutrients smoothly.`;
  } else if (q.includes('water') || q.includes('irrigat') || q.includes('drip') || q.includes('rain')) {
    reply = `${plotIntro}Water early in the morning (5:30–8:30 AM) to save up to 25% evaporation and keep leaves dry overnight so fungus cannot spread. Check soil 4 inches deep by hand—if it forms a soft ball that crumbles gently, moisture is sufficient. Never leave water standing for more than 12 hours in non-paddy crops.`;
  } else if (q.includes('pest') || q.includes('disease') || q.includes('spot') || q.includes('yellow') || q.includes('blight') || q.includes('insect')) {
    reply = `${plotIntro}Start with Integrated Pest Management: remove heavily affected lower leaves, place 10–12 yellow sticky traps per acre, and spray Neem Oil (3 ml/litre water) in cool morning hours. If spots spread rapidly, upload a clear leaf photo in the Plant Disease Detection tab for targeted organic and chemical options.`;
  } else if (q.includes('kharif') || q.includes('rabi') || q.includes('zaid') || q.includes('sow') || q.includes('crop')) {
    reply = `${plotIntro}In South Asia, match your crop to season and water access: Kharif (June–Oct) favors Paddy, Cotton, Groundnut, Bajra, or Maize; Rabi (Nov–Mar) favors Wheat, Mustard, and Chickpea (Chana); Zaid (Mar–Jun) is ideal for short-duration Moong Dal, Bajra, or vegetables. Run the AI Crop Recommendation tab with your soil NPK for ranked quintals/acre estimates.`;
  } else {
    reply = `${plotIntro}Here is practical guidance for "${input.message.slice(0, 80)}":\n1. Base sowing and fertilizer doses on your current soil pH (${ctx ? ctx.soilPh : '6.8'}) and moisture.\n2. Check the live Weather Forecast tab before spraying or irrigating.\n3. Keep weekly field notes so AgriSmart can track seasonal yield progress.\n\nAsk me specifically about fertilizer schedules, irrigation timing, pest control, or Kharif/Rabi crop selection!`;
  }

  return {
    source: 'DEMO',
    model: 'agrismart-demo-chat-v1',
    notice: 'DEMO Advisory Mode: Configure OLLAMA_API_KEY on the server to chat with live Ollama Cloud qwen2.5.',
    reply,
  };
}

// --- Real WMO Weather Mapping & Agronomic Weather Alerts ---

export function mapWmoWeatherCode(code: number): {
  condition: string;
  icon: 'sun' | 'partly-cloudy' | 'cloud' | 'rain' | 'storm' | 'fog';
} {
  if (code === 0) return { condition: 'Clear Sky', icon: 'sun' };
  if (code === 1 || code === 2) return { condition: 'Partly Cloudy', icon: 'partly-cloudy' };
  if (code === 3) return { condition: 'Overcast', icon: 'cloud' };
  if (code === 45 || code === 48) return { condition: 'Morning Fog / Mist', icon: 'fog' };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: 'Light Drizzle', icon: 'rain' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: 'Rain Showers', icon: 'rain' };
  if ([95, 96, 99].includes(code)) return { condition: 'Thunderstorm', icon: 'storm' };
  return { condition: 'Variable Clouds', icon: 'partly-cloudy' };
}

export function deriveWeatherAlerts(
  current: WeatherCurrent,
  daily: WeatherDayForecast[]
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const next3Days = daily.slice(0, 3);
  const maxTemp3d = Math.max(current.temperatureC, ...next3Days.map((d) => d.tempMaxC));
  const minTemp3d = Math.min(current.temperatureC, ...next3Days.map((d) => d.tempMinC));
  const maxRainDay = Math.max(...next3Days.map((d) => d.precipitationMm), 0);
  const maxWind = Math.max(current.windSpeedKmh, ...next3Days.map((d) => d.windMaxKmh));
  const hasStorm = next3Days.some((d) => d.conditionIcon === 'storm') || current.conditionIcon === 'storm';

  if (hasStorm) {
    alerts.push({
      id: 'alert_storm',
      severity: 'critical',
      title: 'Thunderstorm & Squall Watch',
      action: 'Postpone spraying and harvesting; secure nursery shade nets and clear drainage bunds.',
      metric: 'Storm forecast in 72h',
    });
  }

  if (maxTemp3d >= 38) {
    alerts.push({
      id: 'alert_heat',
      severity: maxTemp3d >= 42 ? 'critical' : 'warning',
      title: 'Heat Stress Warning',
      action: 'Irrigate early morning (5:30–8:00 AM) and apply straw mulching to cool root zones.',
      metric: `Peak ${maxTemp3d.toFixed(1)} °C`,
    });
  }

  if (maxRainDay >= 30) {
    alerts.push({
      id: 'alert_rain',
      severity: maxRainDay >= 60 ? 'critical' : 'warning',
      title: 'Heavy Rainfall & Waterlogging Risk',
      action: 'Delay fertilizer top-dressing and open field drainage outlets before heavy showers arrive.',
      metric: `Up to ${maxRainDay.toFixed(1)} mm/day`,
    });
  }

  if (maxWind >= 20) {
    alerts.push({
      id: 'alert_wind',
      severity: 'warning',
      title: 'High Spray-Drift Wind Advisory',
      action: 'Avoid pesticide or foliar spraying during windy hours; spray only below 15 km/h wind.',
      metric: `Gusts ${maxWind.toFixed(0)} km/h`,
    });
  }

  if (current.humidityPct >= 82 && current.temperatureC >= 18 && current.temperatureC <= 32) {
    alerts.push({
      id: 'alert_fungal',
      severity: 'warning',
      title: 'Elevated Fungal & Blight Humidity',
      action: 'Inspect lower leaves for blight or rust spots; avoid evening overhead watering.',
      metric: `${current.humidityPct}% humidity`,
    });
  }

  if (minTemp3d <= 7) {
    alerts.push({
      id: 'alert_cold',
      severity: 'warning',
      title: 'Cold Night / Frost Watch',
      action: 'Give light evening irrigation to protect tender Rabi seedlings and vegetable nurseries.',
      metric: `Low ${minTemp3d.toFixed(1)} °C`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'alert_clear',
      severity: 'info',
      title: 'Favorable Field Window',
      action: 'Conditions are suitable for routine scouting, weeding, and scheduled morning irrigation.',
      metric: `${current.temperatureC.toFixed(1)} °C · ${current.windSpeedKmh.toFixed(0)} km/h wind`,
    });
  }

  return alerts;
}

export function getFallbackDemoWeather(
  locationLabel: string,
  latitude: number,
  longitude: number
): WeatherReport {
  const now = new Date();
  const current: WeatherCurrent = {
    temperatureC: 31.2,
    apparentTemperatureC: 33.4,
    humidityPct: 68,
    precipitationMm: 0.4,
    windSpeedKmh: 12.6,
    weatherCode: 2,
    condition: 'Partly Cloudy',
    conditionIcon: 'partly-cloudy',
    soilMoisture: 0.28,
    observedAt: now.toISOString(),
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const pattern = [
    { max: 32.5, min: 23.2, rain: 2.4, prob: 35, wind: 14, uv: 8.2, code: 2 },
    { max: 31.0, min: 22.8, rain: 14.2, prob: 65, wind: 18, uv: 6.5, code: 61 },
    { max: 29.4, min: 22.1, rain: 34.8, prob: 80, wind: 22, uv: 5.1, code: 63 },
    { max: 31.8, min: 23.0, rain: 4.0, prob: 30, wind: 13, uv: 7.9, code: 2 },
    { max: 33.4, min: 24.1, rain: 0.0, prob: 10, wind: 11, uv: 8.8, code: 0 },
    { max: 34.1, min: 24.4, rain: 0.0, prob: 10, wind: 12, uv: 9.0, code: 1 },
    { max: 33.0, min: 23.8, rain: 3.2, prob: 25, wind: 15, uv: 8.1, code: 2 },
  ];

  const daily: WeatherDayForecast[] = pattern.map((p, idx) => {
    const d = new Date(now.getTime() + idx * 86400000);
    const mapped = mapWmoWeatherCode(p.code);
    return {
      date: d.toISOString().slice(0, 10),
      dayLabel: idx === 0 ? 'Today' : dayNames[d.getDay()],
      tempMaxC: p.max,
      tempMinC: p.min,
      precipitationMm: p.rain,
      precipitationProbPct: p.prob,
      windMaxKmh: p.wind,
      uvIndexMax: p.uv,
      weatherCode: p.code,
      condition: mapped.condition,
      conditionIcon: mapped.icon,
    };
  });

  return {
    source: 'DEMO',
    providerLabel: 'DEMO Sample Weather (Live Open-Meteo unreachable)',
    notice:
      'DEMO Weather Fallback: Could not reach Open-Meteo live servers right now. Figures below are clearly marked DEMO sample data — do not rely on them as live weather.',
    locationLabel,
    latitude,
    longitude,
    timezone: 'Asia/Kolkata',
    current,
    daily,
    alerts: deriveWeatherAlerts(current, daily),
  };
}
