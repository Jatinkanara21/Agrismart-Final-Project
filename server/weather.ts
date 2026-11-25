import type { GeocodeResult, WeatherCurrent, WeatherDayForecast, WeatherReport } from '../src/types/agrismart.ts';
import {
  clampNumber,
  deriveWeatherAlerts,
  getFallbackDemoWeather,
  mapWmoWeatherCode,
} from '../src/utils/agronomy.ts';

const OPEN_METEO_GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const TIMEOUT_MS = Math.min(20000, Math.max(3000, Number(process.env.OPEN_METEO_TIMEOUT_MS) || 10000));

const FALLBACK_SOUTH_ASIA_LOCATIONS: GeocodeResult[] = [
  { name: 'Anand', admin1: 'Gujarat', country: 'India', latitude: 22.5645, longitude: 72.9289, label: 'Anand, Gujarat, India' },
  { name: 'Ludhiana', admin1: 'Punjab', country: 'India', latitude: 30.901, longitude: 75.8573, label: 'Ludhiana, Punjab, India' },
  { name: 'Nashik', admin1: 'Maharashtra', country: 'India', latitude: 19.9975, longitude: 73.7898, label: 'Nashik, Maharashtra, India' },
  { name: 'Indore', admin1: 'Madhya Pradesh', country: 'India', latitude: 22.7196, longitude: 75.8577, label: 'Indore, Madhya Pradesh, India' },
  { name: 'Thanjavur', admin1: 'Tamil Nadu', country: 'India', latitude: 10.787, longitude: 79.1378, label: 'Thanjavur, Tamil Nadu, India' },
  { name: 'Karnal', admin1: 'Haryana', country: 'India', latitude: 29.6857, longitude: 76.9905, label: 'Karnal, Haryana, India' },
  { name: 'Rajkot', admin1: 'Gujarat', country: 'India', latitude: 22.3039, longitude: 70.8022, label: 'Rajkot, Gujarat, India' },
  { name: 'Guntur', admin1: 'Andhra Pradesh', country: 'India', latitude: 16.3067, longitude: 80.4365, label: 'Guntur, Andhra Pradesh, India' },
];

export async function geocodeLocation(query: string): Promise<{ results: GeocodeResult[]; source: 'LIVE_OPEN_METEO' | 'DEMO' }> {
  const cleaned = query.trim().slice(0, 80);
  if (cleaned.length < 2) {
    return { results: [], source: 'LIVE_OPEN_METEO' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL(OPEN_METEO_GEOCODE_URL);
    url.searchParams.set('name', cleaned);
    url.searchParams.set('count', '6');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Open-Meteo geocoding HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      results?: Array<{
        name: string;
        admin1?: string;
        country?: string;
        latitude: number;
        longitude: number;
      }>;
    };

    const results: GeocodeResult[] = (data.results || []).map((item) => ({
      name: item.name,
      admin1: item.admin1,
      country: item.country,
      latitude: Number(item.latitude.toFixed(4)),
      longitude: Number(item.longitude.toFixed(4)),
      label: [item.name, item.admin1, item.country].filter(Boolean).join(', '),
    }));

    return { results, source: 'LIVE_OPEN_METEO' };
  } catch {
    const lower = cleaned.toLowerCase();
    const matched = FALLBACK_SOUTH_ASIA_LOCATIONS.filter((loc) =>
      loc.label.toLowerCase().includes(lower)
    );
    return {
      results: matched.length > 0 ? matched : FALLBACK_SOUTH_ASIA_LOCATIONS.slice(0, 4),
      source: 'DEMO',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLiveWeatherForecast(
  lat: number,
  lon: number,
  locationLabel: string
): Promise<WeatherReport> {
  const safeLat = clampNumber(lat, -90, 90);
  const safeLon = clampNumber(lon, -180, 180);
  const safeLabel = locationLabel.trim().slice(0, 120) || `${safeLat.toFixed(2)}, ${safeLon.toFixed(2)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL(OPEN_METEO_FORECAST_URL);
    url.searchParams.set('latitude', String(safeLat));
    url.searchParams.set('longitude', String(safeLon));
    url.searchParams.set(
      'current',
      'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m'
    );
    url.searchParams.set('hourly', 'soil_moisture_0_to_1cm');
    url.searchParams.set(
      'daily',
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max'
    );
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '7');

    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Open-Meteo forecast HTTP ${res.status}`);
    }

    const payload = (await res.json()) as {
      timezone?: string;
      current?: {
        time?: string;
        temperature_2m?: number;
        relative_humidity_2m?: number;
        apparent_temperature?: number;
        precipitation?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
      hourly?: {
        soil_moisture_0_to_1cm?: Array<number | null>;
      };
      daily?: {
        time?: string[];
        weather_code?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_sum?: number[];
        precipitation_probability_max?: number[];
        wind_speed_10m_max?: number[];
        uv_index_max?: number[];
      };
    };

    if (!payload.current || !payload.daily?.time?.length) {
      throw new Error('Incomplete weather payload from Open-Meteo.');
    }

    const currentCode = Number(payload.current.weather_code ?? 0);
    const mappedCurrent = mapWmoWeatherCode(currentCode);
    const soilValues = payload.hourly?.soil_moisture_0_to_1cm || [];
    const latestSoil = soilValues.find((v) => typeof v === 'number' && Number.isFinite(v)) ?? null;

    const current: WeatherCurrent = {
      temperatureC: Number((payload.current.temperature_2m ?? 0).toFixed(1)),
      apparentTemperatureC: Number((payload.current.apparent_temperature ?? payload.current.temperature_2m ?? 0).toFixed(1)),
      humidityPct: Math.round(payload.current.relative_humidity_2m ?? 0),
      precipitationMm: Number((payload.current.precipitation ?? 0).toFixed(1)),
      windSpeedKmh: Number((payload.current.wind_speed_10m ?? 0).toFixed(1)),
      weatherCode: currentCode,
      condition: mappedCurrent.condition,
      conditionIcon: mappedCurrent.icon,
      soilMoisture: latestSoil !== null ? Number(latestSoil.toFixed(2)) : null,
      observedAt: payload.current.time || new Date().toISOString(),
    };

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daily: WeatherDayForecast[] = payload.daily.time.map((isoDate, idx) => {
      const code = Number(payload.daily?.weather_code?.[idx] ?? 0);
      const mapped = mapWmoWeatherCode(code);
      const dateObj = new Date(`${isoDate}T12:00:00`);
      return {
        date: isoDate,
        dayLabel: idx === 0 ? 'Today' : dayNames[dateObj.getDay()] || isoDate.slice(5),
        tempMaxC: Number((payload.daily?.temperature_2m_max?.[idx] ?? 0).toFixed(1)),
        tempMinC: Number((payload.daily?.temperature_2m_min?.[idx] ?? 0).toFixed(1)),
        precipitationMm: Number((payload.daily?.precipitation_sum?.[idx] ?? 0).toFixed(1)),
        precipitationProbPct: Math.round(payload.daily?.precipitation_probability_max?.[idx] ?? 0),
        windMaxKmh: Number((payload.daily?.wind_speed_10m_max?.[idx] ?? 0).toFixed(1)),
        uvIndexMax: Number((payload.daily?.uv_index_max?.[idx] ?? 0).toFixed(1)),
        weatherCode: code,
        condition: mapped.condition,
        conditionIcon: mapped.icon,
      };
    });

    return {
      source: 'LIVE_OPEN_METEO',
      providerLabel: 'Live Open-Meteo Meteorological Forecast',
      locationLabel: safeLabel,
      latitude: safeLat,
      longitude: safeLon,
      timezone: payload.timezone || 'Asia/Kolkata',
      current,
      daily,
      alerts: deriveWeatherAlerts(current, daily),
    };
  } catch {
    return getFallbackDemoWeather(safeLabel, safeLat, safeLon);
  } finally {
    clearTimeout(timer);
  }
}
