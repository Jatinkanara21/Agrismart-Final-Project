import type {
  AnalysisRecord,
  ChatMessage,
  FarmPlot,
  RegionalAdvisory,
  UserProfile,
} from '../types/agrismart';

export const DEMO_FARMER_UID = 'demo_farmer_ramesh';
export const DEMO_ADMIN_UID = 'demo_admin_priya';

export interface DemoDatabaseState {
  users: UserProfile[];
  farms: FarmPlot[];
  analyses: AnalysisRecord[];
  chatMessages: ChatMessage[];
  advisories: RegionalAdvisory[];
}

export function createInitialDemoState(): DemoDatabaseState {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86400000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

  const users: UserProfile[] = [
    {
      uid: DEMO_FARMER_UID,
      displayName: 'Rameshbhai Patel',
      email: 'ramesh.patel@demo.agrismart.local',
      role: 'farmer',
      phone: '+91 98250 11223',
      state: 'Gujarat',
      district: 'Anand',
      village: 'Borsad Road',
      preferredLanguage: 'Gujarati',
      farmingExperienceYears: 14,
      createdAt: weekAgo,
      updatedAt: dayAgo,
    },
    {
      uid: 'demo_farmer_harpreet',
      displayName: 'Harpreet Singh Gill',
      email: 'harpreet.gill@demo.agrismart.local',
      role: 'farmer',
      phone: '+91 98140 44556',
      state: 'Punjab',
      district: 'Ludhiana',
      village: 'Jagraon',
      preferredLanguage: 'Punjabi',
      farmingExperienceYears: 18,
      createdAt: weekAgo,
      updatedAt: threeDaysAgo,
    },
    {
      uid: DEMO_ADMIN_UID,
      displayName: 'Dr. Priya Nair (Agri Officer)',
      email: 'priya.nair@demo.agrismart.local',
      role: 'admin',
      phone: '+91 98201 77889',
      state: 'Gujarat',
      district: 'Anand',
      village: 'KVK Extension Centre',
      preferredLanguage: 'English',
      farmingExperienceYears: 11,
      createdAt: weekAgo,
      updatedAt: dayAgo,
    },
  ];

  const farms: FarmPlot[] = [
    {
      id: 'farm_anand_north',
      ownerId: DEMO_FARMER_UID,
      name: 'Charotar North Plot',
      district: 'Anand',
      state: 'Gujarat',
      latitude: 22.5645,
      longitude: 72.9289,
      areaAcres: 4.5,
      soilType: 'Alluvial',
      irrigationType: 'Canal',
      season: 'Kharif',
      currentCrop: 'Basmati Paddy (Rice)',
      nitrogen: 82,
      phosphorus: 44,
      potassium: 56,
      soilPh: 7.1,
      createdAt: weekAgo,
      updatedAt: dayAgo,
    },
    {
      id: 'farm_anand_west',
      ownerId: DEMO_FARMER_UID,
      name: 'Borsad Well Plot',
      district: 'Anand',
      state: 'Gujarat',
      latitude: 22.411,
      longitude: 72.898,
      areaAcres: 3.0,
      soilType: 'Black Cotton',
      irrigationType: 'Drip Irrigation',
      season: 'Kharif',
      currentCrop: 'Bt Cotton',
      nitrogen: 64,
      phosphorus: 36,
      potassium: 52,
      soilPh: 7.5,
      createdAt: weekAgo,
      updatedAt: threeDaysAgo,
    },
    {
      id: 'farm_ludhiana_east',
      ownerId: 'demo_farmer_harpreet',
      name: 'Sutlej Canal Field',
      district: 'Ludhiana',
      state: 'Punjab',
      latitude: 30.901,
      longitude: 75.8573,
      areaAcres: 8.0,
      soilType: 'Alluvial',
      irrigationType: 'Borewell / Tubewell',
      season: 'Rabi',
      currentCrop: 'Wheat (HD-2967)',
      nitrogen: 88,
      phosphorus: 48,
      potassium: 60,
      soilPh: 7.2,
      createdAt: weekAgo,
      updatedAt: threeDaysAgo,
    },
  ];

  const analyses: AnalysisRecord[] = [
    {
      id: 'anl_demo_crop_1',
      ownerId: DEMO_FARMER_UID,
      farmId: 'farm_anand_north',
      farmName: 'Charotar North Plot',
      moduleType: 'crop',
      source: 'DEMO',
      model: 'agrismart-demo-agronomy-v1',
      title: 'Kharif Crop Plan: Basmati Paddy & Hybrid Maize',
      summary:
        'DEMO record: Alluvial soil at pH 7.1 with canal irrigation strongly supports Basmati Paddy (est. 21.0 qtl/acre) and Hybrid Maize.',
      severity: 'normal',
      highlights: ['Top Match: Basmati Paddy (92%)', 'Est. Yield: 21.0 qtl/acre', 'pH 7.1 optimal'],
      createdAt: dayAgo,
    },
    {
      id: 'anl_demo_disease_1',
      ownerId: DEMO_FARMER_UID,
      farmId: 'farm_anand_west',
      farmName: 'Borsad Well Plot',
      moduleType: 'disease',
      source: 'DEMO',
      model: 'agrismart-demo-pathology-v1',
      title: 'Sample Scan: Early Leaf Spot Check (Bt Cotton)',
      summary:
        'DEMO record: Moderate spotting noted on lower leaves. Recommended Neem Oil spray (3 ml/L) and morning root-zone irrigation.',
      severity: 'moderate',
      highlights: ['Severity: Moderate', 'Remove affected lower leaves', 'Neem Oil 3 ml/L spray'],
      createdAt: threeDaysAgo,
    },
  ];

  const chatMessages: ChatMessage[] = [
    {
      id: 'chat_demo_welcome',
      ownerId: DEMO_FARMER_UID,
      farmId: 'farm_anand_north',
      sender: 'assistant',
      content:
        'Namaste Rameshbhai! I am AgriBot, your field companion. Ask me about Kharif/Rabi sowing dates, split Urea & DAP doses, drip irrigation schedules, or leaf spot prevention for Charotar North Plot.',
      source: 'DEMO',
      createdAt: dayAgo,
    },
  ];

  const advisories: RegionalAdvisory[] = [
    {
      id: 'adv_gujarat_drainage',
      authorId: DEMO_ADMIN_UID,
      authorName: 'Dr. Priya Nair (Agri Officer)',
      title: 'Keep Field Bund Outlets Clear Before Showers',
      region: 'Anand & Central Gujarat',
      category: 'weather',
      severity: 'warning',
      message:
        'DEMO Advisory: Inspect field perimeter bunds and keep drainage channels clear for standing crops like Cotton and Groundnut. Hold Urea top-dressing until heavy showers pass.',
      active: true,
      createdAt: dayAgo,
      updatedAt: dayAgo,
    },
    {
      id: 'adv_whitefly_watch',
      authorId: DEMO_ADMIN_UID,
      authorName: 'Dr. Priya Nair (Agri Officer)',
      title: 'Install Yellow Sticky Traps for Early Whitefly Scouting',
      region: 'Gujarat & Maharashtra Cotton Belt',
      category: 'pest',
      severity: 'info',
      message:
        'DEMO Advisory: Place 10–12 yellow sticky traps per acre in Bt Cotton and vegetable plots to detect whiteflies early and minimize chemical sprays.',
      active: true,
      createdAt: threeDaysAgo,
      updatedAt: threeDaysAgo,
    },
  ];

  return { users, farms, analyses, chatMessages, advisories };
}
