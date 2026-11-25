import React, { useState } from 'react';
import { Calendar, Check, Compass, ShieldAlert } from 'lucide-react';
import { useAgri } from '../../context/AgriContext';
import { apiClient } from '../../lib/apiClient';
import { EmptyState, ErrorAlert, SkeletonRows, SourceBanner } from '../SourceNotice';
import type { DecisionPlanResponse } from '../../types/agrismart';

export function DecisionEngineModule() {
  const { activeFarm, weather, analyses, saveAnalysis, setActiveTab } = useAgri();

  const latestDisease = analyses.find((a) => a.moduleType === 'disease');

  const [farmerGoal, setFarmerGoal] = useState(
    'Protect crop health, save irrigation water, and maximize quintals per acre'
  );
  const [recentDiseaseNote, setRecentDiseaseNote] = useState(
    latestDisease ? `${latestDisease.title}: ${latestDisease.summary.slice(0, 140)}` : 'None reported'
  );
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [plan, setPlan] = useState<DecisionPlanResponse | null>(null);
  const [savedFlag, setSavedFlag] = useState(false);

  if (!activeFarm) {
    return (
      <EmptyState
        title="Add a farm plot first"
        description="The AI Agricultural Decision Engine combines your farm soil profile, live weather, and recent leaf scans. Register a plot to generate your 7-day plan."
        actionLabel="Register Farm Plot"
        onAction={() => setActiveTab('farms')}
      />
    );
  }

  const weatherSummaryText = weather
    ? `${weather.current.temperatureC}°C, ${weather.current.condition}, ${weather.current.humidityPct}% humidity, wind ${weather.current.windSpeedKmh} km/h. Top alert: ${weather.alerts[0]?.title || 'Clear'}`
    : 'Weather not loaded yet; apply standard seasonal field practices.';

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSavedFlag(false);
    setLoading(true);

    try {
      const response = await apiClient.generateDecisionPlan({
        farm: {
          name: activeFarm.name,
          district: activeFarm.district,
          state: activeFarm.state,
          areaAcres: activeFarm.areaAcres,
          soilType: activeFarm.soilType,
          irrigationType: activeFarm.irrigationType,
          season: activeFarm.season,
          currentCrop: activeFarm.currentCrop,
          nitrogen: activeFarm.nitrogen,
          phosphorus: activeFarm.phosphorus,
          potassium: activeFarm.potassium,
          soilPh: activeFarm.soilPh,
        },
        weatherSummary: weatherSummaryText,
        weatherSource: weather?.source || 'DEMO',
        recentDiseaseNote,
        farmerGoal,
      });
      setPlan(response);
      await saveAnalysis({
        farmId: activeFarm.id,
        farmName: activeFarm.name,
        moduleType: 'decision',
        source: response.source,
        model: response.model,
        title: response.planTitle,
        summary: response.executiveSummary,
        severity: response.riskLevel,
        highlights: response.actionBlocks.map((b) => `${b.area}: ${b.headline}`).slice(0, 4),
      });
      setSavedFlag(true);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Decision Engine failed to build plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#17211A]">
          AI Agricultural Decision Engine
        </h2>
        <p className="text-sm text-[#526157] mt-1">
          Combines your active farm&apos;s soil NPK, live Open-Meteo weather alerts, and recent
          leaf scans into one practical 7-day action plan.
        </p>
      </div>

      {/* Combined Context Form */}
      <form
        onSubmit={handleGenerate}
        className="bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-4"
      >
        <div className="grid sm:grid-cols-3 gap-4 pb-4 border-b border-[#EDF1EA] text-xs">
          <div>
            <span className="text-[#526157]">Selected Plot</span>
            <p className="text-sm font-bold text-[#17211A] mt-0.5">
              {activeFarm.name} ({activeFarm.areaAcres} ac)
            </p>
            <p className="text-[#526157]">
              {activeFarm.soilType} · pH {activeFarm.soilPh} · {activeFarm.season}
            </p>
          </div>
          <div>
            <span className="text-[#526157]">
              Weather Input ({weather?.source === 'LIVE_OPEN_METEO' ? 'Live' : 'DEMO'})
            </span>
            <p className="text-xs font-medium text-[#17211A] mt-0.5 leading-relaxed">
              {weatherSummaryText}
            </p>
          </div>
          <div>
            <span className="text-[#526157]">Soil NPK &amp; Irrigation</span>
            <p className="font-mono tabular-nums text-sm font-semibold text-[#17211A] mt-0.5">
              N {activeFarm.nitrogen} · P {activeFarm.phosphorus} · K {activeFarm.potassium}
            </p>
            <p className="text-[#526157]">{activeFarm.irrigationType}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dec-goal" className="block text-xs font-semibold text-[#17211A] mb-1">
              Your Main Goal This Week
            </label>
            <input
              id="dec-goal"
              type="text"
              value={farmerGoal}
              onChange={(e) => setFarmerGoal(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] text-sm focus:outline-none focus:border-[#1B5E3C]"
            />
          </div>
          <div>
            <label htmlFor="dec-disease" className="block text-xs font-semibold text-[#17211A] mb-1">
              Recent Pest or Disease Notes
            </label>
            <input
              id="dec-disease"
              type="text"
              value={recentDiseaseNote}
              onChange={(e) => setRecentDiseaseNote(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] text-sm focus:outline-none focus:border-[#1B5E3C]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="min-h-[48px] px-6 py-3 rounded-xl bg-[#1B5E3C] text-white text-sm font-semibold hover:bg-[#14482D] transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Compass className="w-4 h-4" aria-hidden="true" />
          {loading ? 'Synthesizing 7-day field plan...' : 'Generate 7-Day Action Plan'}
        </button>
      </form>

      {apiError && <ErrorAlert message={apiError} />}
      {loading && <SkeletonRows count={3} />}

      {!loading && plan && (
        <div className="space-y-5">
          <SourceBanner
            source={plan.source}
            modelOrProvider={plan.model}
            notice={plan.notice}
          />

          <section className="bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-[#6B4E37] flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                  Field Risk Level: <span className="uppercase">{plan.riskLevel}</span>
                </p>
                <h3 className="font-display text-xl font-bold text-[#17211A] mt-0.5">
                  {plan.planTitle}
                </h3>
              </div>
              {savedFlag && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803D]">
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  Saved to history
                </span>
              )}
            </div>
            <p className="text-sm text-[#17211A] leading-relaxed">{plan.executiveSummary}</p>

            {/* 4 Pillars */}
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              {plan.actionBlocks.map((block) => (
                <article
                  key={block.area}
                  className="rounded-2xl border border-[#DCE3D7] bg-[#F6F7F4] p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#14482D]">{block.area}</span>
                    <span
                      className={`font-semibold ${
                        block.priority === 'Immediate'
                          ? 'text-red-700'
                          : block.priority === 'This Week'
                            ? 'text-[#B45309]'
                            : 'text-[#526157]'
                      }`}
                    >
                      {block.priority}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#17211A]">{block.headline}</h4>
                  <ul className="space-y-1 text-xs text-[#526157] leading-relaxed list-disc pl-4">
                    {block.steps.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          {/* Day-by-Day Schedule */}
          <section className="bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-3">
            <h3 className="font-display text-lg font-bold text-[#17211A] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#1B5E3C]" aria-hidden="true" />
              7-Day Field Schedule
            </h3>
            <div className="divide-y divide-[#EDF1EA]">
              {plan.sevenDaySchedule.map((item) => (
                <div
                  key={item.day}
                  className="py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm"
                >
                  <span className="font-mono tabular-nums text-xs font-semibold text-[#1B5E3C] sm:w-32 shrink-0">
                    {item.day}
                  </span>
                  <span className="text-[#17211A]">{item.task}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
