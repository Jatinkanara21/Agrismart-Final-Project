import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { createInitialDemoState, type DemoDatabaseState } from './demoSeed';
import type {
  AnalysisRecord,
  ChatMessage,
  FarmPlot,
  RegionalAdvisory,
  UserProfile,
} from '../types/agrismart';
import { clampNumber, generateSafeId, sanitizeString } from '../utils/agronomy';

const LOCAL_STORAGE_KEY = 'agrismart_demo_db_v1';

function timestampToIso(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

export interface DataRepository {
  mode: 'firebase' | 'demo';
  getOrCreateUserProfile(
    uid: string,
    defaults: { displayName: string; email: string }
  ): Promise<UserProfile>;
  updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<UserProfile>;
  listAllUsers(): Promise<UserProfile[]>;
  listFarms(ownerId: string, isAdmin?: boolean): Promise<FarmPlot[]>;
  createFarm(
    ownerId: string,
    farm: Omit<FarmPlot, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ): Promise<FarmPlot>;
  updateFarm(farmId: string, updates: Partial<FarmPlot>): Promise<void>;
  deleteFarm(farmId: string): Promise<void>;
  listAnalyses(ownerId: string, isAdmin?: boolean): Promise<AnalysisRecord[]>;
  saveAnalysis(
    record: Omit<AnalysisRecord, 'id' | 'createdAt'>
  ): Promise<AnalysisRecord>;
  deleteAnalysis(analysisId: string): Promise<void>;
  listChatMessages(ownerId: string): Promise<ChatMessage[]>;
  saveChatMessage(msg: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage>;
  clearChatMessages(ownerId: string): Promise<void>;
  listAdvisories(includeInactive?: boolean): Promise<RegionalAdvisory[]>;
  createAdvisory(
    advisory: Omit<RegionalAdvisory, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<RegionalAdvisory>;
  toggleAdvisoryActive(advisoryId: string, active: boolean): Promise<void>;
  deleteAdvisory(advisoryId: string): Promise<void>;
}

// ============================================================================
// 1. Local Persistent Demo Adapter (localStorage)
// ============================================================================

function readLocalState(): DemoDatabaseState {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const initial = createInitialDemoState();
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as DemoDatabaseState;
    if (!Array.isArray(parsed.users) || !Array.isArray(parsed.farms)) {
      const initial = createInitialDemoState();
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return parsed;
  } catch {
    return createInitialDemoState();
  }
}

function writeLocalState(state: DemoDatabaseState): void {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors in restricted environments
  }
}

export function resetLocalDemoDatabase(): void {
  try {
    const fresh = createInitialDemoState();
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    // Ignore
  }
}

export class LocalDemoRepository implements DataRepository {
  mode: 'demo' = 'demo';

  async getOrCreateUserProfile(
    uid: string,
    defaults: { displayName: string; email: string }
  ): Promise<UserProfile> {
    const state = readLocalState();
    const existing = state.users.find((u) => u.uid === uid);
    if (existing) return existing;

    const now = new Date().toISOString();
    const created: UserProfile = {
      uid,
      displayName: sanitizeString(defaults.displayName, 100) || 'Farmer',
      email: sanitizeString(defaults.email, 200) || 'farmer@demo.agrismart.local',
      role: 'farmer',
      state: 'Gujarat',
      district: 'Anand',
      village: '',
      preferredLanguage: 'English',
      farmingExperienceYears: 5,
      createdAt: now,
      updatedAt: now,
    };
    state.users.push(created);
    writeLocalState(state);
    return created;
  }

  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const state = readLocalState();
    const idx = state.users.findIndex((u) => u.uid === uid);
    if (idx === -1) throw new Error('User profile not found.');

    const updated: UserProfile = {
      ...state.users[idx],
      displayName: sanitizeString(updates.displayName ?? state.users[idx].displayName, 100),
      phone: sanitizeString(updates.phone ?? state.users[idx].phone ?? '', 30),
      state: sanitizeString(updates.state ?? state.users[idx].state, 80),
      district: sanitizeString(updates.district ?? state.users[idx].district, 80),
      village: sanitizeString(updates.village ?? state.users[idx].village ?? '', 80),
      preferredLanguage: updates.preferredLanguage ?? state.users[idx].preferredLanguage,
      farmingExperienceYears: clampNumber(
        Number(updates.farmingExperienceYears ?? state.users[idx].farmingExperienceYears ?? 0),
        0,
        80
      ),
      updatedAt: new Date().toISOString(),
    };
    state.users[idx] = updated;
    writeLocalState(state);
    return updated;
  }

  async listAllUsers(): Promise<UserProfile[]> {
    return readLocalState().users;
  }

  async listFarms(ownerId: string, isAdmin = false): Promise<FarmPlot[]> {
    const state = readLocalState();
    const list = isAdmin ? state.farms : state.farms.filter((f) => f.ownerId === ownerId);
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async createFarm(
    ownerId: string,
    farm: Omit<FarmPlot, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ): Promise<FarmPlot> {
    const state = readLocalState();
    const now = new Date().toISOString();
    const created: FarmPlot = {
      ...farm,
      id: generateSafeId('farm'),
      ownerId,
      name: sanitizeString(farm.name, 100),
      district: sanitizeString(farm.district, 80),
      state: sanitizeString(farm.state, 80),
      currentCrop: sanitizeString(farm.currentCrop ?? '', 80),
      areaAcres: clampNumber(Number(farm.areaAcres), 0.05, 50000),
      nitrogen: clampNumber(Number(farm.nitrogen), 0, 300),
      phosphorus: clampNumber(Number(farm.phosphorus), 0, 300),
      potassium: clampNumber(Number(farm.potassium), 0, 400),
      soilPh: clampNumber(Number(farm.soilPh), 3.0, 10.0),
      latitude: clampNumber(Number(farm.latitude), -90, 90),
      longitude: clampNumber(Number(farm.longitude), -180, 180),
      createdAt: now,
      updatedAt: now,
    };
    state.farms.unshift(created);
    writeLocalState(state);
    return created;
  }

  async updateFarm(farmId: string, updates: Partial<FarmPlot>): Promise<void> {
    const state = readLocalState();
    const idx = state.farms.findIndex((f) => f.id === farmId);
    if (idx === -1) return;
    state.farms[idx] = {
      ...state.farms[idx],
      ...updates,
      id: state.farms[idx].id,
      ownerId: state.farms[idx].ownerId,
      updatedAt: new Date().toISOString(),
    };
    writeLocalState(state);
  }

  async deleteFarm(farmId: string): Promise<void> {
    const state = readLocalState();
    state.farms = state.farms.filter((f) => f.id !== farmId);
    writeLocalState(state);
  }

  async listAnalyses(ownerId: string, isAdmin = false): Promise<AnalysisRecord[]> {
    const state = readLocalState();
    const list = isAdmin ? state.analyses : state.analyses.filter((a) => a.ownerId === ownerId);
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async saveAnalysis(record: Omit<AnalysisRecord, 'id' | 'createdAt'>): Promise<AnalysisRecord> {
    const state = readLocalState();
    const created: AnalysisRecord = {
      ...record,
      id: generateSafeId('anl'),
      farmName: sanitizeString(record.farmName, 100),
      model: sanitizeString(record.model, 80),
      title: sanitizeString(record.title, 160),
      summary: sanitizeString(record.summary, 1500),
      highlights: (record.highlights || []).slice(0, 8).map((h) => sanitizeString(h, 200)),
      createdAt: new Date().toISOString(),
    };
    state.analyses.unshift(created);
    writeLocalState(state);
    return created;
  }

  async deleteAnalysis(analysisId: string): Promise<void> {
    const state = readLocalState();
    state.analyses = state.analyses.filter((a) => a.id !== analysisId);
    writeLocalState(state);
  }

  async listChatMessages(ownerId: string): Promise<ChatMessage[]> {
    const state = readLocalState();
    return state.chatMessages
      .filter((m) => m.ownerId === ownerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async saveChatMessage(msg: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage> {
    const state = readLocalState();
    const sender: ChatMessage['sender'] = msg.sender === 'user' ? 'user' : 'assistant';
    const source: ChatMessage['source'] =
      msg.source === 'USER' || msg.source === 'LIVE_OLLAMA' || msg.source === 'DEMO'
        ? msg.source
        : sender === 'user'
          ? 'USER'
          : 'DEMO';
    const content = sanitizeString(msg.content, 4000);
    if (!content) {
      throw new Error('Cannot save an empty chat message.');
    }
    const created: ChatMessage = {
      ...msg,
      id: generateSafeId('msg'),
      sender,
      source,
      content,
      createdAt: new Date().toISOString(),
    };
    state.chatMessages.push(created);
    writeLocalState(state);
    return created;
  }

  async clearChatMessages(ownerId: string): Promise<void> {
    const state = readLocalState();
    state.chatMessages = state.chatMessages.filter((m) => m.ownerId !== ownerId);
    writeLocalState(state);
  }

  async listAdvisories(includeInactive = false): Promise<RegionalAdvisory[]> {
    const state = readLocalState();
    const list = includeInactive ? state.advisories : state.advisories.filter((a) => a.active);
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createAdvisory(
    advisory: Omit<RegionalAdvisory, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<RegionalAdvisory> {
    const state = readLocalState();
    const now = new Date().toISOString();
    const created: RegionalAdvisory = {
      ...advisory,
      id: generateSafeId('adv'),
      title: sanitizeString(advisory.title, 140),
      region: sanitizeString(advisory.region, 100),
      message: sanitizeString(advisory.message, 1200),
      createdAt: now,
      updatedAt: now,
    };
    state.advisories.unshift(created);
    writeLocalState(state);
    return created;
  }

  async toggleAdvisoryActive(advisoryId: string, active: boolean): Promise<void> {
    const state = readLocalState();
    const idx = state.advisories.findIndex((a) => a.id === advisoryId);
    if (idx === -1) return;
    state.advisories[idx] = {
      ...state.advisories[idx],
      active,
      updatedAt: new Date().toISOString(),
    };
    writeLocalState(state);
  }

  async deleteAdvisory(advisoryId: string): Promise<void> {
    const state = readLocalState();
    state.advisories = state.advisories.filter((a) => a.id !== advisoryId);
    writeLocalState(state);
  }
}

// ============================================================================
// 2. Production Firebase Firestore Adapter (Strictly synced with firestore.rules)
// ============================================================================

export class FirestoreRepository implements DataRepository {
  mode: 'firebase' = 'firebase';

  private requireDb() {
    if (!db) throw new Error('Firestore is not initialized.');
    return db;
  }

  async getOrCreateUserProfile(
    uid: string,
    defaults: { displayName: string; email: string }
  ): Promise<UserProfile> {
    const firestore = this.requireDb();
    const path = `users/${uid}`;
    try {
      const ref = doc(firestore, 'users', uid);
      const snap = await getDoc(ref);
      const isBootstrappedAdmin =
        defaults.email.trim().toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

      if (snap.exists()) {
        const data = snap.data();
        const resolvedRole = isBootstrappedAdmin ? 'admin' : 'farmer';
        return {
          uid: data.uid,
          displayName: data.displayName,
          email: data.email,
          role: resolvedRole,
          phone: data.phone || '',
          state: data.state,
          district: data.district,
          village: data.village || '',
          preferredLanguage: data.preferredLanguage || 'English',
          farmingExperienceYears: Number(data.farmingExperienceYears ?? 0),
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt),
        };
      }

      const role = isBootstrappedAdmin ? 'admin' : 'farmer';
      const payload = {
        uid,
        displayName: sanitizeString(defaults.displayName, 100) || 'Farmer',
        email: sanitizeString(defaults.email, 200),
        role,
        phone: '',
        state: 'Gujarat',
        district: 'Anand',
        village: '',
        preferredLanguage: 'English',
        farmingExperienceYears: 5,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, payload);

      const now = new Date().toISOString();
      return {
        ...payload,
        role,
        preferredLanguage: 'English',
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const firestore = this.requireDb();
    const path = `users/${uid}`;
    try {
      const ref = doc(firestore, 'users', uid);
      const safePatch = {
        displayName: sanitizeString(updates.displayName ?? 'Farmer', 100),
        phone: sanitizeString(updates.phone ?? '', 30),
        state: sanitizeString(updates.state ?? 'Gujarat', 80),
        district: sanitizeString(updates.district ?? 'Anand', 80),
        village: sanitizeString(updates.village ?? '', 80),
        preferredLanguage: updates.preferredLanguage ?? 'English',
        farmingExperienceYears: clampNumber(Number(updates.farmingExperienceYears ?? 0), 0, 80),
        updatedAt: serverTimestamp(),
      };
      await updateDoc(ref, safePatch);
      const snap = await getDoc(ref);
      const d = snap.data() || {};
      return {
        uid,
        displayName: d.displayName || safePatch.displayName,
        email: d.email || '',
        role:
          String(d.email || '').trim().toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
            ? 'admin'
            : 'farmer',
        phone: d.phone || '',
        state: d.state || safePatch.state,
        district: d.district || safePatch.district,
        village: d.village || '',
        preferredLanguage: d.preferredLanguage || 'English',
        farmingExperienceYears: Number(d.farmingExperienceYears ?? 0),
        createdAt: timestampToIso(d.createdAt),
        updatedAt: timestampToIso(d.updatedAt),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  async listAllUsers(): Promise<UserProfile[]> {
    const firestore = this.requireDb();
    const path = 'users';
    try {
      const snap = await getDocs(collection(firestore, path));
      return snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          uid: d.uid,
          displayName: d.displayName,
          email: d.email,
          role: d.role === 'admin' ? 'admin' : 'farmer',
          phone: d.phone || '',
          state: d.state,
          district: d.district,
          village: d.village || '',
          preferredLanguage: d.preferredLanguage || 'English',
          farmingExperienceYears: Number(d.farmingExperienceYears ?? 0),
          createdAt: timestampToIso(d.createdAt),
          updatedAt: timestampToIso(d.updatedAt),
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async listFarms(ownerId: string, isAdmin = false): Promise<FarmPlot[]> {
    const firestore = this.requireDb();
    const path = 'farms';
    try {
      const q = isAdmin
        ? query(collection(firestore, path), orderBy('updatedAt', 'desc'))
        : query(collection(firestore, path), where('ownerId', '==', ownerId));
      const snap = await getDocs(q);
      return snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: d.id,
            ownerId: d.ownerId,
            name: d.name,
            district: d.district,
            state: d.state,
            latitude: Number(d.latitude),
            longitude: Number(d.longitude),
            areaAcres: Number(d.areaAcres),
            soilType: d.soilType,
            irrigationType: d.irrigationType,
            season: d.season,
            currentCrop: d.currentCrop || '',
            nitrogen: Number(d.nitrogen),
            phosphorus: Number(d.phosphorus),
            potassium: Number(d.potassium),
            soilPh: Number(d.soilPh),
            createdAt: timestampToIso(d.createdAt),
            updatedAt: timestampToIso(d.updatedAt),
          } as FarmPlot;
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async createFarm(
    ownerId: string,
    farm: Omit<FarmPlot, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ): Promise<FarmPlot> {
    const firestore = this.requireDb();
    const id = generateSafeId('farm');
    const path = `farms/${id}`;
    try {
      const payload = {
        id,
        ownerId,
        name: sanitizeString(farm.name, 100),
        district: sanitizeString(farm.district, 80),
        state: sanitizeString(farm.state, 80),
        latitude: clampNumber(Number(farm.latitude), -90, 90),
        longitude: clampNumber(Number(farm.longitude), -180, 180),
        areaAcres: clampNumber(Number(farm.areaAcres), 0.05, 50000),
        soilType: farm.soilType,
        irrigationType: farm.irrigationType,
        season: farm.season,
        currentCrop: sanitizeString(farm.currentCrop ?? '', 80),
        nitrogen: clampNumber(Number(farm.nitrogen), 0, 300),
        phosphorus: clampNumber(Number(farm.phosphorus), 0, 300),
        potassium: clampNumber(Number(farm.potassium), 0, 400),
        soilPh: clampNumber(Number(farm.soilPh), 3.0, 10.0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(firestore, 'farms', id), payload);
      const now = new Date().toISOString();
      return { ...payload, createdAt: now, updatedAt: now };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async updateFarm(farmId: string, updates: Partial<FarmPlot>): Promise<void> {
    const firestore = this.requireDb();
    const path = `farms/${farmId}`;
    try {
      const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (updates.name !== undefined) patch.name = sanitizeString(updates.name, 100);
      if (updates.district !== undefined) patch.district = sanitizeString(updates.district, 80);
      if (updates.state !== undefined) patch.state = sanitizeString(updates.state, 80);
      if (updates.latitude !== undefined) patch.latitude = clampNumber(Number(updates.latitude), -90, 90);
      if (updates.longitude !== undefined) patch.longitude = clampNumber(Number(updates.longitude), -180, 180);
      if (updates.areaAcres !== undefined) patch.areaAcres = clampNumber(Number(updates.areaAcres), 0.05, 50000);
      if (updates.soilType !== undefined) patch.soilType = updates.soilType;
      if (updates.irrigationType !== undefined) patch.irrigationType = updates.irrigationType;
      if (updates.season !== undefined) patch.season = updates.season;
      if (updates.currentCrop !== undefined) patch.currentCrop = sanitizeString(updates.currentCrop, 80);
      if (updates.nitrogen !== undefined) patch.nitrogen = clampNumber(Number(updates.nitrogen), 0, 300);
      if (updates.phosphorus !== undefined) patch.phosphorus = clampNumber(Number(updates.phosphorus), 0, 300);
      if (updates.potassium !== undefined) patch.potassium = clampNumber(Number(updates.potassium), 0, 400);
      if (updates.soilPh !== undefined) patch.soilPh = clampNumber(Number(updates.soilPh), 3.0, 10.0);

      await updateDoc(doc(firestore, 'farms', farmId), patch);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  async deleteFarm(farmId: string): Promise<void> {
    const firestore = this.requireDb();
    const path = `farms/${farmId}`;
    try {
      await deleteDoc(doc(firestore, 'farms', farmId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  async listAnalyses(ownerId: string, isAdmin = false): Promise<AnalysisRecord[]> {
    const firestore = this.requireDb();
    const path = 'analyses';
    try {
      const q = isAdmin
        ? query(collection(firestore, path))
        : query(collection(firestore, path), where('ownerId', '==', ownerId));
      const snap = await getDocs(q);
      return snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: d.id,
            ownerId: d.ownerId,
            farmId: d.farmId,
            farmName: d.farmName,
            moduleType: d.moduleType,
            source: d.source,
            model: d.model,
            title: d.title,
            summary: d.summary,
            severity: d.severity,
            highlights: Array.isArray(d.highlights) ? d.highlights : [],
            createdAt: timestampToIso(d.createdAt),
          } as AnalysisRecord;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async saveAnalysis(record: Omit<AnalysisRecord, 'id' | 'createdAt'>): Promise<AnalysisRecord> {
    const firestore = this.requireDb();
    const id = generateSafeId('anl');
    const path = `analyses/${id}`;
    try {
      const highlights = (record.highlights || [])
        .slice(0, 8)
        .map((h) => sanitizeString(h, 200))
        .filter(Boolean);
      const moduleType: AnalysisRecord['moduleType'] =
        record.moduleType === 'crop' ||
        record.moduleType === 'disease' ||
        record.moduleType === 'yield' ||
        record.moduleType === 'decision'
          ? record.moduleType
          : 'crop';
      const source: AnalysisRecord['source'] =
        record.source === 'LIVE_OLLAMA' ? 'LIVE_OLLAMA' : 'DEMO';
      const severity: AnalysisRecord['severity'] =
        record.severity === 'high' || record.severity === 'moderate' ? record.severity : 'normal';
      const title = sanitizeString(record.title, 160);
      const summary = sanitizeString(record.summary, 1500);
      const payload = {
        id,
        ownerId: record.ownerId,
        farmId: sanitizeString(record.farmId, 128) || 'custom',
        farmName: sanitizeString(record.farmName, 100) || 'Farm Plot',
        moduleType,
        source,
        model: sanitizeString(record.model, 80) || 'agrismart-demo',
        title: title.length >= 2 ? title : 'Field Analysis',
        summary: summary.length >= 2 ? summary : 'Agronomic analysis completed.',
        severity,
        highlights,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(firestore, 'analyses', id), payload);
      return { ...payload, createdAt: new Date().toISOString() };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async deleteAnalysis(analysisId: string): Promise<void> {
    const firestore = this.requireDb();
    const path = `analyses/${analysisId}`;
    try {
      await deleteDoc(doc(firestore, 'analyses', analysisId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  async listChatMessages(ownerId: string): Promise<ChatMessage[]> {
    const firestore = this.requireDb();
    const path = 'chatMessages';
    try {
      const q = query(collection(firestore, path), where('ownerId', '==', ownerId));
      const snap = await getDocs(q);
      return snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: d.id,
            ownerId: d.ownerId,
            farmId: d.farmId || undefined,
            sender: d.sender,
            content: d.content,
            source: d.source,
            createdAt: timestampToIso(d.createdAt),
          } as ChatMessage;
        })
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async saveChatMessage(msg: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage> {
    const firestore = this.requireDb();
    const id = generateSafeId('msg');
    const path = `chatMessages/${id}`;
    try {
      const sender: ChatMessage['sender'] = msg.sender === 'user' ? 'user' : 'assistant';
      const source: ChatMessage['source'] =
        msg.source === 'USER' || msg.source === 'LIVE_OLLAMA' || msg.source === 'DEMO'
          ? msg.source
          : sender === 'user'
            ? 'USER'
            : 'DEMO';
      const content = sanitizeString(msg.content, 4000);
      if (!content) {
        throw new Error('Cannot save an empty chat message.');
      }
      const cleanFarmId = msg.farmId ? sanitizeString(msg.farmId, 128) : '';
      const payload = {
        id,
        ownerId: msg.ownerId,
        ...(cleanFarmId ? { farmId: cleanFarmId } : {}),
        sender,
        content,
        source,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(firestore, 'chatMessages', id), payload);
      return {
        id,
        ownerId: msg.ownerId,
        ...(cleanFarmId ? { farmId: cleanFarmId } : {}),
        sender,
        content,
        source,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async clearChatMessages(ownerId: string): Promise<void> {
    const messages = await this.listChatMessages(ownerId);
    const firestore = this.requireDb();
    for (const m of messages) {
      try {
        await deleteDoc(doc(firestore, 'chatMessages', m.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `chatMessages/${m.id}`);
      }
    }
  }

  async listAdvisories(includeInactive = false): Promise<RegionalAdvisory[]> {
    const firestore = this.requireDb();
    const path = 'advisories';
    try {
      const q = includeInactive
        ? query(collection(firestore, path))
        : query(collection(firestore, path), where('active', '==', true));
      const snap = await getDocs(q);
      return snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: d.id,
            authorId: d.authorId,
            authorName: d.authorName,
            title: d.title,
            region: d.region,
            category: d.category,
            severity: d.severity,
            message: d.message,
            active: Boolean(d.active),
            createdAt: timestampToIso(d.createdAt),
            updatedAt: timestampToIso(d.updatedAt),
          } as RegionalAdvisory;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async createAdvisory(
    advisory: Omit<RegionalAdvisory, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<RegionalAdvisory> {
    const firestore = this.requireDb();
    const id = generateSafeId('adv');
    const path = `advisories/${id}`;
    try {
      const payload = {
        id,
        authorId: advisory.authorId,
        authorName: sanitizeString(advisory.authorName, 100),
        title: sanitizeString(advisory.title, 140),
        region: sanitizeString(advisory.region, 100),
        category: advisory.category,
        severity: advisory.severity,
        message: sanitizeString(advisory.message, 1200),
        active: Boolean(advisory.active),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(firestore, 'advisories', id), payload);
      const now = new Date().toISOString();
      return { ...payload, createdAt: now, updatedAt: now };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async toggleAdvisoryActive(advisoryId: string, active: boolean): Promise<void> {
    const firestore = this.requireDb();
    const path = `advisories/${advisoryId}`;
    try {
      await updateDoc(doc(firestore, 'advisories', advisoryId), {
        active,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  async deleteAdvisory(advisoryId: string): Promise<void> {
    const firestore = this.requireDb();
    const path = `advisories/${advisoryId}`;
    try {
      await deleteDoc(doc(firestore, 'advisories', advisoryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}

export const localDemoRepo = new LocalDemoRepository();
export const firestoreRepo = new FirestoreRepository();
