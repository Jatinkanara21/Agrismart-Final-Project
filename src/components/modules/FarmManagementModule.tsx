import React, { useEffect, useState } from 'react';
import { Check, MapPin, Pencil, Plus, Tractor, Trash2, User } from 'lucide-react';
import { useAgri } from '../../context/AgriContext';
import { apiClient } from '../../lib/apiClient';
import { validateFarmInput } from '../../utils/agronomy';
import { EmptyState, ErrorAlert } from '../SourceNotice';
import type {
  CroppingSeason,
  FarmPlot,
  IrrigationType,
  PreferredLanguage,
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

const LANGUAGES: PreferredLanguage[] = [
  'English',
  'Hindi',
  'Gujarati',
  'Marathi',
  'Punjabi',
  'Tamil',
  'Telugu',
];

const BLANK_FARM = {
  name: '',
  district: 'Anand',
  state: 'Gujarat',
  latitude: '22.5645',
  longitude: '72.9289',
  areaAcres: '2.5',
  soilType: 'Alluvial' as SoilType,
  irrigationType: 'Canal' as IrrigationType,
  season: 'Kharif' as CroppingSeason,
  currentCrop: '',
  nitrogen: '75',
  phosphorus: '38',
  potassium: '48',
  soilPh: '7.0',
};

export function FarmManagementModule() {
  const {
    user,
    farms,
    activeFarm,
    setActiveFarmId,
    updateProfile,
    createFarm,
    updateFarm,
    deleteFarm,
  } = useAgri();

  // Profile State
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [stateName, setStateName] = useState(user?.state || 'Gujarat');
  const [district, setDistrict] = useState(user?.district || 'Anand');
  const [village, setVillage] = useState(user?.village || '');
  const [language, setLanguage] = useState<PreferredLanguage>(
    user?.preferredLanguage || 'English'
  );
  const [experience, setExperience] = useState(String(user?.farmingExperienceYears ?? 10));
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Farm CRUD State
  const [editingFarmId, setEditingFarmId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [farmForm, setFarmForm] = useState(BLANK_FARM);
  const [farmErrors, setFarmErrors] = useState<Record<string, string>>({});
  const [farmSaving, setFarmSaving] = useState(false);
  const [farmApiError, setFarmApiError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setPhone(user.phone || '');
    setStateName(user.state);
    setDistrict(user.district);
    setVillage(user.village || '');
    setLanguage(user.preferredLanguage || 'English');
    setExperience(String(user.farmingExperienceYears ?? 0));
  }, [user?.uid]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSaved(false);
    if (displayName.trim().length < 2) {
      setProfileError('Please enter your full name.');
      return;
    }
    setProfileSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        phone: phone.trim(),
        state: stateName.trim() || 'Gujarat',
        district: district.trim() || 'Anand',
        village: village.trim(),
        preferredLanguage: language,
        farmingExperienceYears: Number(experience) || 0,
      });
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const openNewFarmForm = () => {
    setEditingFarmId(null);
    setFarmForm({
      ...BLANK_FARM,
      district: user?.district || 'Anand',
      state: user?.state || 'Gujarat',
    });
    setFarmErrors({});
    setFarmApiError(null);
    setFormOpen(true);
  };

  const openEditFarmForm = (farm: FarmPlot) => {
    setEditingFarmId(farm.id);
    setFarmForm({
      name: farm.name,
      district: farm.district,
      state: farm.state,
      latitude: String(farm.latitude),
      longitude: String(farm.longitude),
      areaAcres: String(farm.areaAcres),
      soilType: farm.soilType,
      irrigationType: farm.irrigationType,
      season: farm.season,
      currentCrop: farm.currentCrop || '',
      nitrogen: String(farm.nitrogen),
      phosphorus: String(farm.phosphorus),
      potassium: String(farm.potassium),
      soilPh: String(farm.soilPh),
    });
    setFarmErrors({});
    setFarmApiError(null);
    setFormOpen(true);
  };

  const lookupDistrictCoordinates = async () => {
    const q = `${farmForm.district} ${farmForm.state}`.trim();
    if (q.length < 2) return;
    setLocating(true);
    try {
      const res = await apiClient.geocode(q);
      if (res.results[0]) {
        setFarmForm((prev) => ({
          ...prev,
          latitude: String(res.results[0].latitude),
          longitude: String(res.results[0].longitude),
        }));
      }
    } finally {
      setLocating(false);
    }
  };

  const handleSaveFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFarmApiError(null);

    const payload = {
      name: farmForm.name.trim(),
      district: farmForm.district.trim(),
      state: farmForm.state.trim(),
      latitude: Number(farmForm.latitude),
      longitude: Number(farmForm.longitude),
      areaAcres: Number(farmForm.areaAcres),
      soilType: farmForm.soilType,
      irrigationType: farmForm.irrigationType,
      season: farmForm.season,
      currentCrop: farmForm.currentCrop.trim(),
      nitrogen: Number(farmForm.nitrogen),
      phosphorus: Number(farmForm.phosphorus),
      potassium: Number(farmForm.potassium),
      soilPh: Number(farmForm.soilPh),
    };

    const check = validateFarmInput(payload);
    if (!check.valid) {
      setFarmErrors(check.errors);
      return;
    }
    setFarmErrors({});
    setFarmSaving(true);

    try {
      if (editingFarmId) {
        await updateFarm(editingFarmId, payload);
      } else {
        await createFarm(payload);
      }
      setFormOpen(false);
      setEditingFarmId(null);
    } catch (err) {
      setFarmApiError(err instanceof Error ? err.message : 'Unable to save farm plot.');
    } finally {
      setFarmSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#17211A]">
            Farmer Profile &amp; Farm Plots
          </h2>
          <p className="text-sm text-[#526157] mt-1">
            Keep your contact profile and each farm plot&apos;s acreage, soil NPK, and irrigation
            up to date for accurate recommendations.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewFarmForm}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1B5E3C] text-white text-sm font-semibold hover:bg-[#14482D] inline-flex items-center gap-2 self-start sm:self-auto whitespace-nowrap"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add Farm Plot
        </button>
      </div>

      {/* Add / Edit Farm Plot Drawer Card */}
      {formOpen && (
        <form
          onSubmit={handleSaveFarm}
          noValidate
          className="bg-white border-2 border-[#1B5E3C] rounded-3xl p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-[#17211A]">
              {editingFarmId ? 'Edit Farm Plot' : 'Register New Farm Plot'}
            </h3>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="min-h-[36px] px-3 rounded-lg text-xs font-semibold text-[#526157] hover:bg-[#F6F7F4]"
            >
              Cancel
            </button>
          </div>

          {farmApiError && <ErrorAlert message={farmApiError} />}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="farm-name" className="block text-xs font-semibold text-[#17211A] mb-1">
                Plot Name
              </label>
              <input
                id="farm-name"
                type="text"
                value={farmForm.name}
                onChange={(e) => setFarmForm({ ...farmForm, name: e.target.value })}
                placeholder="e.g. South Canal Plot"
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {farmErrors.name && <p className="text-xs text-red-700 mt-1">{farmErrors.name}</p>}
            </div>

            <div>
              <label htmlFor="farm-district" className="block text-xs font-semibold text-[#17211A] mb-1">
                District / Taluka
              </label>
              <input
                id="farm-district"
                type="text"
                value={farmForm.district}
                onChange={(e) => setFarmForm({ ...farmForm, district: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {farmErrors.district && <p className="text-xs text-red-700 mt-1">{farmErrors.district}</p>}
            </div>

            <div>
              <label htmlFor="farm-state" className="block text-xs font-semibold text-[#17211A] mb-1">
                State
              </label>
              <input
                id="farm-state"
                type="text"
                value={farmForm.state}
                onChange={(e) => setFarmForm({ ...farmForm, state: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {farmErrors.state && <p className="text-xs text-red-700 mt-1">{farmErrors.state}</p>}
            </div>

            <div>
              <label htmlFor="farm-acres" className="block text-xs font-semibold text-[#17211A] mb-1">
                Area (acres)
              </label>
              <input
                id="farm-acres"
                type="number"
                step="0.1"
                value={farmForm.areaAcres}
                onChange={(e) => setFarmForm({ ...farmForm, areaAcres: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] font-mono tabular-nums text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {farmErrors.areaAcres && <p className="text-xs text-red-700 mt-1">{farmErrors.areaAcres}</p>}
            </div>

            <div>
              <label htmlFor="farm-soil" className="block text-xs font-semibold text-[#17211A] mb-1">
                Soil Type
              </label>
              <select
                id="farm-soil"
                value={farmForm.soilType}
                onChange={(e) => setFarmForm({ ...farmForm, soilType: e.target.value as SoilType })}
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
              <label htmlFor="farm-irrigation" className="block text-xs font-semibold text-[#17211A] mb-1">
                Irrigation
              </label>
              <select
                id="farm-irrigation"
                value={farmForm.irrigationType}
                onChange={(e) =>
                  setFarmForm({ ...farmForm, irrigationType: e.target.value as IrrigationType })
                }
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] text-sm focus:outline-none focus:border-[#1B5E3C]"
              >
                {IRRIGATION_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="farm-season" className="block text-xs font-semibold text-[#17211A] mb-1">
                Active Season
              </label>
              <select
                id="farm-season"
                value={farmForm.season}
                onChange={(e) =>
                  setFarmForm({ ...farmForm, season: e.target.value as CroppingSeason })
                }
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] text-sm focus:outline-none focus:border-[#1B5E3C]"
              >
                <option value="Kharif">Kharif</option>
                <option value="Rabi">Rabi</option>
                <option value="Zaid">Zaid</option>
              </select>
            </div>

            <div>
              <label htmlFor="farm-crop" className="block text-xs font-semibold text-[#17211A] mb-1">
                Current Crop (optional)
              </label>
              <input
                id="farm-crop"
                type="text"
                value={farmForm.currentCrop}
                onChange={(e) => setFarmForm({ ...farmForm, currentCrop: e.target.value })}
                placeholder="e.g. Bt Cotton, Wheat"
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
            </div>

            <div>
              <label htmlFor="farm-ph" className="block text-xs font-semibold text-[#17211A] mb-1">
                Soil pH
              </label>
              <input
                id="farm-ph"
                type="number"
                step="0.1"
                value={farmForm.soilPh}
                onChange={(e) => setFarmForm({ ...farmForm, soilPh: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] font-mono tabular-nums text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
              {farmErrors.soilPh && <p className="text-xs text-red-700 mt-1">{farmErrors.soilPh}</p>}
            </div>

            <div>
              <label htmlFor="farm-n" className="block text-xs font-semibold text-[#17211A] mb-1">
                Nitrogen (kg/ha)
              </label>
              <input
                id="farm-n"
                type="number"
                value={farmForm.nitrogen}
                onChange={(e) => setFarmForm({ ...farmForm, nitrogen: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] font-mono tabular-nums text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
            </div>

            <div>
              <label htmlFor="farm-p" className="block text-xs font-semibold text-[#17211A] mb-1">
                Phosphorus (kg/ha)
              </label>
              <input
                id="farm-p"
                type="number"
                value={farmForm.phosphorus}
                onChange={(e) => setFarmForm({ ...farmForm, phosphorus: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] font-mono tabular-nums text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
            </div>

            <div>
              <label htmlFor="farm-k" className="block text-xs font-semibold text-[#17211A] mb-1">
                Potassium (kg/ha)
              </label>
              <input
                id="farm-k"
                type="number"
                value={farmForm.potassium}
                onChange={(e) => setFarmForm({ ...farmForm, potassium: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] font-mono tabular-nums text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 pt-2 border-t border-[#EDF1EA]">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label htmlFor="farm-lat" className="block text-[11px] font-semibold text-[#526157]">
                  Latitude
                </label>
                <input
                  id="farm-lat"
                  type="number"
                  step="0.0001"
                  value={farmForm.latitude}
                  onChange={(e) => setFarmForm({ ...farmForm, latitude: e.target.value })}
                  className="w-28 min-h-[38px] px-2.5 rounded-lg border border-[#DCE3D7] font-mono tabular-nums text-xs"
                />
              </div>
              <div>
                <label htmlFor="farm-lon" className="block text-[11px] font-semibold text-[#526157]">
                  Longitude
                </label>
                <input
                  id="farm-lon"
                  type="number"
                  step="0.0001"
                  value={farmForm.longitude}
                  onChange={(e) => setFarmForm({ ...farmForm, longitude: e.target.value })}
                  className="w-28 min-h-[38px] px-2.5 rounded-lg border border-[#DCE3D7] font-mono tabular-nums text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => void lookupDistrictCoordinates()}
                disabled={locating}
                className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#DCE3D7] bg-[#F6F7F4] text-xs font-semibold text-[#14482D] hover:border-[#1B5E3C] inline-flex items-center gap-1.5 mt-4"
              >
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                {locating ? 'Looking up...' : 'Auto-fill GPS from District'}
              </button>
            </div>

            <button
              type="submit"
              disabled={farmSaving}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#1B5E3C] text-white text-sm font-semibold hover:bg-[#14482D] transition-colors disabled:opacity-60"
            >
              {farmSaving ? 'Saving plot...' : editingFarmId ? 'Update Plot' : 'Save Farm Plot'}
            </button>
          </div>
        </form>
      )}

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Registered Farm Plots List */}
        <section className="lg:col-span-7 space-y-3">
          <h3 className="font-display text-lg font-bold text-[#17211A]">
            Your Registered Plots ({farms.length})
          </h3>

          {farms.length === 0 ? (
            <EmptyState
              title="No farm plots registered yet"
              description="Add your first farm plot with acreage and soil NPK values to unlock personalized crop advice and local weather."
              actionLabel="Add First Farm Plot"
              onAction={openNewFarmForm}
            />
          ) : (
            <div className="space-y-3">
              {farms.map((farm) => {
                const isSelected = activeFarm?.id === farm.id;
                return (
                  <article
                    key={farm.id}
                    className={`bg-white rounded-2xl border p-5 space-y-3 transition-colors ${
                      isSelected ? 'border-[#1B5E3C]' : 'border-[#DCE3D7]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-[#526157]">
                          <Tractor className="w-3.5 h-3.5 text-[#1B5E3C]" aria-hidden="true" />
                          <span>
                            {farm.district}, {farm.state}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{farm.season}</span>
                          {isSelected && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-[#15803D]">Active Plot</span>
                            </>
                          )}
                        </div>
                        <h4 className="font-display text-lg font-bold text-[#17211A] mt-0.5">
                          {farm.name}
                        </h4>
                      </div>
                      <p className="font-mono tabular-nums text-base font-semibold text-[#1B5E3C] shrink-0">
                        {farm.areaAcres} ac
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2.5 border-y border-[#EDF1EA] text-xs">
                      <div>
                        <span className="text-[#526157]">Soil</span>
                        <p className="font-semibold text-[#17211A]">{farm.soilType}</p>
                      </div>
                      <div>
                        <span className="text-[#526157]">Irrigation</span>
                        <p className="font-semibold text-[#17211A]">{farm.irrigationType}</p>
                      </div>
                      <div>
                        <span className="text-[#526157]">NPK (kg/ha)</span>
                        <p className="font-mono tabular-nums font-semibold text-[#17211A]">
                          {farm.nitrogen}-{farm.phosphorus}-{farm.potassium}
                        </p>
                      </div>
                      <div>
                        <span className="text-[#526157]">pH / Crop</span>
                        <p className="font-mono tabular-nums font-semibold text-[#17211A] truncate">
                          {farm.soilPh} · {farm.currentCrop || 'Open'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {!isSelected ? (
                        <button
                          type="button"
                          onClick={() => setActiveFarmId(farm.id)}
                          className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#E7F2EC] text-[#14482D] text-xs font-semibold hover:bg-[#D8EBDF] transition-colors"
                        >
                          Set as Active Plot
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-[#15803D]">
                          Used across Weather, Crop &amp; Decision tools
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditFarmForm(farm)}
                          aria-label={`Edit ${farm.name}`}
                          className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[#DCE3D7] text-xs font-semibold text-[#17211A] hover:border-[#1B5E3C] inline-flex items-center gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                          Edit
                        </button>
                        {farms.length > 1 && (
                          <button
                            type="button"
                            onClick={() => void deleteFarm(farm.id)}
                            aria-label={`Delete ${farm.name}`}
                            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[#DCE3D7] text-xs font-semibold text-[#526157] hover:text-red-700 hover:border-red-200 inline-flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Farmer Profile Form */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-5 bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E7F2EC] text-[#1B5E3C] flex items-center justify-center">
              <User className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-[#17211A]">Farmer Profile</h3>
              <p className="text-xs text-[#526157]">{user?.email}</p>
            </div>
          </div>

          {profileError && <ErrorAlert message={profileError} />}

          <div>
            <label htmlFor="prof-name" className="block text-xs font-semibold text-[#17211A] mb-1">
              Full Name
            </label>
            <input
              id="prof-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] text-sm focus:outline-none focus:border-[#1B5E3C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="prof-phone" className="block text-xs font-semibold text-[#17211A] mb-1">
                Phone Number
              </label>
              <input
                id="prof-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98..."
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
            </div>
            <div>
              <label htmlFor="prof-exp" className="block text-xs font-semibold text-[#17211A] mb-1">
                Experience (years)
              </label>
              <input
                id="prof-exp"
                type="number"
                min={0}
                max={80}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] font-mono tabular-nums text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="prof-district" className="block text-xs font-semibold text-[#17211A] mb-1">
                District
              </label>
              <input
                id="prof-district"
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
            </div>
            <div>
              <label htmlFor="prof-state" className="block text-xs font-semibold text-[#17211A] mb-1">
                State
              </label>
              <input
                id="prof-state"
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="prof-village" className="block text-xs font-semibold text-[#17211A] mb-1">
                Village / Town
              </label>
              <input
                id="prof-village"
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] text-sm focus:outline-none focus:border-[#1B5E3C]"
              />
            </div>
            <div>
              <label htmlFor="prof-lang" className="block text-xs font-semibold text-[#17211A] mb-1">
                Preferred Language
              </label>
              <select
                id="prof-lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value as PreferredLanguage)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] text-sm focus:outline-none focus:border-[#1B5E3C]"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            {profileSaved ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803D]">
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Profile saved
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={profileSaving}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1B5E3C] text-white text-sm font-semibold hover:bg-[#14482D] transition-colors disabled:opacity-60"
            >
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
