import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/lib/auth-store';
import {
  listOutages as appwriteListOutages,
  createOutage as appwriteCreateOutage,
  confirmOutageDoc,
  restoreOutageDoc,
  type OutageData,
} from '@/lib/appwrite';

export type OutageType = 'water' | 'electricity' | 'internet';

export interface Outage {
  id: string;
  type: OutageType;
  latitude: number;
  longitude: number;
  quartier: string;
  ville: string;
  region: string;
  date: string;
  confirmations: number;
  photoUri: string | null;
  synced: boolean;
  estRetablie: boolean;
  dateRetablissement: string | null;
}

const OUTAGES_KEY = 'outages_data';
const CONFIRMATIONS_KEY = 'user_confirmations';

const CAMEROON_REGIONS = [
  'Adamaoua', 'Centre', 'Est', 'Extrême-Nord', 'Littoral',
  'Nord', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Ouest'
];

interface OutageContextValue {
  outages: Outage[];
  addOutage: (outage: Omit<Outage, 'id' | 'confirmations' | 'synced' | 'estRetablie' | 'dateRetablissement'>) => Promise<void>;
  confirmOutage: (id: string) => Promise<boolean>;
  canConfirm: (id: string) => boolean;
  markRestored: (id: string) => Promise<void>;
  removeOutage: (id: string) => void;
  getOutagesByType: (type?: OutageType) => Outage[];
  getOutagesByRegion: (region?: string) => Outage[];
  getRecentOutages: (hours?: number) => Outage[];
  getNearbyOutages: (lat: number, lon: number, radiusKm?: number) => Outage[];
  isLoading: boolean;
  regions: string[];
  refreshOutages: () => Promise<void>;
}

const OutageContext = createContext<OutageContextValue | null>(null);

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function remoteToLocal(s: OutageData): Outage {
  return {
    id: s.id,
    type: s.type as OutageType,
    latitude: s.latitude,
    longitude: s.longitude,
    quartier: s.quartier || 'N/A',
    ville: s.ville || 'N/A',
    region: s.region || 'N/A',
    date: s.createdAt || new Date().toISOString(),
    confirmations: s.confirmations || 1,
    photoUri: s.photoUri || null,
    synced: true,
    estRetablie: s.estRetablie || false,
    dateRetablissement: s.dateRetablissement || null,
  };
}

export function OutageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [outages, setOutages] = useState<Outage[]>([]);
  const [confirmedIds, setConfirmedIds] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [outagesData, confirmData] = await Promise.all([
        AsyncStorage.getItem(OUTAGES_KEY),
        AsyncStorage.getItem(CONFIRMATIONS_KEY),
      ]);
      let localOutages: Outage[] = [];
      if (outagesData) {
        localOutages = JSON.parse(outagesData);
        setOutages(localOutages);
      }
      if (confirmData) setConfirmedIds(JSON.parse(confirmData));

      await fetchFromAppwrite(localOutages);
    } catch (e) {
      console.error('Error loading outage data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFromAppwrite = async (currentOutages?: Outage[]) => {
    try {
      const serverOutages = await appwriteListOutages();
      const mapped: Outage[] = serverOutages.map(remoteToLocal);
      const local = currentOutages || outages;
      const localIds = new Set(local.map(o => o.id));
      const updatedLocal = local.map(o => {
        const serverVersion = mapped.find(s => s.id === o.id);
        if (serverVersion) return { ...serverVersion, synced: true };
        return o;
      });
      const newFromServer = mapped.filter(o => !localIds.has(o.id));
      const merged = [...updatedLocal, ...newFromServer];
      setOutages(merged);
      await AsyncStorage.setItem(OUTAGES_KEY, JSON.stringify(merged));
    } catch (e) {
      console.log('Appwrite fetch skipped (offline mode)');
    }
  };

  const saveOutages = async (newOutages: Outage[]) => {
    setOutages(newOutages);
    await AsyncStorage.setItem(OUTAGES_KEY, JSON.stringify(newOutages));
  };

  const saveConfirmations = async (newConfirms: Record<string, string>) => {
    setConfirmedIds(newConfirms);
    await AsyncStorage.setItem(CONFIRMATIONS_KEY, JSON.stringify(newConfirms));
  };

  const addOutage = useCallback(async (outage: Omit<Outage, 'id' | 'confirmations' | 'synced' | 'estRetablie' | 'dateRetablissement'>) => {
    let newOutage: Outage;

    try {
      const created = await appwriteCreateOutage({
        type: outage.type,
        latitude: outage.latitude,
        longitude: outage.longitude,
        quartier: outage.quartier,
        ville: outage.ville,
        region: outage.region,
        photoUri: outage.photoUri,
        userId: user?.id || '',
      });
      newOutage = remoteToLocal(created);
    } catch (e) {
      const tempId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      newOutage = {
        ...outage,
        id: tempId,
        confirmations: 1,
        synced: false,
        estRetablie: false,
        dateRetablissement: null,
      };
      console.log('Created locally (offline)');
    }

    const updated = [newOutage, ...outages];
    await saveOutages(updated);
  }, [outages, user]);

  const canConfirm = useCallback((id: string): boolean => {
    const today = new Date().toDateString();
    const lastConfirm = confirmedIds[id];
    return lastConfirm !== today;
  }, [confirmedIds]);

  const confirmOutage = useCallback(async (id: string): Promise<boolean> => {
    if (!canConfirm(id)) return false;
    const today = new Date().toDateString();
    const updated = outages.map(o =>
      o.id === id ? { ...o, confirmations: o.confirmations + 1 } : o
    );
    const newConfirms = { ...confirmedIds, [id]: today };

    try {
      await confirmOutageDoc(id);
    } catch (e) {
      console.log('Confirmed locally (offline)');
    }

    await saveOutages(updated);
    await saveConfirmations(newConfirms);
    return true;
  }, [outages, confirmedIds, canConfirm]);

  const markRestored = useCallback(async (id: string) => {
    const updated = outages.map(o =>
      o.id === id ? { ...o, estRetablie: true, dateRetablissement: new Date().toISOString() } : o
    );

    try {
      await restoreOutageDoc(id);
    } catch (e) {
      console.log('Restored locally (offline)');
    }

    await saveOutages(updated);
  }, [outages]);

  const removeOutage = useCallback((id: string) => {
    setOutages(prev => prev.filter(o => o.id !== id));
  }, []);

  const refreshOutages = useCallback(async () => {
    await fetchFromAppwrite();
  }, [outages]);

  const getOutagesByType = useCallback((type?: OutageType) => {
    if (!type) return outages;
    return outages.filter(o => o.type === type);
  }, [outages]);

  const getOutagesByRegion = useCallback((region?: string) => {
    if (!region) return outages;
    return outages.filter(o => o.region === region);
  }, [outages]);

  const getRecentOutages = useCallback((hours: number = 24) => {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return outages.filter(o => new Date(o.date).getTime() > cutoff && !o.estRetablie);
  }, [outages]);

  const getNearbyOutages = useCallback((lat: number, lon: number, radiusKm: number = 20) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return outages.filter(o => {
      if (o.estRetablie) return false;
      if (new Date(o.date).getTime() < cutoff) return false;
      return getDistanceKm(lat, lon, o.latitude, o.longitude) <= radiusKm;
    });
  }, [outages]);

  const value = useMemo(() => ({
    outages,
    addOutage,
    confirmOutage,
    canConfirm,
    markRestored,
    removeOutage,
    getOutagesByType,
    getOutagesByRegion,
    getRecentOutages,
    getNearbyOutages,
    isLoading,
    regions: CAMEROON_REGIONS,
    refreshOutages,
  }), [outages, addOutage, confirmOutage, canConfirm, markRestored, removeOutage, getOutagesByType, getOutagesByRegion, getRecentOutages, getNearbyOutages, isLoading, refreshOutages]);

  return (
    <OutageContext.Provider value={value}>
      {children}
    </OutageContext.Provider>
  );
}

export function useOutages() {
  const context = useContext(OutageContext);
  if (!context) {
    throw new Error('useOutages must be used within an OutageProvider');
  }
  return context;
}
