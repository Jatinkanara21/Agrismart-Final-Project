import React, { useRef, useState } from 'react';
import { AlertTriangle, Check, Leaf, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import { useAgri } from '../../context/AgriContext';
import { apiClient } from '../../lib/apiClient';
import { validateImageUpload } from '../../utils/agronomy';
import { ErrorAlert, SkeletonRows, SourceBanner } from '../SourceNotice';
import type { DiseaseDetectionResponse } from '../../types/agrismart';

const COMMON_CROPS = [
  'Basmati Paddy (Rice)',
  'Bt Cotton',
  'Wheat',
  'Tomato',
  'Groundnut',
  'Chickpea (Chana)',
  'Indian Mustard',
  'Hybrid Maize',
  'Potato',
  'Chilli',
];

function createSampleLeafPngDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Soft soil backdrop
  ctx.fillStyle = '#E8EFE4';
  ctx.fillRect(0, 0, 480, 360);

  // Leaf silhouette
  ctx.save();
  ctx.translate(240, 185);
  ctx.rotate(-0.22);
  ctx.beginPath();
  ctx.moveTo(-165, 10);
  ctx.bezierCurveTo(-90, -110, 95, -110, 170, 0);
  ctx.bezierCurveTo(95, 110, -90, 110, -165, 10);
  ctx.closePath();
  ctx.fillStyle = '#3B7A4A';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#255632';
  ctx.stroke();

  // Midrib vein
  ctx.beginPath();
  ctx.moveTo(-155, 8);
  ctx.lineTo(155, 0);
  ctx.strokeStyle = '#7BB27E';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Simulated early blight concentric lesions for diagnostic sample testing
  const spots = [
    { x: -45, y: -22, r: 20 },
    { x: 38, y: 18, r: 24 },
    { x: -12, y: 36, r: 15 },
    { x: 76, y: -25, r: 16 },
  ];
  for (const s of spots) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r + 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(222, 198, 72, 0.72)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = '#6B3E26';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 0.52, 0, Math.PI * 2);
    ctx.strokeStyle = '#3F2212';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  return canvas.toDataURL('image/png');
}

export function DiseaseDetectionModule() {
  const { activeFarm, saveAnalysis } = useAgri();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cropName, setCropName] = useState(activeFarm?.currentCrop || 'Tomato');
  const [symptomsNote, setSymptomsNote] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileError, setFileError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<DiseaseDetectionResponse | null>(null);
  const [savedFlag, setSavedFlag] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setApiError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const check = validateImageUpload(file.type, file.size);
    if (!check.valid) {
      setFileError(check.error || 'Invalid image file.');
      setPreviewUrl('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewUrl(reader.result);
        setMimeType(file.type);
        setFileName(file.name);
      }
    };
    reader.onerror = () => {
      setFileError('Could not read the selected image file. Please try another photo.');
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSamplePhoto = () => {
    setFileError(null);
    setApiError(null);
    const dataUrl = createSampleLeafPngDataUrl();
    setPreviewUrl(dataUrl);
    setMimeType('image/png');
    setFileName('sample_early_blight_leaf.png');
    setCropName('Tomato');
    setSymptomsNote('Brown concentric spots with yellow halo on lower leaves');
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSavedFlag(false);

    if (!previewUrl || !mimeType) {
      setFileError('Please upload a leaf photo (or tap Load Sample Leaf Photo) first.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.detectDisease({
        imageBase64: previewUrl,
        mimeType,
        fileName: fileName || 'leaf.png',
        cropName,
        symptomsNote,
        district: activeFarm?.district,
        season: activeFarm?.season,
      });
      setResult(response);
      if (activeFarm) {
        await saveAnalysis({
          farmId: activeFarm.id,
          farmName: activeFarm.name,
          moduleType: 'disease',
          source: response.source,
          model: response.model,
          title: `${response.diseaseName} (${response.affectedCrop})`,
          summary: `${response.plainExplanation} Urgent step: ${response.urgentAction}`,
          severity: response.severity,
          highlights: [
            `Severity: ${response.severity}`,
            ...response.organicTreatments.slice(0, 2),
          ],
        });
        setSavedFlag(true);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Plant disease scan failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#17211A]">Plant Disease Detection</h2>
        <p className="text-sm text-[#526157] mt-1">
          Upload a clear daylight photo of an affected leaf (JPEG, PNG, or WebP up to 5 MB) for
          organic and chemical care guidance.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleAnalyze}
          className="lg:col-span-5 bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-4"
        >
          {/* Upload Dropzone */}
          <div>
            <label htmlFor="leaf-photo-input" className="block text-xs font-semibold text-[#17211A] mb-1.5">
              Leaf Photo Upload
            </label>
            <input
              ref={fileInputRef}
              id="leaf-photo-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="sr-only"
            />
            <div className="rounded-2xl border border-dashed border-[#B7C7B0] bg-[#F6F7F4] p-4 text-center space-y-3">
              {previewUrl ? (
                <div className="space-y-2">
                  <img
                    src={previewUrl}
                    alt={`Uploaded leaf sample for ${cropName}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-48 object-cover rounded-xl border border-[#DCE3D7]"
                  />
                  <p className="text-xs text-[#526157] truncate">{fileName}</p>
                </div>
              ) : (
                <div className="py-5 space-y-2">
                  <Upload className="w-7 h-7 text-[#1B5E3C] mx-auto" aria-hidden="true" />
                  <p className="text-sm font-semibold text-[#17211A]">
                    Select a crop leaf photo
                  </p>
                  <p className="text-xs text-[#526157]">JPEG, PNG, or WebP · Max 5 MB</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#DCE3D7] bg-white text-xs font-semibold text-[#17211A] hover:border-[#1B5E3C] transition-colors whitespace-nowrap"
                >
                  {previewUrl ? 'Choose Different Photo' : 'Browse Photo'}
                </button>
                <button
                  type="button"
                  onClick={handleLoadSamplePhoto}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#DCE3D7] bg-[#E7F2EC] text-xs font-semibold text-[#14482D] hover:bg-[#D8EBDF] transition-colors whitespace-nowrap"
                >
                  Load Sample Leaf Photo
                </button>
              </div>
            </div>
            {fileError && <p className="text-xs text-red-700 mt-1.5">{fileError}</p>}
          </div>

          <div>
            <label htmlFor="disease-crop" className="block text-xs font-semibold text-[#17211A] mb-1">
              Crop Name
            </label>
            <select
              id="disease-crop"
              value={cropName}
              onChange={(e) => setCropName(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] text-sm focus:outline-none focus:border-[#1B5E3C]"
            >
              {COMMON_CROPS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="disease-notes" className="block text-xs font-semibold text-[#17211A] mb-1">
              What do you notice? (optional)
            </label>
            <textarea
              id="disease-notes"
              rows={3}
              value={symptomsNote}
              onChange={(e) => setSymptomsNote(e.target.value)}
              placeholder="e.g. Yellow curling leaves, white powder on underside, or brown rings on lower leaves"
              className="w-full px-3 py-2.5 rounded-xl border border-[#DCE3D7] bg-white text-sm focus:outline-none focus:border-[#1B5E3C]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#1B5E3C] text-white text-sm font-semibold hover:bg-[#14482D] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Leaf className="w-4 h-4" aria-hidden="true" />
            {loading ? 'Scanning leaf photo...' : 'Diagnose Plant Leaf'}
          </button>
        </form>

        {/* Diagnosis Result */}
        <div className="lg:col-span-7 space-y-4">
          {apiError && <ErrorAlert message={apiError} />}
          {loading && <SkeletonRows count={3} />}

          {!loading && !result && (
            <div className="bg-white border border-[#DCE3D7] rounded-3xl p-8 text-center space-y-2.5">
              <Leaf className="w-8 h-8 text-[#1B5E3C] mx-auto" aria-hidden="true" />
              <h3 className="font-display text-lg font-bold text-[#17211A]">
                Photo-based leaf health diagnosis
              </h3>
              <p className="text-sm text-[#526157] max-w-md mx-auto leading-relaxed">
                Take a close-up daylight photo of a single affected leaf or tap{' '}
                <strong className="text-[#17211A]">Load Sample Leaf Photo</strong> to test the
                diagnosis workflow immediately.
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

              <section className="bg-white border border-[#DCE3D7] rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#526157]">
                      {result.affectedCrop} · {result.scientificName}
                    </p>
                    <h3 className="font-display text-xl font-bold text-[#17211A] mt-0.5">
                      {result.diseaseName}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase ${
                        result.severity === 'high'
                          ? 'text-red-700'
                          : result.severity === 'moderate'
                            ? 'text-[#B45309]'
                            : 'text-[#15803D]'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                      {result.severity} severity
                    </span>
                    {savedFlag && (
                      <p className="text-xs text-[#15803D] font-medium flex items-center justify-end gap-1 mt-0.5">
                        <Check className="w-3 h-3" aria-hidden="true" />
                        Saved to history
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-sm text-[#17211A] leading-relaxed">{result.plainExplanation}</p>

                <div className="rounded-xl bg-[#FDF6E9] border border-[#EAD5AE] p-3.5 text-sm text-[#7A4A0B]">
                  <strong className="font-semibold">Immediate Next Step:</strong>{' '}
                  {result.urgentAction}
                </div>

                <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-[#EDF1EA]">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#14482D] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                      Organic &amp; Low-Cost Care
                    </h4>
                    <ul className="space-y-1.5 text-xs text-[#17211A] leading-relaxed list-disc pl-4">
                      {result.organicTreatments.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#6B4E37] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" aria-hidden="true" />
                      Targeted Chemical Options
                    </h4>
                    <ul className="space-y-1.5 text-xs text-[#17211A] leading-relaxed list-disc pl-4">
                      {result.chemicalTreatments.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#EDF1EA] space-y-1.5">
                  <h4 className="text-xs font-bold text-[#17211A]">Prevention for Healthy Rows</h4>
                  <ul className="space-y-1 text-xs text-[#526157] leading-relaxed list-disc pl-4">
                    {result.preventionSteps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
