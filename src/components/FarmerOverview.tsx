import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CloudSun,
  Compass,
  Droplets,
  Leaf,
  Megaphone,
  MessageSquare,
  Sprout,
  Tractor,
  Trash2,
  Wind,
} from 'lucide-react';
import { useAgri } from '../context/AgriContext';
import { EmptyState, SkeletonRows, SourceBanner } from './SourceNotice';
import type { FarmerNavTab, ModuleType } from '../types/agrismart';

const MODULE_LAUNCHERS: {
  tab: FarmerNavTab;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    tab: 'crop',
    title: 'AI Crop Recommendation',
    desc: 'Best Kharif, Rabi & Zaid crops from your soil NPK and pH.',
    icon: Sprout,
  },
  {
    tab: 'disease',
    title: 'Plant Disease Detection',
    desc: 'Upload a crop leaf photo for organic and chemical care steps.',
    icon: Leaf,
  },
  {
    tab: 'yield',
    title: 'Crop Yield Prediction',
    desc: 'Estimate harvest in quintals/acre and total metric tonnes.',
    icon: BarChart3,
  },
  {
    tab: 'weather',
    title: 'Weather Forecast & Alerts',
    desc: 'Live 7-day Open-Meteo rain, heat, wind, and blight warnings.',
    icon: CloudSun,
  },
  {
    tab: 'agribot',
    title: 'AgriBot AI Chatbot',
    desc: 'Ask everyday farming questions with your plot context built in.',
    icon: MessageSquare,
  },
  {
    tab: 'decision',
    title: 'AI Decision Engine',
    desc: 'Unified 7-day irrigation, soil, pest, and harvest action plan.',
    icon: Compass,
  },
];

export function FarmerOverview() {
  const {
    user,
    activeFarm,
    farms,
    analyses,
    advisories,
    weather,
    weatherLoading,
    setActiveTab,
    deleteAnalysis,
    dataLoading,
  } = useAgri();

  const [historyFilter, setHistoryFilter] = useState<'all' | ModuleType>('all');

  const filteredAnalyses =
    historyFilter === 'all'
      ? analyses
      : analyses.filter((a) => a.moduleType === historyFilter);

  const activeAlerts = weather?.alerts || [];
  const totalAcres = farms.reduce((sum, f) => sum + Number(f.areaAcres || 0), 0);

  return (
    <div className="space-y-6">
      {/* Greeting & Active Farm Summary Hero */}
      <section className="bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#526157]">
              Firebase Cloud Account · {user?.district}, {user?.state}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17211A]">
              Namaste, {user?.displayName.split(' ')[0]}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('decision')}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1B5E3C] text-white text-sm font-semibold hover:bg-[#14482D] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Compass className="w-4 h-4" aria-hidden="true" />
              Build 7-Day Field Plan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('farms')}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] text-[#17211A] text-sm font-semibold hover:border-[#1B5E3C] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Tractor className="w-4 h-4" aria-hidden="true" />
              Manage Farms ({farms.length})
            </button>
          </div>
        </div>

        {/* Clean Unboxed KPI Row with Tabular Numerals */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#DCE3D7]">
          <div>
            <p className="text-xs text-[#526157]">Active Plot</p>
            <p className="text-base font-bold text-[#17211A] mt-0.5 truncate">
              {activeFarm ? activeFarm.name : 'No plot yet'}
            </p>
            <p className="text-xs text-[#526157] mt-0.5">
              {activeFarm ? `${activeFarm.season} · ${activeFarm.currentCrop || 'Unplanted'}` : 'Add a plot'}
            </p>
          </div>

          <div>
            <p className="text-xs text-[#526157]">Total Land Registered</p>
            <p className="font-mono tabular-nums text-xl font-semibold text-[#17211A] mt-0.5">
              {totalAcres.toFixed(1)} ac
            </p>
            <p className="text-xs text-[#526157] mt-0.5">
              {farms.length} {farms.length === 1 ? 'plot' : 'plots'}
            </p>
          </div>

          <div>
            <p className="text-xs text-[#526157]">Soil NPK (kg/ha)</p>
            <p className="font-mono tabular-nums text-xl font-semibold text-[#17211A] mt-0.5 whitespace-nowrap">
              {activeFarm
                ? `${activeFarm.nitrogen}-${activeFarm.phosphorus}-${activeFarm.potassium}`
                : '—'}
            </p>
            <p className="text-xs text-[#526157] mt-0.5 truncate">
              {activeFarm ? `pH ${activeFarm.soilPh} · ${activeFarm.soilType}` : 'Add soil values'}
            </p>
          </div>

          <div>
            <p className="text-xs text-[#526157]">
              Field Weather ({weather?.source === 'LIVE_OPEN_METEO' ? 'Live' : 'DEMO'})
            </p>
            <p className="font-mono tabular-nums text-xl font-semibold text-[#17211A] mt-0.5 whitespace-nowrap">
              {weatherLoading ? '...' : weather ? `${weather.current.temperatureC} °C` : '—'}
            </p>
            <p className="text-xs text-[#526157] mt-0.5 truncate">
              {weather ? `${weather.current.condition} · ${weather.current.humidityPct}% RH` : 'Checking...'}
            </p>
          </div>
        </div>
      </section>

      {/* Live Weather & Active Advisories 2-Column Split */}
      <div className="grid lg:grid-cols-12 gap-5 items-stretch">
        {/* Weather Snapshot */}
        <section className="lg:col-span-7 bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold text-[#17211A]">
                Field Weather &amp; Spray Window
              </h3>
              <p className="text-xs text-[#526157]">
                {weather?.locationLabel || 'Loading location'} ·{' '}
                {weather?.source === 'LIVE_OPEN_METEO' ? 'Live Open-Meteo' : 'DEMO Fallback'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('weather')}
              className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1B5E3C] hover:bg-[#E7F2EC] transition-colors inline-flex items-center gap-1 whitespace-nowrap"
            >
              7-Day Forecast
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {weatherLoading && !weather ? (
            <SkeletonRows count={2} />
          ) : weather ? (
            <div className="space-y-4">
              {weather.source === 'DEMO' && (
                <SourceBanner
                  source={weather.source}
                  modelOrProvider={weather.providerLabel}
                  notice={weather.notice}
                />
              )}

              <div className="grid grid-cols-3 gap-3 py-3 border-y border-[#DCE3D7]">
                <div className="flex items-center gap-2.5">
                  <Droplets className="w-4 h-4 text-[#1B5E3C] shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] text-[#526157]">Humidity</p>
                    <p className="font-mono tabular-nums text-sm font-semibold">
                      {weather.current.humidityPct}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Wind className="w-4 h-4 text-[#1B5E3C] shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] text-[#526157]">Wind</p>
                    <p className="font-mono tabular-nums text-sm font-semibold">
                      {weather.current.windSpeedKmh} km/h
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <CloudSun className="w-4 h-4 text-[#1B5E3C] shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] text-[#526157]">Today Rain</p>
                    <p className="font-mono tabular-nums text-sm font-semibold">
                      {weather.daily[0]?.precipitationMm ?? 0} mm
                    </p>
                  </div>
                </div>
              </div>

              {/* Compact 3-Day Field Outlook */}
              <div className="grid grid-cols-3 gap-2.5">
                {weather.daily.slice(0, 3).map((day) => (
                  <div
                    key={day.date}
                    className="rounded-xl bg-[#F6F7F4] border border-[#DCE3D7] px-3 py-2.5"
                  >
                    <p className="text-xs font-semibold text-[#17211A]">{day.dayLabel}</p>
                    <p className="font-mono tabular-nums text-xs font-semibold text-[#14482D] mt-0.5">
                      {day.tempMaxC}° / {day.tempMinC}°
                    </p>
                    <p className="font-mono tabular-nums text-[11px] text-[#526157] mt-0.5 truncate">
                      {day.precipitationMm} mm · {day.windMaxKmh} km/h
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5">
                {activeAlerts.slice(0, 2).map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-xl border px-3.5 py-3 text-sm ${
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
                      <span className="font-mono tabular-nums text-xs shrink-0">{alert.metric}</span>
                    </div>
                    <p className="text-xs mt-1 opacity-90 leading-relaxed">{alert.action}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="Weather data unavailable"
              description="Open the Weather tab to search your town or retry live Open-Meteo data."
              actionLabel="Open Weather"
              onAction={() => setActiveTab('weather')}
            />
          )}
        </section>

        {/* Regional Extension Officer Advisories */}
        <section className="lg:col-span-5 bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-bold text-[#17211A]">
                Regional Advisories
              </h3>
              <p className="text-xs text-[#526157]">Published by agricultural officers</p>
            </div>
            <Megaphone className="w-5 h-5 text-[#6B4E37]" aria-hidden="true" />
          </div>

          {advisories.filter((a) => a.active).length === 0 ? (
            <EmptyState
              title="No regional advisories right now"
              description="When administrators broadcast pest, weather, or mandi alerts, they will appear here automatically."
            />
          ) : (
            <div className="space-y-3 divide-y divide-[#EDF1EA]">
              {advisories
                .filter((a) => a.active)
                .slice(0, 3)
                .map((adv) => (
                  <article key={adv.id} className="pt-3 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#526157]">
                      <span className="font-semibold text-[#6B4E37] capitalize">
                        {adv.category} · {adv.severity}
                      </span>
                      <span className="truncate">{adv.region}</span>
                    </div>
                    <h4 className="text-sm font-bold text-[#17211A]">{adv.title}</h4>
                    <p className="text-xs text-[#526157] leading-relaxed">{adv.message}</p>
                  </article>
                ))}
            </div>
          )}
        </section>
      </div>

      {/* 6 AI & Weather Field Tools Grid */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-lg font-bold text-[#17211A]">Field Modules</h3>
          <span className="text-xs text-[#526157]">Tap any tool to start</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULE_LAUNCHERS.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.tab}
                type="button"
                onClick={() => setActiveTab(mod.tab)}
                className="group bg-white border border-[#DCE3D7] hover:border-[#1B5E3C] rounded-2xl p-5 text-left transition-colors flex flex-col justify-between gap-3 min-h-[124px]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#E7F2EC] text-[#1B5E3C] flex items-center justify-center">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <ArrowRight
                    className="w-4 h-4 text-[#526157] group-hover:text-[#1B5E3C] group-hover:translate-x-0.5 transition-transform"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#17211A]">{mod.title}</h4>
                  <p className="text-xs text-[#526157] mt-1 leading-relaxed">{mod.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Persisted Analysis History */}
      <section className="bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-[#17211A]">
              Saved Analysis History
            </h3>
            <p className="text-xs text-[#526157]">
              Your past crop plans, leaf scans, yield estimates, and 7-day field plans
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#EDF1EA] overflow-x-auto">
            {(['all', 'crop', 'disease', 'yield', 'decision'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setHistoryFilter(tab)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                  historyFilter === tab
                    ? 'bg-white text-[#14482D] shadow-xs'
                    : 'text-[#526157] hover:text-[#17211A]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {dataLoading ? (
          <SkeletonRows count={2} />
        ) : filteredAnalyses.length === 0 ? (
          <EmptyState
            title="No saved analyses in this view"
            description="Run a crop recommendation, leaf disease scan, or yield forecast to save your first report here."
            actionLabel="Open Crop Advisor"
            onAction={() => setActiveTab('crop')}
          />
        ) : (
          <div className="divide-y divide-[#EDF1EA]">
            {filteredAnalyses.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#526157]">
                    <span className="font-semibold uppercase text-[#1B5E3C]">{item.moduleType}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.farmName}</span>
                    <span aria-hidden="true">·</span>
                    <span className={item.source === 'DEMO' ? 'text-[#7A4A0B] font-medium' : 'text-[#14482D] font-medium'}>
                      {item.source === 'LIVE_OLLAMA' ? `Live (${item.model})` : 'DEMO Advisory'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#17211A]">{item.title}</h4>
                  <p className="text-xs text-[#526157] leading-relaxed">{item.summary}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteAnalysis(item.id)}
                  aria-label={`Delete analysis ${item.title}`}
                  className="min-h-[40px] min-w-[40px] px-2.5 rounded-xl border border-[#DCE3D7] text-[#526157] hover:text-red-700 hover:border-red-200 hover:bg-red-50 transition-colors self-start shrink-0 inline-flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
