import React, { useState } from 'react';
import {
  CheckCircle2,
  Database,
  Megaphone,
  Search,
  Server,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { useAgri } from '../context/AgriContext';
import { firebaseMeta } from '../lib/firebase';
import { validateAdvisoryInput } from '../utils/agronomy';
import { EmptyState, ErrorAlert } from './SourceNotice';
import type { AdvisoryCategory, AdvisorySeverity } from '../types/agrismart';

export function AdminDashboard() {
  const {
    isAdmin,
    activeTab,
    allUsers,
    allFarms,
    allAnalyses,
    advisories,
    systemStatus,
    createAdvisory,
    toggleAdvisory,
    deleteAdvisory,
  } = useAgri();

  // Advisory Form
  const [title, setTitle] = useState('');
  const [region, setRegion] = useState('Anand & Central Gujarat');
  const [category, setCategory] = useState<AdvisoryCategory>('weather');
  const [severity, setSeverity] = useState<AdvisorySeverity>('warning');
  const [message, setMessage] = useState('');
  const [advErrors, setAdvErrors] = useState<Record<string, string>>({});
  const [advSaving, setAdvSaving] = useState(false);
  const [advApiError, setAdvApiError] = useState<string | null>(null);
  const [advSuccess, setAdvSuccess] = useState(false);

  // Farmer directory search
  const [searchTerm, setSearchTerm] = useState('');

  if (!isAdmin) {
    return (
      <EmptyState
        title="Administrator access required"
        description="This workspace is reserved exclusively for the authorized AgriSmart administrator account."
      />
    );
  }

  const totalAcres = allFarms.reduce((acc, f) => acc + Number(f.areaAcres || 0), 0);
  const activeAdvisoriesCount = advisories.filter((a) => a.active).length;

  const handlePublishAdvisory = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdvApiError(null);
    setAdvSuccess(false);

    const check = validateAdvisoryInput({ title, region, category, severity, message });
    if (!check.valid) {
      setAdvErrors(check.errors);
      return;
    }
    setAdvErrors({});
    setAdvSaving(true);

    try {
      await createAdvisory({
        title: title.trim(),
        region: region.trim(),
        category,
        severity,
        message: message.trim(),
        active: true,
      });
      setTitle('');
      setMessage('');
      setAdvSuccess(true);
    } catch (err) {
      setAdvApiError(err instanceof Error ? err.message : 'Unable to publish regional advisory.');
    } finally {
      setAdvSaving(false);
    }
  };

  // --- View 1: Admin Overview ---
  if (activeTab === 'admin-overview') {
    return (
      <div className="space-y-6">
        <section className="bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-7 space-y-5">
          <div>
            <p className="text-xs font-medium text-[#6B4E37]">
              Administrator Console · Firebase Cloud
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17211A] mt-0.5">
              Regional Operations Overview
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#DCE3D7]">
            <div>
              <p className="text-xs text-[#526157]">Registered Accounts</p>
              <p className="font-mono tabular-nums text-2xl font-semibold text-[#17211A] mt-0.5">
                {allUsers.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#526157]">Farm Plots / Acres</p>
              <p className="font-mono tabular-nums text-2xl font-semibold text-[#1B5E3C] mt-0.5">
                {allFarms.length} · {totalAcres.toFixed(1)} ac
              </p>
            </div>
            <div>
              <p className="text-xs text-[#526157]">Saved AI Analyses</p>
              <p className="font-mono tabular-nums text-2xl font-semibold text-[#17211A] mt-0.5">
                {allAnalyses.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#526157]">Active Advisories</p>
              <p className="font-mono tabular-nums text-2xl font-semibold text-[#6B4E37] mt-0.5">
                {activeAdvisoriesCount}
              </p>
            </div>
          </div>
        </section>

        {/* Backend Service Readiness Matrix */}
        <section className="bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-[#1B5E3C]" aria-hidden="true" />
            <h3 className="font-display text-lg font-bold text-[#17211A]">
              Live Service Configuration Status
            </h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="rounded-2xl border border-[#DCE3D7] bg-[#F6F7F4] p-4 space-y-1">
              <p className="text-xs text-[#526157]">Ollama Cloud AI Backend</p>
              <p className="font-semibold text-[#17211A]">
                {systemStatus?.ollamaConfigured
                  ? `Connected (${systemStatus.ollamaHost})`
                  : 'DEMO Advisory Mode (Key unset)'}
              </p>
              <p className="font-mono text-xs text-[#526157]">
                Text: {systemStatus?.textModel || 'qwen2.5'} · Vision:{' '}
                {systemStatus?.visionModel || 'llama3.2-vision'}
              </p>
            </div>
            <div className="rounded-2xl border border-[#DCE3D7] bg-[#F6F7F4] p-4 space-y-1">
              <p className="text-xs text-[#526157]">Weather Provider</p>
              <p className="font-semibold text-[#14482D]">Open-Meteo Live API</p>
              <p className="text-xs text-[#526157]">Keyless real-time 7-day forecasts + DEMO fallback</p>
            </div>
            <div className="rounded-2xl border border-[#DCE3D7] bg-[#F6F7F4] p-4 space-y-1">
              <p className="text-xs text-[#526157]">Database &amp; Auth</p>
              <p className="font-semibold text-[#17211A]">
                {systemStatus?.firebaseConfigPresent ? 'Firebase Provisioned' : 'Local Adapter'}
              </p>
              <p className="font-mono text-xs text-[#526157] truncate">
                Project: {firebaseMeta.projectId || 'Local DEMO'}
              </p>
            </div>
          </div>
        </section>

        {/* Recent Platform Analyses */}
        <section className="bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-3">
          <h3 className="font-display text-lg font-bold text-[#17211A]">
            Recent Farmer Analyses &amp; Disease Scans
          </h3>
          {allAnalyses.length === 0 ? (
            <EmptyState
              title="No analyses recorded yet"
              description="Farmer crop recommendations, leaf disease detections, and yield forecasts will show up here for officer review."
            />
          ) : (
            <div className="divide-y divide-[#EDF1EA]">
              {allAnalyses.slice(0, 8).map((item) => (
                <div key={item.id} className="py-3.5 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#526157]">
                    <span className="font-semibold uppercase text-[#1B5E3C]">{item.moduleType}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.farmName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-[#6B4E37]">Severity: {item.severity}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.source === 'LIVE_OLLAMA' ? `Live (${item.model})` : 'DEMO'}</span>
                  </div>
                  <p className="text-sm font-bold text-[#17211A]">{item.title}</p>
                  <p className="text-xs text-[#526157]">{item.summary}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // --- View 2: Farmers & Plots Directory ---
  if (activeTab === 'admin-farmers') {
    const q = searchTerm.trim().toLowerCase();
    const filteredFarms = q
      ? allFarms.filter(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            f.district.toLowerCase().includes(q) ||
            f.state.toLowerCase().includes(q) ||
            (f.currentCrop || '').toLowerCase().includes(q)
        )
      : allFarms;

    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#17211A]">
              Farmers &amp; Registered Farm Plots
            </h2>
            <p className="text-sm text-[#526157]">
              Inspect registered farmer accounts, acreage, soil profiles, and active seasons.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search
              className="w-4 h-4 text-[#526157] absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <label htmlFor="admin-farm-search" className="sr-only">
              Filter farm plots
            </label>
            <input
              id="admin-farm-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by plot, district, or crop..."
              className="w-full min-h-[44px] pl-10 pr-3 rounded-xl border border-[#DCE3D7] bg-white text-sm focus:outline-none focus:border-[#1B5E3C]"
            />
          </div>
        </div>

        <section className="bg-white border border-[#DCE3D7] rounded-3xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#DCE3D7] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1B5E3C]" aria-hidden="true" />
            <h3 className="font-display text-base font-bold text-[#17211A]">
              Farm Plots ({filteredFarms.length})
            </h3>
          </div>
          {filteredFarms.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No matching farm plots"
                description="Try clearing your search filter to see all registered plots."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F6F7F4] border-b border-[#DCE3D7] text-xs text-[#526157]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Plot Name</th>
                    <th className="py-3 px-4 font-semibold">Location</th>
                    <th className="py-3 px-4 font-semibold text-right">Acres</th>
                    <th className="py-3 px-4 font-semibold">Soil &amp; Irrigation</th>
                    <th className="py-3 px-4 font-semibold">Season / Crop</th>
                    <th className="py-3 px-4 font-semibold text-right">NPK · pH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF1EA]">
                  {filteredFarms.map((farm) => (
                    <tr key={farm.id} className="hover:bg-[#F6F7F4]/60">
                      <td className="py-3 px-4 font-semibold text-[#17211A]">{farm.name}</td>
                      <td className="py-3 px-4 text-[#526157]">
                        {farm.district}, {farm.state}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right">
                        {farm.areaAcres}
                      </td>
                      <td className="py-3 px-4 text-[#526157]">
                        {farm.soilType} · {farm.irrigationType}
                      </td>
                      <td className="py-3 px-4 text-[#17211A]">
                        {farm.season} · {farm.currentCrop || 'Open'}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-xs">
                        {farm.nitrogen}-{farm.phosphorus}-{farm.potassium} · {farm.soilPh}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  }

  // --- View 3: Regional Advisories Broadcast ---
  if (activeTab === 'admin-advisories') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#17211A]">
            Regional Farmer Advisories
          </h2>
          <p className="text-sm text-[#526157] mt-1">
            Publish weather warnings, pest alerts, or soil advisories that appear directly on
            farmers&apos; Field Home dashboards.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handlePublishAdvisory}
            noValidate
            className="lg:col-span-5 bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-4"
          >
            <h3 className="font-display text-lg font-bold text-[#17211A] flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#1B5E3C]" aria-hidden="true" />
              Broadcast New Advisory
            </h3>

            {advApiError && <ErrorAlert message={advApiError} />}
            {advSuccess && (
              <div className="rounded-xl border border-[#BDDAC9] bg-[#E7F2EC] px-3.5 py-2.5 text-xs font-semibold text-[#14482D] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                Advisory published and visible to farmers.
              </div>
            )}

            <div>
              <label htmlFor="adv-title" className="block text-xs font-semibold text-[#17211A] mb-1">
                Advisory Headline
              </label>
              <input
                id="adv-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Heavy Monsoon Drainage Advisory"
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {advErrors.title && <p className="text-xs text-red-700 mt-1">{advErrors.title}</p>}
            </div>

            <div>
              <label htmlFor="adv-region" className="block text-xs font-semibold text-[#17211A] mb-1">
                Target District / Region
              </label>
              <input
                id="adv-region"
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {advErrors.region && <p className="text-xs text-red-700 mt-1">{advErrors.region}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="adv-category" className="block text-xs font-semibold text-[#17211A] mb-1">
                  Category
                </label>
                <select
                  id="adv-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AdvisoryCategory)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] text-sm"
                >
                  <option value="weather">Weather</option>
                  <option value="pest">Pest &amp; Disease</option>
                  <option value="soil">Soil &amp; Fertilizer</option>
                  <option value="market">Market / Mandi</option>
                </select>
              </div>
              <div>
                <label htmlFor="adv-severity" className="block text-xs font-semibold text-[#17211A] mb-1">
                  Severity
                </label>
                <select
                  id="adv-severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as AdvisorySeverity)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] text-sm"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="adv-message" className="block text-xs font-semibold text-[#17211A] mb-1">
                Plain-Language Action Steps
              </label>
              <textarea
                id="adv-message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write clear steps farmers can take today..."
                className="w-full px-3 py-2.5 rounded-xl border border-[#DCE3D7] text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {advErrors.message && <p className="text-xs text-red-700 mt-1">{advErrors.message}</p>}
            </div>

            <button
              type="submit"
              disabled={advSaving}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#1B5E3C] text-white text-sm font-semibold hover:bg-[#14482D] transition-colors disabled:opacity-60"
            >
              {advSaving ? 'Publishing...' : 'Publish Advisory'}
            </button>
          </form>

          <section className="lg:col-span-7 bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-[#17211A]">
              Published Advisories ({advisories.length})
            </h3>
            {advisories.length === 0 ? (
              <EmptyState
                title="No advisories published"
                description="Use the form on the left to publish your first regional farming alert."
              />
            ) : (
              <div className="divide-y divide-[#EDF1EA]">
                {advisories.map((adv) => (
                  <article key={adv.id} className="py-4 first:pt-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-[#526157]">
                        <span className="font-semibold capitalize text-[#6B4E37]">
                          {adv.category} · {adv.severity}
                        </span>{' '}
                        · {adv.region} ·{' '}
                        <span className={adv.active ? 'text-[#15803D] font-semibold' : 'text-[#526157]'}>
                          {adv.active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void toggleAdvisory(adv.id, !adv.active)}
                          className="min-h-[36px] px-3 py-1 rounded-lg border border-[#DCE3D7] text-xs font-semibold text-[#17211A] hover:border-[#1B5E3C]"
                        >
                          {adv.active ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteAdvisory(adv.id)}
                          aria-label={`Delete advisory ${adv.title}`}
                          className="min-h-[36px] px-2.5 py-1 rounded-lg border border-[#DCE3D7] text-[#526157] hover:text-red-700 hover:border-red-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-[#17211A]">{adv.title}</h4>
                    <p className="text-xs text-[#526157] leading-relaxed">{adv.message}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // --- View 4: Database Schema, Environment Variables & Deployment Guide ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#17211A]">
            Database Schema, Security &amp; Deployment Guide
          </h2>
          <p className="text-sm text-[#526157] mt-1">
            Complete reference for Firestore collections, Ollama Cloud server secrets, and
            production deployment.
          </p>
        </div>
      </div>

      {/* Firestore Collections Schema */}
      <section className="bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-[#1B5E3C]" aria-hidden="true" />
          <h3 className="font-display text-lg font-bold text-[#17211A]">
            Firestore Collections (`firebase-blueprint.json`)
          </h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {[
            {
              col: '/users/{userId}',
              desc: 'Farmer & admin profile (PII isolated to owner or admin). Fields: uid, displayName, email, role, phone, state, district, village, preferredLanguage, farmingExperienceYears.',
            },
            {
              col: '/admins/{adminId}',
              desc: 'Trusted admin registry verified by security rules alongside bootstrapped admin email.',
            },
            {
              col: '/farms/{farmId}',
              desc: 'Farmer land plots: ownerId, name, district, state, latitude, longitude, areaAcres, soilType, irrigationType, season, currentCrop, nitrogen, phosphorus, potassium, soilPh.',
            },
            {
              col: '/analyses/{analysisId}',
              desc: 'Saved AI reports linked to verified owner farmId: moduleType (crop/disease/yield/decision), source (LIVE_OLLAMA/DEMO), model, title, summary, severity, highlights.',
            },
            {
              col: '/chatMessages/{messageId}',
              desc: 'Persistent AgriBot Q&A turns: ownerId, farmId, sender (user/assistant), content, source, createdAt.',
            },
            {
              col: '/advisories/{advisoryId}',
              desc: 'Admin-published regional alerts readable by authenticated farmers when active == true.',
            },
          ].map((item) => (
            <div key={item.col} className="rounded-2xl border border-[#DCE3D7] bg-[#F6F7F4] p-4 space-y-1.5">
              <p className="font-mono font-semibold text-[#14482D]">{item.col}</p>
              <p className="text-[#526157] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Environment Variables & Deployment Steps */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#1B5E3C]" aria-hidden="true" />
            <h3 className="font-display text-lg font-bold text-[#17211A]">
              Server Environment Variables
            </h3>
          </div>
          <p className="text-xs text-[#526157] leading-relaxed">
            Configure these exclusively on the server (never prefix private keys with{' '}
            <code className="font-mono text-[#17211A]">VITE_</code>):
          </p>
          <pre className="rounded-2xl bg-[#17211A] text-[#E7F2EC] p-4 text-xs font-mono overflow-x-auto leading-relaxed">
{`OLLAMA_BASE_URL="https://ollama.com"
OLLAMA_API_KEY="your-ollama-cloud-api-key"
OLLAMA_TEXT_MODEL="qwen2.5"
OLLAMA_VISION_MODEL="llama3.2-vision"
OLLAMA_TIMEOUT_MS="28000"
PORT="3000"`}
          </pre>
        </section>

        <section className="bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-3">
          <h3 className="font-display text-lg font-bold text-[#17211A]">
            Local Setup &amp; Production Deployment
          </h3>
          <ol className="space-y-2 text-xs text-[#17211A] leading-relaxed list-decimal pl-4">
            <li>
              Copy <code className="font-mono">.env.example</code> to{' '}
              <code className="font-mono">.env</code> and set{' '}
              <code className="font-mono">OLLAMA_API_KEY</code> to switch all 5 AI modules from
              DEMO Advisory Mode to live Ollama Cloud inference.
            </li>
            <li>
              Install dependencies with <code className="font-mono">npm install</code> and start
              locally on port 3000 via <code className="font-mono">npm run dev</code>.
            </li>
            <li>
              Verify unit tests and Firestore rules with{' '}
              <code className="font-mono">npx tsx --test src/utils/agronomy.test.ts firestore.rules.test.ts</code>{' '}
              and <code className="font-mono">npx eslint firestore.rules</code>.
            </li>
            <li>
              Build for production with <code className="font-mono">npm run build</code> and start
              with <code className="font-mono">NODE_ENV=production npm start</code>.
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}
