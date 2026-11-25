import React, { useState } from 'react';
import {
  AlertTriangle,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  MapPin,
  RefreshCw,
  Search,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';
import { useAgri } from '../../context/AgriContext';
import { apiClient } from '../../lib/apiClient';
import { ErrorAlert, SkeletonRows, SourceBanner } from '../SourceNotice';
import type { GeocodeResult } from '../../types/agrismart';

function WeatherIcon({
  type,
  className = 'w-5 h-5',
}: {
  type: 'sun' | 'partly-cloudy' | 'cloud' | 'rain' | 'storm' | 'fog';
  className?: string;
}) {
  switch (type) {
    case 'sun':
      return <Sun className={`${className} text-amber-600`} aria-hidden="true" />;
    case 'partly-cloudy':
      return <CloudSun className={`${className} text-[#1B5E3C]`} aria-hidden="true" />;
    case 'cloud':
      return <Cloud className={`${className} text-slate-600`} aria-hidden="true" />;
    case 'rain':
      return <CloudRain className={`${className} text-sky-700`} aria-hidden="true" />;
    case 'storm':
      return <CloudLightning className={`${className} text-red-700`} aria-hidden="true" />;
    case 'fog':
      return <CloudFog className={`${className} text-slate-500`} aria-hidden="true" />;
  }
}

export function WeatherForecastModule() {
  const { activeFarm, weather, weatherLoading, weatherError, refreshWeather } = useAgri();

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    const cleaned = query.trim();
    if (cleaned.length < 2) {
      setSearchError('Enter at least 2 letters of a town, taluka, or district.');
      return;
    }
    setSearching(true);
    try {
      const res = await apiClient.geocode(cleaned);
      setSuggestions(res.results);
      if (res.results.length === 0) {
        setSearchError(`No locations found matching "${cleaned}". Try a nearby district name.`);
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Location search failed.');
    } finally {
      setSearching(false);
    }
  };

  const selectLocation = async (loc: GeocodeResult) => {
    setSuggestions([]);
    setQuery(loc.label);
    await refreshWeather(loc.latitude, loc.longitude, loc.label);
  };

  const useActiveFarmLocation = async () => {
    if (!activeFarm) return;
    setSuggestions([]);
    setQuery('');
    await refreshWeather(
      activeFarm.latitude,
      activeFarm.longitude,
      `${activeFarm.district}, ${activeFarm.state}`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#17211A]">
            Weather Forecast &amp; Field Alerts
          </h2>
          <p className="text-sm text-[#526157] mt-1">
            Live Open-Meteo 7-day agricultural forecast with automatic heat, drainage, spray-wind,
            and fungal humidity alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeFarm && (
            <button
              type="button"
              onClick={() => void useActiveFarmLocation()}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#DCE3D7] bg-white text-xs font-semibold text-[#17211A] hover:border-[#1B5E3C] inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <MapPin className="w-3.5 h-3.5 text-[#1B5E3C]" aria-hidden="true" />
              {activeFarm.district}
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              void refreshWeather(weather?.latitude, weather?.longitude, weather?.locationLabel)
            }
            disabled={weatherLoading}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#1B5E3C] text-white text-xs font-semibold hover:bg-[#14482D] inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${weatherLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {/* Location Search Bar */}
      <form
        onSubmit={handleSearch}
        className="bg-white border border-[#DCE3D7] rounded-2xl p-4 space-y-3"
      >
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-[#526157] absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <label htmlFor="weather-location-search" className="sr-only">
              Search town or district
            </label>
            <input
              id="weather-location-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any town or district (e.g. Nashik, Ludhiana, Rajkot, Thanjavur)"
              className="w-full min-h-[44px] pl-10 pr-3 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] text-sm focus:outline-none focus:border-[#1B5E3C] focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1B5E3C] text-white text-sm font-semibold hover:bg-[#14482D] transition-colors whitespace-nowrap disabled:opacity-60"
          >
            {searching ? 'Searching...' : 'Search Location'}
          </button>
        </div>

        {searchError && <p className="text-xs text-red-700">{searchError}</p>}

        {suggestions.length > 0 && (
          <div className="border-t border-[#EDF1EA] pt-2.5 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {suggestions.map((loc) => (
              <button
                key={`${loc.label}-${loc.latitude}`}
                type="button"
                onClick={() => void selectLocation(loc)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] hover:border-[#1B5E3C] hover:bg-[#E7F2EC]/50 text-left transition-colors"
              >
                <p className="text-sm font-semibold text-[#17211A] truncate">{loc.name}</p>
                <p className="text-xs text-[#526157] truncate">
                  {[loc.admin1, loc.country].filter(Boolean).join(', ')}
                </p>
              </button>
            ))}
          </div>
        )}
      </form>

      {weatherError && (
        <ErrorAlert
          message={weatherError}
          onRetry={() =>
            void refreshWeather(weather?.latitude, weather?.longitude, weather?.locationLabel)
          }
        />
      )}

      {weatherLoading && !weather && <SkeletonRows count={3} />}

      {weather && (
        <div className="space-y-5">
          <SourceBanner
            source={weather.source}
            modelOrProvider={weather.providerLabel}
            notice={weather.notice}
          />

          {/* Current Weather Hero + Agronomic Alerts */}
          <div className="grid lg:grid-cols-12 gap-5 items-stretch">
            <section className="lg:col-span-6 bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-[#526157]">
                    {weather.locationLabel} ·{' '}
                    <span className="font-mono tabular-nums">
                      {weather.latitude.toFixed(2)}°N, {weather.longitude.toFixed(2)}°E
                    </span>
                  </p>
                  <div className="flex items-baseline gap-3 mt-2">
                    <span className="font-mono tabular-nums text-4xl sm:text-5xl font-semibold text-[#17211A]">
                      {weather.current.temperatureC}°C
                    </span>
                    <span className="text-sm font-medium text-[#526157]">
                      Feels like {weather.current.apparentTemperatureC}°C
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#14482D] mt-1">
                    {weather.current.condition}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-[#F6F7F4] border border-[#DCE3D7] flex items-center justify-center shrink-0">
                  <WeatherIcon type={weather.current.conditionIcon} className="w-7 h-7" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#EDF1EA]">
                <div>
                  <p className="text-xs text-[#526157] flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-[#1B5E3C]" aria-hidden="true" />
                    Humidity
                  </p>
                  <p className="font-mono tabular-nums text-base font-semibold mt-0.5">
                    {weather.current.humidityPct}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#526157] flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-[#1B5E3C]" aria-hidden="true" />
                    Wind
                  </p>
                  <p className="font-mono tabular-nums text-base font-semibold mt-0.5">
                    {weather.current.windSpeedKmh} km/h
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#526157] flex items-center gap-1">
                    <CloudRain className="w-3.5 h-3.5 text-[#1B5E3C]" aria-hidden="true" />
                    Current Rain
                  </p>
                  <p className="font-mono tabular-nums text-base font-semibold mt-0.5">
                    {weather.current.precipitationMm} mm
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#526157] flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-[#1B5E3C]" aria-hidden="true" />
                    Topsoil Moisture
                  </p>
                  <p className="font-mono tabular-nums text-base font-semibold mt-0.5">
                    {weather.current.soilMoisture !== null
                      ? `${Math.round(weather.current.soilMoisture * 100)}%`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </section>

            {/* Derived Field Alerts */}
            <section className="lg:col-span-6 bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-3">
              <div>
                <h3 className="font-display text-lg font-bold text-[#17211A]">
                  Automated Farming Alerts
                </h3>
                <p className="text-xs text-[#526157]">
                  Calculated directly from temperature, rainfall, wind speed, and humidity thresholds
                </p>
              </div>
              <div className="space-y-2.5">
                {weather.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-xl border px-4 py-3 text-sm ${
                      alert.severity === 'critical'
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : alert.severity === 'warning'
                          ? 'bg-[#FDF6E9] border-[#EAD5AE] text-[#7A4A0B]'
                          : 'bg-[#E7F2EC] border-[#BDDAC9] text-[#14482D]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                        {alert.title}
                      </p>
                      <span className="font-mono tabular-nums text-xs shrink-0">
                        {alert.metric}
                      </span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">{alert.action}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* 7-Day Forecast Table / Cards */}
          <section className="bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-lg font-bold text-[#17211A]">
                7-Day Field Forecast
              </h3>
              <span className="text-xs text-[#526157]">High / Low °C · Rainfall mm · Max Wind</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              {weather.daily.map((day) => (
                <div
                  key={day.date}
                  className="rounded-2xl border border-[#DCE3D7] bg-[#F6F7F4] p-3.5 flex sm:flex-col items-center sm:items-stretch justify-between gap-2"
                >
                  <div className="flex items-center sm:justify-between gap-2.5">
                    <div>
                      <p className="text-sm font-bold text-[#17211A]">{day.dayLabel}</p>
                      <p className="font-mono tabular-nums text-[11px] text-[#526157]">
                        {day.date.slice(5)}
                      </p>
                    </div>
                    <WeatherIcon type={day.conditionIcon} className="w-5 h-5" />
                  </div>

                  <p className="hidden sm:block text-xs text-[#526157] truncate">{day.condition}</p>

                  <div className="text-right sm:text-left space-y-0.5">
                    <p className="font-mono tabular-nums text-sm font-semibold text-[#17211A]">
                      {day.tempMaxC}° / <span className="text-[#526157]">{day.tempMinC}°</span>
                    </p>
                    <p className="font-mono tabular-nums text-[11px] text-[#526157]">
                      Rain: {day.precipitationMm} mm ({day.precipitationProbPct}%)
                    </p>
                    <p className="font-mono tabular-nums text-[11px] text-[#526157]">
                      Wind: {day.windMaxKmh} km/h
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
