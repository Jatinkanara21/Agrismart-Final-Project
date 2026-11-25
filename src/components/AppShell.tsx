import React, { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CloudSun,
  Compass,
  Grid,
  Home,
  Leaf,
  LogOut,
  MapPin,
  Megaphone,
  MessageSquare,
  Shield,
  Sprout,
  Tractor,
  Users,
  X,
} from 'lucide-react';
import { useAgri } from '../context/AgriContext';
import type { AdminNavTab, AppNavTab, FarmerNavTab } from '../types/agrismart';

interface NavItem {
  id: AppNavTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FARMER_NAV: NavItem[] = [
  { id: 'overview', label: 'Field Home', shortLabel: 'Home', icon: Home },
  { id: 'crop', label: 'Crop Advisor', shortLabel: 'Crops', icon: Sprout },
  { id: 'disease', label: 'Disease Scan', shortLabel: 'Scan', icon: Leaf },
  { id: 'yield', label: 'Yield Forecast', shortLabel: 'Yield', icon: BarChart3 },
  { id: 'weather', label: 'Weather & Alerts', shortLabel: 'Weather', icon: CloudSun },
  { id: 'agribot', label: 'AgriBot Chat', shortLabel: 'AgriBot', icon: MessageSquare },
  { id: 'decision', label: 'Decision Engine', shortLabel: 'Plan', icon: Compass },
  { id: 'farms', label: 'Profile & Farms', shortLabel: 'Farms', icon: Tractor },
];

const ADMIN_NAV: NavItem[] = [
  { id: 'admin-overview', label: 'Admin Console', shortLabel: 'Console', icon: Shield },
  { id: 'admin-farmers', label: 'Farmers & Plots', shortLabel: 'Farmers', icon: Users },
  { id: 'admin-advisories', label: 'Regional Alerts', shortLabel: 'Alerts', icon: Megaphone },
  { id: 'admin-setup', label: 'Schema & Setup', shortLabel: 'Setup', icon: BookOpen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    user,
    isAdmin,
    activeTab,
    setActiveTab,
    farms,
    activeFarm,
    setActiveFarmId,
    logout,
  } = useAgri();

  const [moreOpen, setMoreOpen] = useState(false);

  if (!user) return null;

  const isAdminView = isAdmin && activeTab.startsWith('admin-');

  const navTitle =
    [...FARMER_NAV, ...ADMIN_NAV].find((item) => item.id === activeTab)?.label || 'AgriSmart';

  const handleNavigate = (tab: AppNavTab) => {
    setActiveTab(tab);
    setMoreOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Mobile bottom bar stays compact (60px) with 4 direct thumb-zone taps + More drawer
  const mobilePrimaryTabs: NavItem[] = isAdminView
    ? ADMIN_NAV
    : [FARMER_NAV[0], FARMER_NAV[1], FARMER_NAV[4], FARMER_NAV[5]];

  return (
    <div className="min-h-screen bg-[#F6F7F4] text-[#17211A] flex flex-col lg:flex-row">
      {/* Desktop Persistent Sidebar (260px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:fixed lg:inset-y-0 bg-white border-r border-[#DCE3D7] z-30">
        <div className="h-16 px-5 border-b border-[#DCE3D7] flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleNavigate(isAdmin ? 'admin-overview' : 'overview')}
            className="font-display text-xl font-bold tracking-tight text-[#14482D] whitespace-nowrap"
          >
            AgriSmart
          </button>
          <span className="text-[11px] font-mono text-[#526157]">Cloud</span>
        </div>

        {/* Workspace Switcher visible exclusively to verified Admin (jatinkanara2006@gmail.com) */}
        {isAdmin && (
          <div className="px-4 pt-4">
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#EDF1EA]">
              <button
                type="button"
                onClick={() => handleNavigate('overview')}
                className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  !isAdminView
                    ? 'bg-white text-[#14482D] shadow-xs'
                    : 'text-[#526157] hover:text-[#17211A]'
                }`}
              >
                Farmer View
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('admin-overview')}
                className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  isAdminView
                    ? 'bg-white text-[#14482D] shadow-xs'
                    : 'text-[#526157] hover:text-[#17211A]'
                }`}
              >
                Admin View
              </button>
            </div>
          </div>
        )}

        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {(isAdminView ? ADMIN_NAV : FARMER_NAV).map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors text-left ${
                  active
                    ? 'bg-[#E7F2EC] text-[#14482D] font-semibold'
                    : 'text-[#526157] hover:bg-[#F6F7F4] hover:text-[#17211A]'
                }`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-[#DCE3D7] space-y-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#17211A] truncate">{user.displayName}</p>
            <p className="text-xs text-[#526157] truncate">
              {user.role === 'admin' ? 'Administrator' : 'Farmer'} · {user.district}, {user.state}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-[#DCE3D7] bg-white hover:bg-[#F6F7F4] text-xs font-semibold text-[#526157] hover:text-[#17211A] flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col lg:pl-[260px] min-w-0">
        {/* Compact Sticky Top Bar (52px mobile / 64px desktop — stays under 15% mobile sticky cap) */}
        <header className="sticky top-0 z-20 h-[52px] lg:h-16 bg-white/95 backdrop-blur-sm border-b border-[#DCE3D7] px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="lg:hidden font-display font-bold text-base text-[#14482D] whitespace-nowrap shrink-0">
              AgriSmart
            </span>
            <span className="lg:hidden text-[#C7D3C0] shrink-0" aria-hidden="true">
              /
            </span>
            <h1 className="font-display text-sm sm:text-base lg:text-lg font-bold text-[#17211A] truncate">
              {navTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Active Farm Selector on Desktop Header */}
            {!isAdminView && farms.length > 0 && (
              <div className="hidden lg:flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#1B5E3C] shrink-0" aria-hidden="true" />
                <label htmlFor="global-farm-select" className="sr-only">
                  Select active farm plot
                </label>
                <select
                  id="global-farm-select"
                  value={activeFarm?.id || ''}
                  onChange={(e) => setActiveFarmId(e.target.value)}
                  className="min-h-[38px] max-w-[260px] px-3 py-1.5 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] text-sm font-medium text-[#17211A] focus:outline-none focus:border-[#1B5E3C]"
                >
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name} ({farm.areaAcres} ac)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Role Toggle on Mobile visible exclusively to verified Admin */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleNavigate(isAdminView ? 'overview' : 'admin-overview')}
                className="lg:hidden min-h-[36px] px-3 py-1.5 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] text-xs font-semibold text-[#14482D] whitespace-nowrap shrink-0"
              >
                {isAdminView ? 'Farmer View' : 'Admin View'}
              </button>
            )}
          </div>
        </header>

        {/* Main Viewport Content */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-7 pb-24 lg:pb-10">
          {/* Mobile non-sticky Active Farm Bar (keeps sticky chrome strictly under 15%) */}
          {!isAdminView && farms.length > 0 && (
            <div className="lg:hidden mb-4 flex items-center gap-2 bg-white border border-[#DCE3D7] rounded-2xl px-3.5 py-2">
              <MapPin className="w-4 h-4 text-[#1B5E3C] shrink-0" aria-hidden="true" />
              <label htmlFor="mobile-farm-select" className="text-xs font-medium text-[#526157] whitespace-nowrap">
                Plot:
              </label>
              <select
                id="mobile-farm-select"
                value={activeFarm?.id || ''}
                onChange={(e) => setActiveFarmId(e.target.value)}
                className="flex-1 min-w-0 min-h-[36px] bg-transparent text-sm font-semibold text-[#17211A] focus:outline-none truncate"
              >
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name} ({farm.areaAcres} ac)
                  </option>
                ))}
              </select>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Mobile Fixed Bottom Thumb-Zone Navigation (60px height) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-[60px] bg-white/95 backdrop-blur-md border-t border-[#DCE3D7] grid grid-cols-5 items-center px-1"
      >
        {mobilePrimaryTabs.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
                active ? 'text-[#1B5E3C] font-semibold' : 'text-[#526157]'
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] leading-none whitespace-nowrap">{item.shortLabel}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
            moreOpen ? 'text-[#1B5E3C] font-semibold' : 'text-[#526157]'
          }`}
        >
          <Grid className="w-5 h-5" aria-hidden="true" />
          <span className="text-[10px] leading-none whitespace-nowrap">Tools</span>
        </button>
      </nav>

      {/* Mobile Bottom Sheet for All 7 Modules & Account */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/45 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="All AgriSmart Tools"
            className="bg-white rounded-t-3xl border-t border-[#DCE3D7] p-5 space-y-4 max-h-[82vh] overflow-y-auto"
          >
            <div className="w-10 h-1.5 rounded-full bg-[#DCE3D7] mx-auto" />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-[#17211A]">All AgriSmart Tools</h2>
                <p className="text-xs text-[#526157]">
                  {user.displayName} · Firebase Cloud
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close tools menu"
                className="min-h-[44px] min-w-[44px] rounded-xl border border-[#DCE3D7] flex items-center justify-center text-[#526157]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {(isAdminView ? ADMIN_NAV : FARMER_NAV).map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`min-h-[52px] px-3.5 py-3 rounded-2xl border text-left flex items-center gap-2.5 text-sm font-medium ${
                      active
                        ? 'border-[#1B5E3C] bg-[#E7F2EC] text-[#14482D] font-semibold'
                        : 'border-[#DCE3D7] bg-[#F6F7F4] text-[#17211A]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[#DCE3D7] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  void logout();
                }}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#DCE3D7] text-sm font-semibold text-[#526157] flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { FarmerNavTab, AdminNavTab };
