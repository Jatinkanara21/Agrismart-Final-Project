import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDemoAgriBotReply,
  computeDemoCropRecommendation,
  computeDemoDecisionPlan,
  computeDemoDiseaseDiagnosis,
  computeDemoYieldPrediction,
  deriveWeatherAlerts,
  getFallbackDemoWeather,
  mapWmoWeatherCode,
  validateAdvisoryInput,
  validateCropInput,
  validateFarmInput,
  validateImageUpload,
  validateYieldInput,
} from './agronomy';

test('validateFarmInput rejects empty required fields and invalid soil pH', () => {
  const res = validateFarmInput({
    name: '',
    district: 'A',
    state: '',
    areaAcres: -2,
    soilPh: 12.5,
    nitrogen: 400,
    phosphorus: 40,
    potassium: 40,
    latitude: 22.5,
    longitude: 72.9,
  });
  assert.equal(res.valid, false);
  assert.ok(res.errors.name);
  assert.ok(res.errors.areaAcres);
  assert.ok(res.errors.soilPh);
  assert.ok(res.errors.nitrogen);
});

test('validateFarmInput accepts valid South Asian farm plot', () => {
  const res = validateFarmInput({
    name: 'North Canal Plot',
    district: 'Anand',
    state: 'Gujarat',
    areaAcres: 4.5,
    soilPh: 7.1,
    nitrogen: 82,
    phosphorus: 44,
    potassium: 58,
    latitude: 22.5645,
    longitude: 72.9289,
  });
  assert.equal(res.valid, true);
  assert.deepEqual(res.errors, {});
});

test('validateImageUpload enforces MIME allowlist and 5 MB limit', () => {
  assert.equal(validateImageUpload('image/jpeg', 1024 * 500).valid, true);
  assert.equal(validateImageUpload('image/png', 1024 * 1024).valid, true);
  assert.equal(validateImageUpload('image/svg+xml', 1024).valid, false);
  assert.equal(validateImageUpload('application/pdf', 1024).valid, false);
  assert.equal(validateImageUpload('image/jpeg', 6 * 1024 * 1024).valid, false);
  assert.equal(validateImageUpload('image/png', 0).valid, false);
});

test('computeDemoCropRecommendation returns top 3 Kharif crops with DEMO label', () => {
  const result = computeDemoCropRecommendation({
    nitrogen: 90,
    phosphorus: 42,
    potassium: 55,
    soilPh: 6.8,
    temperatureC: 30,
    rainfallMm: 950,
    humidityPct: 78,
    areaAcres: 3.5,
    soilType: 'Alluvial',
    irrigationType: 'Canal',
    season: 'Kharif',
    district: 'Anand',
    state: 'Gujarat',
  });
  assert.equal(result.source, 'DEMO');
  assert.equal(result.recommendations.length, 3);
  assert.ok(result.recommendations[0].suitabilityScore >= result.recommendations[1].suitabilityScore);
  assert.ok(result.recommendations[0].expectedYieldQuintalsPerAcre > 0);
});

test('computeDemoYieldPrediction scales total quintals and tonnes linearly with acreage', () => {
  const base = {
    cropName: 'Wheat',
    areaAcres: 2,
    season: 'Rabi' as const,
    soilType: 'Alluvial' as const,
    irrigationType: 'Canal' as const,
    nitrogen: 80,
    phosphorus: 40,
    potassium: 50,
    soilPh: 7.0,
    expectedRainfallMm: 120,
    fertilizerLevel: 'Balanced' as const,
    district: 'Ludhiana',
  };
  const twoAcres = computeDemoYieldPrediction(base);
  const fourAcres = computeDemoYieldPrediction({ ...base, areaAcres: 4 });
  assert.equal(twoAcres.source, 'DEMO');
  assert.equal(fourAcres.predictedTotalQuintals, Number((twoAcres.predictedTotalQuintals * 2).toFixed(1)));
  assert.equal(fourAcres.predictedTotalTonnes, Number((fourAcres.predictedTotalQuintals / 10).toFixed(2)));
});

test('computeDemoDiseaseDiagnosis responds to rice blast symptoms with DEMO notice', () => {
  const diag = computeDemoDiseaseDiagnosis({
    imageBase64: 'AAAA',
    mimeType: 'image/jpeg',
    fileName: 'paddy_leaf.jpg',
    cropName: 'Paddy',
    symptomsNote: 'Spindle-shaped grey blast spots on leaves',
  });
  assert.equal(diag.source, 'DEMO');
  assert.equal(diag.severity, 'high');
  assert.match(diag.diseaseName, /Blast/i);
  assert.ok(diag.organicTreatments.length > 0);
});

test('deriveWeatherAlerts triggers heat, rain, wind, and storm warnings accurately', () => {
  const alerts = deriveWeatherAlerts(
    {
      temperatureC: 41.5,
      apparentTemperatureC: 44,
      humidityPct: 45,
      precipitationMm: 0,
      windSpeedKmh: 24,
      weatherCode: 95,
      condition: 'Thunderstorm',
      conditionIcon: 'storm',
      soilMoisture: 0.15,
      observedAt: new Date().toISOString(),
    },
    [
      {
        date: '2026-11-24',
        dayLabel: 'Today',
        tempMaxC: 42.5,
        tempMinC: 27,
        precipitationMm: 65,
        precipitationProbPct: 90,
        windMaxKmh: 30,
        uvIndexMax: 9,
        weatherCode: 95,
        condition: 'Thunderstorm',
        conditionIcon: 'storm',
      },
    ]
  );
  const titles = alerts.map((a) => a.title);
  assert.ok(titles.some((t) => t.includes('Thunderstorm')));
  assert.ok(titles.some((t) => t.includes('Heat Stress')));
  assert.ok(titles.some((t) => t.includes('Heavy Rainfall')));
  assert.ok(titles.some((t) => t.includes('Spray-Drift Wind')));
});

test('computeDemoDecisionPlan & AgriBot return structured DEMO outputs', () => {
  const plan = computeDemoDecisionPlan({
    farm: {
      name: 'East Plot',
      district: 'Anand',
      state: 'Gujarat',
      areaAcres: 3,
      soilType: 'Black Cotton',
      irrigationType: 'Drip Irrigation',
      season: 'Kharif',
      currentCrop: 'Bt Cotton',
      nitrogen: 50,
      phosphorus: 35,
      potassium: 45,
      soilPh: 7.4,
    },
    weatherSummary: 'Partly cloudy 32C, light rain possible',
    weatherSource: 'LIVE_OPEN_METEO',
    recentDiseaseNote: 'None',
    farmerGoal: 'Improve cotton boll retention',
  });
  assert.equal(plan.source, 'DEMO');
  assert.equal(plan.actionBlocks.length, 4);
  assert.equal(plan.sevenDaySchedule.length, 7);

  const chat = computeDemoAgriBotReply({
    message: 'How should I split Urea fertilizer?',
    history: [],
  });
  assert.equal(chat.source, 'DEMO');
  assert.match(chat.reply, /Urea|Nitrogen/i);
});

test('validators for crop, yield, advisory, WMO codes and fallback weather behave reliably', () => {
  assert.equal(validateCropInput({ nitrogen: 80, phosphorus: 40, potassium: 40, soilPh: 6.5, temperatureC: 28, rainfallMm: 600, humidityPct: 70, areaAcres: 2 }).valid, true);
  assert.equal(validateYieldInput({ cropName: 'Wheat', areaAcres: 3, soilPh: 7.1, expectedRainfallMm: 100 }).valid, true);
  assert.equal(validateAdvisoryInput({ title: 'Rain Alert', region: 'Gujarat', message: 'Clear bunds before Friday showers.' }).valid, true);
  assert.equal(mapWmoWeatherCode(0).icon, 'sun');
  assert.equal(mapWmoWeatherCode(95).icon, 'storm');
  const demoWeather = getFallbackDemoWeather('Anand, Gujarat', 22.56, 72.93);
  assert.equal(demoWeather.source, 'DEMO');
  assert.equal(demoWeather.daily.length, 7);
});
