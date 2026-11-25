import React, { useState } from 'react';
import {
  ArrowRight,
  CloudSun,
  Leaf,
  ShieldCheck,
  Sprout,
} from 'lucide-react';
import { useAgri } from '../context/AgriContext';
import { ErrorAlert } from './SourceNotice';

export function SignInScreen() {
  const {
    signInWithGoogle,
    firebaseAvailable,
    authError,
    systemStatus,
  } = useAgri();
  const [signingIn, setSigningIn] = useState(false);

  const handleGoogle = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7F4] flex flex-col">
      <header className="w-full border-b border-[#DCE3D7] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <span className="font-display text-xl font-bold tracking-tight text-[#14482D] whitespace-nowrap shrink-0">
            AgriSmart
          </span>
          <div className="hidden sm:flex items-center gap-4 text-xs text-[#526157]">
            <span>South Asia Field Companion</span>
            <span aria-hidden="true">·</span>
            <span>Acres &amp; Quintals</span>
            <span aria-hidden="true">·</span>
            <span>Kharif / Rabi / Zaid</span>
          </div>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={signingIn || !firebaseAvailable}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#1B5E3C] text-white text-sm font-semibold hover:bg-[#14482D] transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            {signingIn ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16 grid lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        {/* Left Editorial Field Introduction */}
        <section className="lg:col-span-7 flex flex-col justify-between bg-white border border-[#DCE3D7] rounded-3xl overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 space-y-6">
            <p className="text-xs font-semibold text-[#6B4E37]">
              Practical Farming Guidance · Real Weather · Persistent Field Records
            </p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-[1.12] tracking-tight text-[#17211A]">
              Clear daily decisions for every acre you farm.
            </h1>
            <p className="text-base text-[#526157] leading-relaxed max-w-xl">
              Plan Kharif, Rabi, and Zaid crops from your soil NPK values, check crop leaves with
              photo uploads, estimate harvest output in quintals per acre, and act on live
              Open-Meteo weather alerts in simple language.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#DCE3D7]">
                <Sprout className="w-5 h-5 text-[#1B5E3C] mb-2" aria-hidden="true" />
                <h2 className="text-sm font-bold text-[#17211A]">Crop &amp; Yield</h2>
                <p className="text-xs text-[#526157] mt-1 leading-relaxed">
                  Soil pH, NPK, and seasonal sowing plans with quintals/acre forecasts.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#DCE3D7]">
                <Leaf className="w-5 h-5 text-[#1B5E3C] mb-2" aria-hidden="true" />
                <h2 className="text-sm font-bold text-[#17211A]">Leaf Health</h2>
                <p className="text-xs text-[#526157] mt-1 leading-relaxed">
                  Upload leaf photos for organic &amp; chemical treatment steps via Ollama Vision.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#DCE3D7]">
                <CloudSun className="w-5 h-5 text-[#1B5E3C] mb-2" aria-hidden="true" />
                <h2 className="text-sm font-bold text-[#17211A]">Live Weather</h2>
                <p className="text-xs text-[#526157] mt-1 leading-relaxed">
                  Real Open-Meteo 7-day forecasts with spray-wind, heat, and drainage alerts.
                </p>
              </div>
            </div>
          </div>

          {/* Grounded Botanical Landscape SVG Illustration */}
          <div className="relative h-44 sm:h-52 w-full bg-[#E7F2EC] border-t border-[#DCE3D7] overflow-hidden">
            <svg
              viewBox="0 0 800 220"
              preserveAspectRatio="xMidYMax slice"
              className="w-full h-full"
              role="img"
              aria-label="Illustration of green terraced farmland fields under warm morning sun"
            >
              <defs>
                <linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EFF6F0" />
                  <stop offset="100%" stopColor="#DCECE0" />
                </linearGradient>
                <linearGradient id="fieldBack" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4F8A64" />
                  <stop offset="100%" stopColor="#2F6F4B" />
                </linearGradient>
                <linearGradient id="fieldFront" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1B5E3C" />
                  <stop offset="100%" stopColor="#14482D" />
                </linearGradient>
              </defs>
              <rect width="800" height="220" fill="url(#skyDay)" />
              <circle cx="680" cy="54" r="28" fill="#F2C97D" opacity="0.85" />
              <path d="M0 135 Q200 88 420 120 T800 106 L800 220 L0 220 Z" fill="#8BB594" opacity="0.55" />
              <path d="M0 154 Q240 112 500 148 T800 132 L800 220 L0 220 Z" fill="url(#fieldBack)" />
              <path d="M0 176 Q280 144 540 178 T800 162 L800 220 L0 220 Z" fill="url(#fieldFront)" />
              <path d="M120 220 Q280 185 450 168" stroke="#E7F2EC" strokeWidth="2" opacity="0.35" fill="none" />
              <path d="M260 220 Q420 188 610 165" stroke="#E7F2EC" strokeWidth="2" opacity="0.28" fill="none" />
              <path d="M420 220 Q560 194 740 170" stroke="#E7F2EC" strokeWidth="2" opacity="0.22" fill="none" />
            </svg>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#103823]/90 via-[#14482D]/45 to-transparent pt-8 pb-3.5 px-6 flex flex-wrap items-center justify-between gap-2 text-xs text-[#F2F7F3]">
              <span className="font-medium">
                7 Modules · Cloud Synced Farms · Firebase Secured
              </span>
              <span className="font-mono tabular-nums whitespace-nowrap">
                {systemStatus?.ollamaConfigured
                  ? `Ollama Live (${systemStatus.textModel})`
                  : 'Ollama: DEMO Advisory Mode'}
              </span>
            </div>
          </div>
        </section>

        {/* Right Firebase Google Sign-In Card */}
        <section className="lg:col-span-5 bg-white border border-[#DCE3D7] rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#17211A]">
                Sign in to AgriSmart
              </h2>
              <p className="text-sm text-[#526157] mt-1.5 leading-relaxed">
                Sign in with your Google account to securely save your farm plots, soil records,
                and crop analysis history in Firebase Cloud.
              </p>
            </div>

            {authError && <ErrorAlert message={authError} />}

            {/* Firebase Google Auth */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={signingIn || !firebaseAvailable}
                className="w-full min-h-[52px] px-4 py-3.5 rounded-xl bg-[#1B5E3C] text-white text-sm font-semibold hover:bg-[#14482D] transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>
                  {signingIn
                    ? 'Connecting to Firebase...'
                    : 'Sign in with Google (Firebase Cloud)'}
                </span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <p className="text-xs text-[#526157] text-center">
                {firebaseAvailable
                  ? 'Firebase Auth & Cloud Firestore are provisioned and active.'
                  : 'Firebase configuration is unavailable in this environment.'}
              </p>
            </div>

            <div className="rounded-2xl border border-[#DCE3D7] bg-[#F6F7F4] p-4 space-y-2 text-xs text-[#526157] leading-relaxed">
              <p className="font-semibold text-[#17211A]">What you get after sign-in</p>
              <ul className="space-y-1.5 list-disc pl-4">
                <li>Private farm plots &amp; soil NPK records synced to your account</li>
                <li>Saved crop plans, leaf disease scans, yield forecasts &amp; AgriBot history</li>
                <li>Live 7-day Open-Meteo agricultural weather &amp; field alerts</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-[#DCE3D7] text-xs text-[#526157] leading-relaxed">
            Every signed-in user gets their own private Farmer workspace. Administrator console
            access is restricted exclusively to the authorized AgriSmart administrator.
          </div>
        </section>
      </main>
    </div>
  );
}
