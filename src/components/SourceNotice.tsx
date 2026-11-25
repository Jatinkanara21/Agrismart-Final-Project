import React from 'react';
import { AlertCircle, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import type { DataSourceMode, WeatherSourceMode } from '../types/agrismart';

export function SourceBanner({
  source,
  modelOrProvider,
  notice,
}: {
  source: DataSourceMode | WeatherSourceMode;
  modelOrProvider: string;
  notice?: string;
}) {
  const isLive = source === 'LIVE_OLLAMA' || source === 'LIVE_OPEN_METEO';
  const label =
    source === 'LIVE_OLLAMA'
      ? `Live Ollama Cloud · ${modelOrProvider}`
      : source === 'LIVE_OPEN_METEO'
        ? `Live Meteorological Data · ${modelOrProvider}`
        : `DEMO Mode · ${modelOrProvider}`;

  return (
    <div
      role="status"
      className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${
        isLive
          ? 'bg-[#E7F2EC] border-[#BDDAC9] text-[#14482D]'
          : 'bg-[#FDF6E9] border-[#EAD5AE] text-[#7A4A0B]'
      }`}
    >
      {isLive ? (
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
      ) : (
        <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
      )}
      <div className="min-w-0">
        <p className="font-semibold leading-snug">{label}</p>
        {notice && <p className="mt-0.5 text-xs leading-relaxed opacity-90">{notice}</p>}
      </div>
    </div>
  );
}

export function ErrorAlert({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 mt-0.5 text-red-700 shrink-0" aria-hidden="true" />
        <p className="leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg border border-red-300 bg-white text-red-800 text-xs font-semibold hover:bg-red-50 transition-colors whitespace-nowrap shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </button>
      )}
    </div>
  );
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading content">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="h-20 rounded-2xl border border-[#DCE3D7] bg-white p-4 animate-pulse flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EDF1EA] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-[#EDF1EA] rounded w-2/5" />
            <div className="h-3 bg-[#EDF1EA] rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#C7D3C0] bg-white px-6 py-10 text-center space-y-3">
      <h3 className="text-base font-bold text-[#17211A]">{title}</h3>
      <p className="text-sm text-[#526157] max-w-md mx-auto leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1B5E3C] text-white text-sm font-semibold hover:bg-[#14482D] transition-colors whitespace-nowrap"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
