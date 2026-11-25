/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { AgriProvider, useAgri } from './context/AgriContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SignInScreen } from './components/SignInScreen';
import { AppShell } from './components/AppShell';
import { SkeletonRows } from './components/SourceNotice';

const FarmerOverview = lazy(() =>
  import('./components/FarmerOverview').then((m) => ({ default: m.FarmerOverview }))
);
const CropRecommendationModule = lazy(() =>
  import('./components/modules/CropRecommendationModule').then((m) => ({
    default: m.CropRecommendationModule,
  }))
);
const DiseaseDetectionModule = lazy(() =>
  import('./components/modules/DiseaseDetectionModule').then((m) => ({
    default: m.DiseaseDetectionModule,
  }))
);
const YieldPredictionModule = lazy(() =>
  import('./components/modules/YieldPredictionModule').then((m) => ({
    default: m.YieldPredictionModule,
  }))
);
const WeatherForecastModule = lazy(() =>
  import('./components/modules/WeatherForecastModule').then((m) => ({
    default: m.WeatherForecastModule,
  }))
);
const AgriBotModule = lazy(() =>
  import('./components/modules/AgriBotModule').then((m) => ({ default: m.AgriBotModule }))
);
const FarmManagementModule = lazy(() =>
  import('./components/modules/FarmManagementModule').then((m) => ({
    default: m.FarmManagementModule,
  }))
);
const DecisionEngineModule = lazy(() =>
  import('./components/modules/DecisionEngineModule').then((m) => ({
    default: m.DecisionEngineModule,
  }))
);
const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);

function ModuleFallback() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-56 rounded-xl bg-[#E7ECE4] animate-pulse" />
      <SkeletonRows count={3} />
    </div>
  );
}

function AgriRouter() {
  const { authReady, user, isAdmin, activeTab } = useAgri();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F6F7F4] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="font-display text-xl font-bold text-[#14482D]">AgriSmart</p>
          <p className="text-xs text-[#526157]">Preparing your field workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <SignInScreen />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <FarmerOverview />;
      case 'crop':
        return <CropRecommendationModule />;
      case 'disease':
        return <DiseaseDetectionModule />;
      case 'yield':
        return <YieldPredictionModule />;
      case 'weather':
        return <WeatherForecastModule />;
      case 'agribot':
        return <AgriBotModule />;
      case 'decision':
        return <DecisionEngineModule />;
      case 'farms':
        return <FarmManagementModule />;
      case 'admin-overview':
      case 'admin-farmers':
      case 'admin-advisories':
      case 'admin-setup':
        return isAdmin ? <AdminDashboard /> : <FarmerOverview />;
      default:
        return <FarmerOverview />;
    }
  };

  return (
    <AppShell>
      <Suspense fallback={<ModuleFallback />}>{renderContent()}</Suspense>
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AgriProvider>
        <AgriRouter />
      </AgriProvider>
    </ErrorBoundary>
  );
}
