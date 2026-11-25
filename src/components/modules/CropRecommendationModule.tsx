import React, { useEffect, useState } from 'react';
import { Check, Droplets, RotateCcw, Sprout } from 'lucide-react';
import { useAgri } from '../../context/AgriContext';
import { apiClient } from '../../lib/apiClient';
import { validateCropInput } from '../../utils/agronomy';
import { ErrorAlert, SkeletonRows, SourceBanner } from '../SourceNotice';
import type {
  CropRecommendationResponse,
  CroppingSeason,
  IrrigationType,
  SoilType,
} from '../../types/agrismart';

const SOIL_TYPES: SoilType[] = [
  'Alluvial',
  'Black Cotton',
  'Red Loam',
  'Sandy Loam',
  'Clay Loam',
  'Laterite',
];

const IRRIGATION_TYPES: IrrigationType[] = [
  'Canal',
  'Borewell / Tubewell',
  'Drip Irrigation',
  'Sprinkler',
  'Rainfed Only',
];

const SEASONS: CroppingSeason[] = ['Kharif', 'Rabi', 'Zaid'];

export function CropRecommendationModule() {
  const { activeFarm, weather, saveAnalysis } = useAgri();

  const [nitrogen, setNitrogen] = useState('82');
  const [phosphorus, setPhosphorus] = useState('44');
  const [potassium, setPotassium] = useState('56');
  const [soilPh, setSoilPh] = useState('7.1');
  const [temperatureC, setTemperatureC] = useState('30');
  const [rainfallMm, setRainfallMm] = useState('850');
  const [humidityPct, setHumidityPct] = useState('72');
  const [areaAcres, setAreaAcres] = useState('4.5');
  const [soilType, setSoilType] = useState<SoilType>('Alluvial');
  const [irrigationType, setIrrigationType] = useState<IrrigationType>('Canal');
  const [season, setSeason] = useState<CroppingSeason>('Kharif');
  const [district, setDistrict] = useState('Anand');
  const [stateName, setStateName] = useState('Gujarat');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<CropRecommendationResponse | null>(null);
  const [savedFlag, setSavedFlag] = useState(false);

  const syncFromActiveFarm = () => {
    if (!activeFarm) return;
    setNitrogen(String(activeFarm.nitrogen));
    setPhosphorus(String(activeFarm.phosphorus));
    setPotassium(String(activeFarm.potassium));
    setSoilPh(String(activeFarm.soilPh));
    setAreaAcres(String(activeFarm.areaAcres));
    setSoilType(activeFarm.soilType);
    setIrrigationType(activeFarm.irrigationType);
    setSeason(activeFarm.season);
    setDistrict(activeFarm.district);
    setStateName(activeFarm.state);
    if (weather) {
      setTemperatureC(String(Math.round(weather.current.temperatureC)));
      setHumidityPct(String(weather.current.humidityPct));
    }
    setErrors({});
  };

  useEffect(() => {
    syncFromActiveFarm();
  }, [activeFarm?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSavedFlag(false);

    const payload = {
      nitrogen: Number(nitrogen),
      phosphorus: Number(phosphorus),
      potassium: Number(potassium),
      soilPh: Number(soilPh),
      temperatureC: Number(temperatureC),
      rainfallMm: Number(rainfallMm),
      humidityPct: Number(humidityPct),
      areaAcres: Number(areaAcres),
      soilType,
      irrigationType,
      season,
      district: district.trim(),
      state: stateName.trim(),
    };

    const check = validateCropInput(payload);
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const response = await apiClient.recommendCrop(payload);
      setResult(response);
      if (activeFarm) {
        const top = response.recommendations[0];
        await saveAnalysis({
          farmId: activeFarm.id,
          farmName: activeFarm.name,
          moduleType: 'crop',
          source: response.source,
          model: response.model,
          title: `${season} Crop Advice: ${top?.cropName || 'Recommended Crops'}`,
          summary: response.summary,
          severity: 'normal',
          highlights: response.recommendations.map(
            (r) => `${r.cropName}: ${r.expectedYieldQuintalsPerAcre} qtl/ac (${r.suitabilityScore}%)`
          ),
        });
        setSavedFlag(true);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unable to generate crop recommendations.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#17211A]">AI Crop Recommendation</h2>
          <p className="text-sm text-[#526157] mt-1">
            Enter your soil test numbers and seasonal rainfall to find the highest-fit South Asian
            crops for your plot.
          </p>
        </div>
        {activeFarm && (
          <button
            type="button"
            onClick={syncFromActiveFarm}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#DCE3D7] bg-white text-xs font-semibold text-[#17211A] hover:border-[#1B5E3C] inline-flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Sync from {activeFarm.name}
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-5 bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="crop-season" className="block text-xs font-semibold text-[#17211A] mb-1">
                Season
              </label>
              <select
                id="crop-season"
                value={season}
                onChange={(e) => setSeason(e.target.value as CroppingSeason)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] text-sm focus:outline-none focus:border-[#1B5E3C]"
              >
                {SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="crop-acres" className="block text-xs font-semibold text-[#17211A] mb-1">
                Plot Area (acres)
              </label>
              <input
                id="crop-acres"
                type="number"
                step="0.1"
                value={areaAcres}
                onChange={(e) => setAreaAcres(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-white font-mono tabular-nums text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {errors.areaAcres && <p className="text-xs text-red-700 mt-1">{errors.areaAcres}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="crop-soil" className="block text-xs font-semibold text-[#17211A] mb-1">
                Soil Type
              </label>
              <select
                id="crop-soil"
                value={soilType}
                onChange={(e) => setSoilType(e.target.value as SoilType)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] text-sm focus:outline-none focus:border-[#1B5E3C]"
              >
                {SOIL_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="crop-irrigation" className="block text-xs font-semibold text-[#17211A] mb-1">
                Irrigation Source
              </label>
              <select
                id="crop-irrigation"
                value={irrigationType}
                onChange={(e) => setIrrigationType(e.target.value as IrrigationType)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] text-sm focus:outline-none focus:border-[#1B5E3C]"
              >
                {IRRIGATION_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Soil NPK */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="crop-n" className="block text-xs font-semibold text-[#17211A] mb-1">
                Nitrogen (kg/ha)
              </label>
              <input
                id="crop-n"
                type="number"
                value={nitrogen}
                onChange={(e) => setNitrogen(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-white font-mono tabular-nums text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {errors.nitrogen && <p className="text-[11px] text-red-700 mt-1">{errors.nitrogen}</p>}
            </div>
            <div>
              <label htmlFor="crop-p" className="block text-xs font-semibold text-[#17211A] mb-1">
                Phosphorus
              </label>
              <input
                id="crop-p"
                type="number"
                value={phosphorus}
                onChange={(e) => setPhosphorus(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-white font-mono tabular-nums text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {errors.phosphorus && <p className="text-[11px] text-red-700 mt-1">{errors.phosphorus}</p>}
            </div>
            <div>
              <label htmlFor="crop-k" className="block text-xs font-semibold text-[#17211A] mb-1">
                Potassium
              </label>
              <input
                id="crop-k"
                type="number"
                value={potassium}
                onChange={(e) => setPotassium(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-white font-mono tabular-nums text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {errors.potassium && <p className="text-[11px] text-red-700 mt-1">{errors.potassium}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3">
            <div>
              <label htmlFor="crop-ph" className="block text-xs font-semibold text-[#17211A] mb-1">
                Soil pH (3–10)
              </label>
              <input
                id="crop-ph"
                type="number"
                step="0.1"
                value={soilPh}
                onChange={(e) => setSoilPh(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-white font-mono tabular-nums text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {errors.soilPh && <p className="text-[11px] text-red-700 mt-1">{errors.soilPh}</p>}
            </div>
            <div>
              <label htmlFor="crop-temp" className="block text-xs font-semibold text-[#17211A] mb-1">
                Avg Temp (°C)
              </label>
              <input
                id="crop-temp"
                type="number"
                step="0.5"
                value={temperatureC}
                onChange={(e) => setTemperatureC(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-white font-mono tabular-nums text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {errors.temperatureC && <p className="text-[11px] text-red-700 mt-1">{errors.temperatureC}</p>}
            </div>
            <div>
              <label htmlFor="crop-rain" className="block text-xs font-semibold text-[#17211A] mb-1">
                Season Rain (mm)
              </label>
              <input
                id="crop-rain"
                type="number"
                value={rainfallMm}
                onChange={(e) => setRainfallMm(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-white font-mono tabular-nums text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {errors.rainfallMm && <p className="text-[11px] text-red-700 mt-1">{errors.rainfallMm}</p>}
            </div>
            <div>
              <label htmlFor="crop-hum" className="block text-xs font-semibold text-[#17211A] mb-1">
                Humidity (%)
              </label>
              <input
                id="crop-hum"
                type="number"
                value={humidityPct}
                onChange={(e) => setHumidityPct(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-white font-mono tabular-nums text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {errors.humidityPct && <p className="text-[11px] text-red-700 mt-1">{errors.humidityPct}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="crop-district" className="block text-xs font-semibold text-[#17211A] mb-1">
                District
              </label>
              <input
                id="crop-district"
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-white text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
            </div>
            <div>
              <label htmlFor="crop-state" className="block text-xs font-semibold text-[#17211A] mb-1">
                State
              </label>
              <input
                id="crop-state"
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-white text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#1B5E3C] text-white text-sm font-semibold hover:bg-[#14482D] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Sprout className="w-4 h-4" aria-hidden="true" />
            {loading ? 'Analyzing soil & season...' : 'Get Crop Recommendations'}
          </button>
        </form>

        {/* Results Pane */}
        <div className="lg:col-span-7 space-y-4">
          {apiError && <ErrorAlert message={apiError} />}
          {loading && <SkeletonRows count={3} />}

          {!loading && !result && (
            <div className="bg-white border border-[#DCE3D7] rounded-3xl p-8 text-center space-y-2.5">
              <Sprout className="w-8 h-8 text-[#1B5E3C] mx-auto" aria-hidden="true" />
              <h3 className="font-display text-lg font-bold text-[#17211A]">
                Ready to match crops to your soil
              </h3>
              <p className="text-sm text-[#526157] max-w-md mx-auto leading-relaxed">
                Confirm your soil NPK, pH, and season on the left, then tap{' '}
                <strong className="text-[#17211A]">Get Crop Recommendations</strong> for ranked
                South Asian crop choices and sowing advice.
              </p>
            </div>
          )}

          {!loading && result && (
            <div className="space-y-4">
              <SourceBanner
                source={result.source}
                modelOrProvider={result.model}
                notice={result.notice}
              />

              <section className="bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-[#17211A]">
                    Agronomy Summary
                  </h3>
                  {savedFlag && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803D]">
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      Saved to history
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#17211A] leading-relaxed">{result.summary}</p>
                <p className="text-xs text-[#526157] pt-2 border-t border-[#EDF1EA] leading-relaxed">
                  <strong className="text-[#17211A]">Soil Health Check:</strong>{' '}
                  {result.soilHealthNote}
                </p>
              </section>

              <div className="space-y-3">
                {result.recommendations.map((crop, idx) => (
                  <article
                    key={`${crop.cropName}-${idx}`}
                    className="bg-white border border-[#DCE3D7] rounded-2xl p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-[#526157]">
                          Choice 0{idx + 1} · {crop.localName}
                        </p>
                        <h4 className="font-display text-lg font-bold text-[#17211A]">
                          {crop.cropName}
                        </h4>
                      </div>
                      <div className="text-right">
                        <p className="font-mono tabular-nums text-lg font-semibold text-[#1B5E3C]">
                          {crop.suitabilityScore}% match
                        </p>
                        <p className="font-mono tabular-nums text-xs text-[#526157]">
                          Est. {crop.expectedYieldQuintalsPerAcre} qtl/acre
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#526157] py-2 border-y border-[#EDF1EA]">
                      <span className="inline-flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5 text-[#1B5E3C]" aria-hidden="true" />
                        Water need: <strong className="text-[#17211A]">{crop.waterNeed}</strong>
                      </span>
                      <span>
                        Sow: <strong className="text-[#17211A]">{crop.sowingWindow}</strong>
                      </span>
                      <span>
                        Cycle: <strong className="text-[#17211A]">{crop.durationDays}</strong>
                      </span>
                    </div>

                    <p className="text-sm text-[#17211A] leading-relaxed">{crop.whyItFits}</p>
                    <p className="text-xs text-[#526157] leading-relaxed">
                      <strong className="text-[#6B4E37]">Fertilizer Tip:</strong>{' '}
                      {crop.fertilizerTip}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
