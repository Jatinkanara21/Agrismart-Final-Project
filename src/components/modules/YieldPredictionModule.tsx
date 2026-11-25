import React, { useEffect, useState } from 'react';
import { BarChart3, Check, TrendingUp } from 'lucide-react';
import { useAgri } from '../../context/AgriContext';
import { apiClient } from '../../lib/apiClient';
import { validateYieldInput } from '../../utils/agronomy';
import { ErrorAlert, SkeletonRows, SourceBanner } from '../SourceNotice';
import type {
  CroppingSeason,
  IrrigationType,
  SoilType,
  YieldPredictionResponse,
} from '../../types/agrismart';

const CROP_OPTIONS = [
  'Basmati Paddy (Rice)',
  'Wheat (HD-2967 / GW-496)',
  'Bt Cotton',
  'Groundnut',
  'Indian Mustard',
  'Chickpea (Desi Chana)',
  'Hybrid Maize',
  'Green Gram (Moong Dal)',
  'Pearl Millet (Bajra)',
  'Tomato (Hybrid)',
];

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

export function YieldPredictionModule() {
  const { activeFarm, saveAnalysis } = useAgri();

  const [cropName, setCropName] = useState(activeFarm?.currentCrop || 'Basmati Paddy (Rice)');
  const [areaAcres, setAreaAcres] = useState(String(activeFarm?.areaAcres || 4.5));
  const [season, setSeason] = useState<CroppingSeason>(activeFarm?.season || 'Kharif');
  const [soilType, setSoilType] = useState<SoilType>(activeFarm?.soilType || 'Alluvial');
  const [irrigationType, setIrrigationType] = useState<IrrigationType>(
    activeFarm?.irrigationType || 'Canal'
  );
  const [nitrogen, setNitrogen] = useState(String(activeFarm?.nitrogen || 82));
  const [phosphorus, setPhosphorus] = useState(String(activeFarm?.phosphorus || 44));
  const [potassium, setPotassium] = useState(String(activeFarm?.potassium || 56));
  const [soilPh, setSoilPh] = useState(String(activeFarm?.soilPh || 7.1));
  const [expectedRainfallMm, setExpectedRainfallMm] = useState('780');
  const [fertilizerLevel, setFertilizerLevel] = useState<'Low' | 'Balanced' | 'Intensive'>(
    'Balanced'
  );
  const [district, setDistrict] = useState(activeFarm?.district || 'Anand');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<YieldPredictionResponse | null>(null);
  const [savedFlag, setSavedFlag] = useState(false);

  useEffect(() => {
    if (!activeFarm) return;
    if (activeFarm.currentCrop) setCropName(activeFarm.currentCrop);
    setAreaAcres(String(activeFarm.areaAcres));
    setSeason(activeFarm.season);
    setSoilType(activeFarm.soilType);
    setIrrigationType(activeFarm.irrigationType);
    setNitrogen(String(activeFarm.nitrogen));
    setPhosphorus(String(activeFarm.phosphorus));
    setPotassium(String(activeFarm.potassium));
    setSoilPh(String(activeFarm.soilPh));
    setDistrict(activeFarm.district);
  }, [activeFarm?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSavedFlag(false);

    const payload = {
      cropName,
      areaAcres: Number(areaAcres),
      season,
      soilType,
      irrigationType,
      nitrogen: Number(nitrogen),
      phosphorus: Number(phosphorus),
      potassium: Number(potassium),
      soilPh: Number(soilPh),
      expectedRainfallMm: Number(expectedRainfallMm),
      fertilizerLevel,
      district: district.trim() || 'Anand',
    };

    const check = validateYieldInput(payload);
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const response = await apiClient.predictYield(payload);
      setResult(response);
      if (activeFarm) {
        await saveAnalysis({
          farmId: activeFarm.id,
          farmName: activeFarm.name,
          moduleType: 'yield',
          source: response.source,
          model: response.model,
          title: `Yield Forecast: ${response.cropName} (${response.predictedTotalQuintals} qtl)`,
          summary: response.summary,
          severity: response.outlook === 'At Risk' ? 'high' : response.outlook === 'Moderate' ? 'moderate' : 'normal',
          highlights: [
            `${response.predictedQuintalsPerAcre} qtl/acre`,
            `Total: ${response.predictedTotalQuintals} qtl (${response.predictedTotalTonnes} t)`,
            `Outlook: ${response.outlook}`,
          ],
        });
        setSavedFlag(true);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unable to estimate crop yield.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#17211A]">Crop Yield Prediction</h2>
        <p className="text-sm text-[#526157] mt-1">
          Estimate expected harvest output in quintals per acre and total tonnes based on your
          plot size, soil fertility, rainfall, and irrigation setup.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-5 bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-4"
        >
          <div>
            <label htmlFor="yield-crop" className="block text-xs font-semibold text-[#17211A] mb-1">
              Crop
            </label>
            <select
              id="yield-crop"
              value={cropName}
              onChange={(e) => setCropName(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] text-sm focus:outline-none focus:border-[#1B5E3C]"
            >
              {CROP_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.cropName && <p className="text-xs text-red-700 mt-1">{errors.cropName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="yield-acres" className="block text-xs font-semibold text-[#17211A] mb-1">
                Planted Area (acres)
              </label>
              <input
                id="yield-acres"
                type="number"
                step="0.1"
                value={areaAcres}
                onChange={(e) => setAreaAcres(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-white font-mono tabular-nums text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {errors.areaAcres && <p className="text-xs text-red-700 mt-1">{errors.areaAcres}</p>}
            </div>
            <div>
              <label htmlFor="yield-season" className="block text-xs font-semibold text-[#17211A] mb-1">
                Season
              </label>
              <select
                id="yield-season"
                value={season}
                onChange={(e) => setSeason(e.target.value as CroppingSeason)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] text-sm focus:outline-none focus:border-[#1B5E3C]"
              >
                <option value="Kharif">Kharif</option>
                <option value="Rabi">Rabi</option>
                <option value="Zaid">Zaid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="yield-soil" className="block text-xs font-semibold text-[#17211A] mb-1">
                Soil Type
              </label>
              <select
                id="yield-soil"
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
              <label htmlFor="yield-irrigation" className="block text-xs font-semibold text-[#17211A] mb-1">
                Irrigation
              </label>
              <select
                id="yield-irrigation"
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="yield-fert" className="block text-xs font-semibold text-[#17211A] mb-1">
                Fertilizer Program
              </label>
              <select
                id="yield-fert"
                value={fertilizerLevel}
                onChange={(e) =>
                  setFertilizerLevel(e.target.value as 'Low' | 'Balanced' | 'Intensive')
                }
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] text-sm focus:outline-none focus:border-[#1B5E3C]"
              >
                <option value="Low">Low / Organic Only</option>
                <option value="Balanced">Balanced Soil-Test NPK</option>
                <option value="Intensive">Intensive + Micronutrients</option>
              </select>
            </div>
            <div>
              <label htmlFor="yield-rain" className="block text-xs font-semibold text-[#17211A] mb-1">
                Season Rain (mm)
              </label>
              <input
                id="yield-rain"
                type="number"
                value={expectedRainfallMm}
                onChange={(e) => setExpectedRainfallMm(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-white font-mono tabular-nums text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {errors.expectedRainfallMm && (
                <p className="text-[11px] text-red-700 mt-1">{errors.expectedRainfallMm}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="yield-ph" className="block text-xs font-semibold text-[#17211A] mb-1">
                Soil pH
              </label>
              <input
                id="yield-ph"
                type="number"
                step="0.1"
                value={soilPh}
                onChange={(e) => setSoilPh(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-white font-mono tabular-nums text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {errors.soilPh && <p className="text-[11px] text-red-700 mt-1">{errors.soilPh}</p>}
            </div>
            <div>
              <label htmlFor="yield-district" className="block text-xs font-semibold text-[#17211A] mb-1">
                District
              </label>
              <input
                id="yield-district"
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-white text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#1B5E3C] text-white text-sm font-semibold hover:bg-[#14482D] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
            {loading ? 'Calculating harvest forecast...' : 'Predict Crop Yield'}
          </button>
        </form>

        {/* Prediction Output */}
        <div className="lg:col-span-7 space-y-4">
          {apiError && <ErrorAlert message={apiError} />}
          {loading && <SkeletonRows count={3} />}

          {!loading && !result && (
            <div className="bg-white border border-[#DCE3D7] rounded-3xl p-8 text-center space-y-2.5">
              <TrendingUp className="w-8 h-8 text-[#1B5E3C] mx-auto" aria-hidden="true" />
              <h3 className="font-display text-lg font-bold text-[#17211A]">
                Estimate your harvest before sowing or sale
              </h3>
              <p className="text-sm text-[#526157] max-w-md mx-auto leading-relaxed">
                Enter your crop and plot details to see estimated quintals per acre, total
                harvest range, and steps that protect or raise yield.
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

              <section className="bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-[#526157]">
                      {result.cropName} · Outlook:{' '}
                      <strong
                        className={
                          result.outlook === 'Favorable'
                            ? 'text-[#15803D]'
                            : result.outlook === 'At Risk'
                              ? 'text-red-700'
                              : 'text-[#B45309]'
                        }
                      >
                        {result.outlook}
                      </strong>
                    </p>
                    <h3 className="font-display text-2xl font-bold text-[#17211A] mt-0.5 font-mono tabular-nums">
                      {result.predictedTotalQuintals} Quintals
                    </h3>
                  </div>
                  {savedFlag && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803D]">
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      Saved to history
                    </span>
                  )}
                </div>

                {/* Key Numeric Strip */}
                <div className="grid grid-cols-3 gap-4 py-3.5 border-y border-[#EDF1EA]">
                  <div>
                    <p className="text-xs text-[#526157]">Per Acre</p>
                    <p className="font-mono tabular-nums text-lg font-semibold text-[#1B5E3C] mt-0.5">
                      {result.predictedQuintalsPerAcre} qtl
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#526157]">Total Tonnes</p>
                    <p className="font-mono tabular-nums text-lg font-semibold text-[#17211A] mt-0.5">
                      {result.predictedTotalTonnes} t
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#526157]">Expected Band</p>
                    <p className="font-mono tabular-nums text-sm font-semibold text-[#17211A] mt-1">
                      {result.lowRangeQuintals}–{result.highRangeQuintals} qtl
                    </p>
                  </div>
                </div>

                {/* Clean Range Meter */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[#526157] font-mono tabular-nums">
                    <span>Conservative: {result.lowRangeQuintals} qtl</span>
                    <span>Best Case: {result.highRangeQuintals} qtl</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#EDF1EA] overflow-hidden relative">
                    <div
                      className="h-full bg-[#1B5E3C] rounded-full"
                      style={{ width: '68%' }}
                    />
                  </div>
                </div>

                <p className="text-sm text-[#17211A] leading-relaxed">{result.summary}</p>

                <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-[#EDF1EA]">
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-[#6B4E37]">Limiting Factors</h4>
                    <ul className="space-y-1.5 text-xs text-[#526157] leading-relaxed list-disc pl-4">
                      {result.limitingFactors.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-[#14482D]">How to Improve Yield</h4>
                    <ul className="space-y-1.5 text-xs text-[#17211A] leading-relaxed list-disc pl-4">
                      {result.improvementActions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
