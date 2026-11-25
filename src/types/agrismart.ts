export type UserRole = 'farmer' | 'admin';

export type SoilType =
  | 'Alluvial'
  | 'Black Cotton'
  | 'Red Loam'
  | 'Sandy Loam'
  | 'Clay Loam'
  | 'Laterite';

export type IrrigationType =
  | 'Canal'
  | 'Borewell / Tubewell'
  | 'Drip Irrigation'
  | 'Sprinkler'
  | 'Rainfed Only';

export type CroppingSeason = 'Kharif' | 'Rabi' | 'Zaid';

export type PreferredLanguage =
  | 'English'
  | 'Hindi'
  | 'Gujarati'
  | 'Marathi'
  | 'Punjabi'
  | 'Tamil'
  | 'Telugu';

export type DataSourceMode = 'LIVE_OLLAMA' | 'DEMO';

export type WeatherSourceMode = 'LIVE_OPEN_METEO' | 'DEMO';

export type ModuleType = 'crop' | 'disease' | 'yield' | 'decision';

export type SeverityLevel = 'normal' | 'moderate' | 'high';

export type AdvisoryCategory = 'weather' | 'pest' | 'soil' | 'market';

export type AdvisorySeverity = 'info' | 'warning' | 'critical';

export type FarmerNavTab =
  | 'overview'
  | 'crop'
  | 'disease'
  | 'yield'
  | 'weather'
  | 'agribot'
  | 'decision'
  | 'farms';

export type AdminNavTab = 'admin-overview' | 'admin-farmers' | 'admin-advisories' | 'admin-setup';

export type AppNavTab = FarmerNavTab | AdminNavTab;

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  phone?: string;
  state: string;
  district: string;
  village?: string;
  preferredLanguage?: PreferredLanguage;
  farmingExperienceYears?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FarmPlot {
  id: string;
  ownerId: string;
  name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  areaAcres: number;
  soilType: SoilType;
  irrigationType: IrrigationType;
  season: CroppingSeason;
  currentCrop?: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  soilPh: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisRecord {
  id: string;
  ownerId: string;
  farmId: string;
  farmName: string;
  moduleType: ModuleType;
  source: DataSourceMode;
  model: string;
  title: string;
  summary: string;
  severity: SeverityLevel;
  highlights?: string[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  ownerId: string;
  farmId?: string;
  sender: 'user' | 'assistant';
  content: string;
  source: 'USER' | DataSourceMode;
  createdAt: string;
}

export interface RegionalAdvisory {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  region: string;
  category: AdvisoryCategory;
  severity: AdvisorySeverity;
  message: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CropInput {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  soilPh: number;
  temperatureC: number;
  rainfallMm: number;
  humidityPct: number;
  areaAcres: number;
  soilType: SoilType;
  irrigationType: IrrigationType;
  season: CroppingSeason;
  district: string;
  state: string;
}

export interface RecommendedCrop {
  cropName: string;
  localName: string;
  suitabilityScore: number;
  expectedYieldQuintalsPerAcre: number;
  waterNeed: 'Low' | 'Moderate' | 'High';
  sowingWindow: string;
  durationDays: string;
  whyItFits: string;
  fertilizerTip: string;
}

export interface CropRecommendationResponse {
  source: DataSourceMode;
  model: string;
  notice?: string;
  summary: string;
  soilHealthNote: string;
  recommendations: RecommendedCrop[];
}

export interface DiseaseInput {
  imageBase64: string;
  mimeType: string;
  fileName: string;
  cropName: string;
  symptomsNote: string;
  district?: string;
  season?: CroppingSeason;
}

export interface DiseaseDetectionResponse {
  source: DataSourceMode;
  model: string;
  notice?: string;
  diseaseName: string;
  scientificName: string;
  affectedCrop: string;
  severity: SeverityLevel;
  confidenceLabel: string;
  plainExplanation: string;
  visibleSymptoms: string[];
  organicTreatments: string[];
  chemicalTreatments: string[];
  preventionSteps: string[];
  urgentAction: string;
}

export interface YieldInput {
  cropName: string;
  areaAcres: number;
  season: CroppingSeason;
  soilType: SoilType;
  irrigationType: IrrigationType;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  soilPh: number;
  expectedRainfallMm: number;
  fertilizerLevel: 'Low' | 'Balanced' | 'Intensive';
  district: string;
}

export interface YieldPredictionResponse {
  source: DataSourceMode;
  model: string;
  notice?: string;
  cropName: string;
  predictedQuintalsPerAcre: number;
  predictedTotalQuintals: number;
  predictedTotalTonnes: number;
  lowRangeQuintals: number;
  highRangeQuintals: number;
  outlook: 'Favorable' | 'Moderate' | 'At Risk';
  summary: string;
  limitingFactors: string[];
  improvementActions: string[];
}

export interface WeatherCurrent {
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPct: number;
  precipitationMm: number;
  windSpeedKmh: number;
  weatherCode: number;
  condition: string;
  conditionIcon: 'sun' | 'partly-cloudy' | 'cloud' | 'rain' | 'storm' | 'fog';
  soilMoisture: number | null;
  observedAt: string;
}

export interface WeatherDayForecast {
  date: string;
  dayLabel: string;
  tempMaxC: number;
  tempMinC: number;
  precipitationMm: number;
  precipitationProbPct: number;
  windMaxKmh: number;
  uvIndexMax: number;
  weatherCode: number;
  condition: string;
  conditionIcon: 'sun' | 'partly-cloudy' | 'cloud' | 'rain' | 'storm' | 'fog';
}

export interface WeatherAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  action: string;
  metric: string;
}

export interface WeatherReport {
  source: WeatherSourceMode;
  providerLabel: string;
  notice?: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  timezone: string;
  current: WeatherCurrent;
  daily: WeatherDayForecast[];
  alerts: WeatherAlert[];
}

export interface GeocodeResult {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  label: string;
}

export interface DecisionInput {
  farm: Pick<
    FarmPlot,
    | 'name'
    | 'district'
    | 'state'
    | 'areaAcres'
    | 'soilType'
    | 'irrigationType'
    | 'season'
    | 'currentCrop'
    | 'nitrogen'
    | 'phosphorus'
    | 'potassium'
    | 'soilPh'
  >;
  weatherSummary: string;
  weatherSource: WeatherSourceMode;
  recentDiseaseNote: string;
  farmerGoal: string;
}

export interface DecisionActionBlock {
  area: 'Irrigation Plan' | 'Fertilizer & Soil' | 'Pest & Disease Watch' | 'Harvest & Market';
  priority: 'Immediate' | 'This Week' | 'Monitor';
  headline: string;
  steps: string[];
}

export interface DecisionPlanResponse {
  source: DataSourceMode;
  model: string;
  notice?: string;
  planTitle: string;
  executiveSummary: string;
  riskLevel: SeverityLevel;
  actionBlocks: DecisionActionBlock[];
  sevenDaySchedule: { day: string; task: string }[];
}

export interface ChatRequestInput {
  message: string;
  history: { sender: 'user' | 'assistant'; content: string }[];
  farmContext?: {
    name: string;
    district: string;
    state: string;
    areaAcres: number;
    soilType: SoilType;
    irrigationType: IrrigationType;
    season: CroppingSeason;
    currentCrop?: string;
    soilPh: number;
  };
}

export interface ChatResponse {
  source: DataSourceMode;
  model: string;
  notice?: string;
  reply: string;
}

export interface SystemStatusResponse {
  ollamaConfigured: boolean;
  ollamaHost: string;
  textModel: string;
  visionModel: string;
  weatherProvider: string;
  firebaseConfigPresent: boolean;
  serverTime: string;
}
