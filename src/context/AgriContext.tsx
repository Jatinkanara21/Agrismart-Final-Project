import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  firebaseAvailable,
  googleProvider,
} from '../lib/firebase';
import { firestoreRepo, type DataRepository } from '../lib/repository';
import { apiClient } from '../lib/apiClient';
import type {
  AnalysisRecord,
  AppNavTab,
  ChatMessage,
  FarmPlot,
  RegionalAdvisory,
  SystemStatusResponse,
  UserProfile,
  WeatherReport,
} from '../types/agrismart';

function isAuthorizedAdminProfile(profile: UserProfile | null): boolean {
  if (!profile) return false;
  return (
    profile.role === 'admin' &&
    profile.email.trim().toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
  );
}

interface AgriContextValue {
  authReady: boolean;
  firebaseAvailable: boolean;
  user: UserProfile | null;
  isAdmin: boolean;
  authError: string | null;
  activeTab: AppNavTab;
  setActiveTab: (tab: AppNavTab) => void;
  farms: FarmPlot[];
  activeFarm: FarmPlot | null;
  setActiveFarmId: (farmId: string) => void;
  analyses: AnalysisRecord[];
  chatMessages: ChatMessage[];
  advisories: RegionalAdvisory[];
  allUsers: UserProfile[];
  allFarms: FarmPlot[];
  allAnalyses: AnalysisRecord[];
  weather: WeatherReport | null;
  weatherLoading: boolean;
  weatherError: string | null;
  systemStatus: SystemStatusResponse | null;
  dataLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
  refreshWeather: (lat?: number, lon?: number, label?: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  createFarm: (farm: Omit<FarmPlot, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<FarmPlot>;
  updateFarm: (farmId: string, updates: Partial<FarmPlot>) => Promise<void>;
  deleteFarm: (farmId: string) => Promise<void>;
  saveAnalysis: (record: Omit<AnalysisRecord, 'id' | 'ownerId' | 'createdAt'>) => Promise<AnalysisRecord>;
  deleteAnalysis: (analysisId: string) => Promise<void>;
  saveChatTurn: (msg: Omit<ChatMessage, 'id' | 'ownerId' | 'createdAt'>) => Promise<ChatMessage>;
  clearChat: () => Promise<void>;
  createAdvisory: (
    advisory: Omit<RegionalAdvisory, 'id' | 'authorId' | 'authorName' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  toggleAdvisory: (advisoryId: string, active: boolean) => Promise<void>;
  deleteAdvisory: (advisoryId: string) => Promise<void>;
}

const AgriContext = createContext<AgriContextValue | null>(null);

export function AgriProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTabState, setActiveTabState] = useState<AppNavTab>('overview');

  const [farms, setFarms] = useState<FarmPlot[]>([]);
  const [activeFarmId, setActiveFarmId] = useState<string>('');
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [advisories, setAdvisories] = useState<RegionalAdvisory[]>([]);

  // Admin collections (only populated for verified admin jatinkanara2006@gmail.com)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allFarms, setAllFarms] = useState<FarmPlot[]>([]);
  const [allAnalyses, setAllAnalyses] = useState<AnalysisRecord[]>([]);

  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  const repo: DataRepository = firestoreRepo;
  const isAdmin = useMemo(() => isAuthorizedAdminProfile(user), [user]);

  const setActiveTab = useCallback(
    (tab: AppNavTab) => {
      if (tab.startsWith('admin-') && !isAuthorizedAdminProfile(user)) {
        setActiveTabState('overview');
        return;
      }
      setActiveTabState(tab);
    },
    [user]
  );

  const activeFarm = useMemo(() => {
    if (!farms.length) return null;
    return farms.find((f) => f.id === activeFarmId) || farms[0];
  }, [farms, activeFarmId]);

  const loadSystemStatus = useCallback(async () => {
    try {
      const status = await apiClient.getStatus();
      setSystemStatus(status);
    } catch {
      // Ignore transient status fetch failure
    }
  }, []);

  const refreshWeather = useCallback(
    async (lat?: number, lon?: number, label?: string) => {
      const targetLat = lat ?? activeFarm?.latitude ?? 22.5645;
      const targetLon = lon ?? activeFarm?.longitude ?? 72.9289;
      const targetLabel =
        label ?? (activeFarm ? `${activeFarm.district}, ${activeFarm.state}` : 'Anand, Gujarat');

      setWeatherLoading(true);
      setWeatherError(null);
      try {
        const report = await apiClient.getWeather(targetLat, targetLon, targetLabel);
        setWeather(report);
      } catch (err) {
        setWeatherError(err instanceof Error ? err.message : 'Unable to fetch weather forecast.');
      } finally {
        setWeatherLoading(false);
      }
    },
    [activeFarm]
  );

  const hydrateWorkspace = useCallback(
    async (profile: UserProfile, targetRepo: DataRepository) => {
      setDataLoading(true);
      try {
        const authorizedAdmin = isAuthorizedAdminProfile(profile);
        const [userFarms, userAnalyses, userChats, activeAdvisories] = await Promise.all([
          targetRepo.listFarms(profile.uid, false),
          targetRepo.listAnalyses(profile.uid, false),
          targetRepo.listChatMessages(profile.uid),
          targetRepo.listAdvisories(authorizedAdmin),
        ]);

        // Ensure first-time farmers start with one default editable farm plot
        let resolvedFarms = userFarms;
        if (resolvedFarms.length === 0 && !authorizedAdmin) {
          const starter = await targetRepo.createFarm(profile.uid, {
            name: 'Home Farm Plot',
            district: profile.district || 'Anand',
            state: profile.state || 'Gujarat',
            latitude: 22.5645,
            longitude: 72.9289,
            areaAcres: 3.0,
            soilType: 'Alluvial',
            irrigationType: 'Canal',
            season: 'Kharif',
            currentCrop: 'Basmati Paddy (Rice)',
            nitrogen: 78,
            phosphorus: 40,
            potassium: 52,
            soilPh: 7.0,
          });
          resolvedFarms = [starter];
        }

        setFarms(resolvedFarms);
        setActiveFarmId((prev) =>
          resolvedFarms.some((f) => f.id === prev) ? prev : resolvedFarms[0]?.id || ''
        );
        setAnalyses(userAnalyses);
        setChatMessages(userChats);
        setAdvisories(activeAdvisories);

        if (authorizedAdmin) {
          const [usersList, farmsList, analysesList] = await Promise.all([
            targetRepo.listAllUsers().catch(() => [profile]),
            targetRepo.listFarms(profile.uid, true).catch(() => resolvedFarms),
            targetRepo.listAnalyses(profile.uid, true).catch(() => userAnalyses),
          ]);
          setAllUsers(usersList);
          setAllFarms(farmsList);
          setAllAnalyses(analysesList);
        } else {
          setAllUsers([]);
          setAllFarms([]);
          setAllAnalyses([]);
        }
      } finally {
        setDataLoading(false);
      }
    },
    []
  );

  // Load server status on mount
  useEffect(() => {
    void loadSystemStatus();
  }, [loadSystemStatus]);

  // Listen strictly to Firebase Auth state (no local demo sandbox bypass)
  useEffect(() => {
    let active = true;

    if (!firebaseAvailable || !auth) {
      setAuthReady(true);
      return () => {
        active = false;
      };
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!active) return;
      if (fbUser) {
        try {
          setAuthError(null);
          const profile = await firestoreRepo.getOrCreateUserProfile(fbUser.uid, {
            displayName: fbUser.displayName || 'Farmer',
            email: fbUser.email || '',
          });
          if (!active) return;
          setUser(profile);
          setActiveTabState(isAuthorizedAdminProfile(profile) ? 'admin-overview' : 'overview');
          await hydrateWorkspace(profile, firestoreRepo);
        } catch (err) {
          setAuthError(
            err instanceof Error
              ? err.message
              : 'Could not load your Firebase profile. Please try signing in again.'
          );
        } finally {
          if (active) setAuthReady(true);
        }
      } else {
        setUser(null);
        setFarms([]);
        setAnalyses([]);
        setChatMessages([]);
        setAdvisories([]);
        setAllUsers([]);
        setAllFarms([]);
        setAllAnalyses([]);
        setActiveTabState('overview');
        setAuthReady(true);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [hydrateWorkspace]);

  // Auto-load weather when active farm changes
  useEffect(() => {
    if (user && activeFarm) {
      void refreshWeather(
        activeFarm.latitude,
        activeFarm.longitude,
        `${activeFarm.district}, ${activeFarm.state}`
      );
    } else if (user && !activeFarm && !weather) {
      void refreshWeather(22.5645, 72.9289, `${user.district || 'Anand'}, ${user.state || 'Gujarat'}`);
    }
  }, [user, activeFarm?.id]);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) {
      setAuthError('Firebase Auth is not configured in this environment.');
      return;
    }
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google Sign-In failed.';
      if (message.includes('popup-closed-by-user')) {
        setAuthError('Sign-in window was closed. Please try signing in again.');
      } else {
        setAuthError(`Google Sign-In could not complete (${message}).`);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    if (auth?.currentUser) {
      await signOut(auth).catch(() => {});
    }
    setUser(null);
    setFarms([]);
    setAnalyses([]);
    setChatMessages([]);
    setAdvisories([]);
    setAllUsers([]);
    setAllFarms([]);
    setAllAnalyses([]);
    setActiveTabState('overview');
  }, []);

  const refreshData = useCallback(async () => {
    if (!user) return;
    await hydrateWorkspace(user, repo);
  }, [user, repo, hydrateWorkspace]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!user) return;
      const updated = await repo.updateUserProfile(user.uid, updates);
      setUser(updated);
    },
    [user, repo]
  );

  const createFarm = useCallback(
    async (farm: Omit<FarmPlot, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
      if (!user) throw new Error('Sign in required.');
      const created = await repo.createFarm(user.uid, farm);
      setFarms((prev) => [created, ...prev]);
      setActiveFarmId(created.id);
      if (isAuthorizedAdminProfile(user)) {
        setAllFarms((prev) => [created, ...prev]);
      }
      return created;
    },
    [user, repo]
  );

  const updateFarm = useCallback(
    async (farmId: string, updates: Partial<FarmPlot>) => {
      await repo.updateFarm(farmId, updates);
      setFarms((prev) =>
        prev.map((f) => (f.id === farmId ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f))
      );
    },
    [repo]
  );

  const deleteFarm = useCallback(
    async (farmId: string) => {
      await repo.deleteFarm(farmId);
      setFarms((prev) => {
        const next = prev.filter((f) => f.id !== farmId);
        if (activeFarmId === farmId) {
          setActiveFarmId(next[0]?.id || '');
        }
        return next;
      });
    },
    [repo, activeFarmId]
  );

  const saveAnalysis = useCallback(
    async (record: Omit<AnalysisRecord, 'id' | 'ownerId' | 'createdAt'>) => {
      if (!user) throw new Error('Sign in required.');
      const created = await repo.saveAnalysis({ ...record, ownerId: user.uid });
      setAnalyses((prev) => [created, ...prev]);
      if (isAuthorizedAdminProfile(user)) {
        setAllAnalyses((prev) => [created, ...prev]);
      }
      return created;
    },
    [user, repo]
  );

  const deleteAnalysis = useCallback(
    async (analysisId: string) => {
      await repo.deleteAnalysis(analysisId);
      setAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
      setAllAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
    },
    [repo]
  );

  const saveChatTurn = useCallback(
    async (msg: Omit<ChatMessage, 'id' | 'ownerId' | 'createdAt'>) => {
      if (!user) throw new Error('Sign in required.');
      const created = await repo.saveChatMessage({ ...msg, ownerId: user.uid });
      setChatMessages((prev) => [...prev, created]);
      return created;
    },
    [user, repo]
  );

  const clearChat = useCallback(async () => {
    if (!user) return;
    await repo.clearChatMessages(user.uid);
    setChatMessages([]);
  }, [user, repo]);

  const createAdvisory = useCallback(
    async (
      advisory: Omit<RegionalAdvisory, 'id' | 'authorId' | 'authorName' | 'createdAt' | 'updatedAt'>
    ) => {
      if (!isAuthorizedAdminProfile(user) || !user) {
        throw new Error('Administrator access required.');
      }
      const created = await repo.createAdvisory({
        ...advisory,
        authorId: user.uid,
        authorName: user.displayName,
      });
      setAdvisories((prev) => [created, ...prev]);
    },
    [user, repo]
  );

  const toggleAdvisory = useCallback(
    async (advisoryId: string, active: boolean) => {
      if (!isAuthorizedAdminProfile(user)) {
        throw new Error('Administrator access required.');
      }
      await repo.toggleAdvisoryActive(advisoryId, active);
      setAdvisories((prev) => prev.map((a) => (a.id === advisoryId ? { ...a, active } : a)));
    },
    [user, repo]
  );

  const deleteAdvisory = useCallback(
    async (advisoryId: string) => {
      if (!isAuthorizedAdminProfile(user)) {
        throw new Error('Administrator access required.');
      }
      await repo.deleteAdvisory(advisoryId);
      setAdvisories((prev) => prev.filter((a) => a.id !== advisoryId));
    },
    [user, repo]
  );

  const value: AgriContextValue = {
    authReady,
    firebaseAvailable,
    user,
    isAdmin,
    authError,
    activeTab: activeTabState,
    setActiveTab,
    farms,
    activeFarm,
    setActiveFarmId,
    analyses,
    chatMessages,
    advisories,
    allUsers,
    allFarms,
    allAnalyses,
    weather,
    weatherLoading,
    weatherError,
    systemStatus,
    dataLoading,
    signInWithGoogle,
    logout,
    refreshData,
    refreshWeather,
    updateProfile,
    createFarm,
    updateFarm,
    deleteFarm,
    saveAnalysis,
    deleteAnalysis,
    saveChatTurn,
    clearChat,
    createAdvisory,
    toggleAdvisory,
    deleteAdvisory,
  };

  return <AgriContext.Provider value={value}>{children}</AgriContext.Provider>;
}

export function useAgri() {
  const ctx = useContext(AgriContext);
  if (!ctx) throw new Error('useAgri must be used within AgriProvider');
  return ctx;
}
