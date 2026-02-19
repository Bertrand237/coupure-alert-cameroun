import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/lib/auth-store';
import {
  listIncidents as appwriteListIncidents,
  createIncident as appwriteCreateIncident,
  confirmIncidentDoc,
  resolveIncidentDoc,
  type IncidentData,
} from '@/lib/appwrite';

export type IncidentType = 'broken_pipe' | 'fallen_pole' | 'cable_on_ground' | 'other';

export interface Incident {
  id: string;
  incidentType: IncidentType;
  latitude: number;
  longitude: number;
  quartier: string;
  ville: string;
  region: string;
  date: string;
  confirmations: number;
  photoUri: string | null;
  commentaire: string;
  synced: boolean;
  estResolue: boolean;
  dateResolution: string | null;
}

const INCIDENTS_KEY = 'incidents_data';
const INCIDENT_CONFIRMATIONS_KEY = 'incident_confirmations';

interface IncidentContextValue {
  incidents: Incident[];
  addIncident: (incident: Omit<Incident, 'id' | 'confirmations' | 'synced' | 'estResolue' | 'dateResolution'>) => Promise<void>;
  confirmIncident: (id: string) => Promise<boolean>;
  canConfirmIncident: (id: string) => boolean;
  markResolved: (id: string) => Promise<void>;
  getIncidentsByType: (type?: IncidentType) => Incident[];
  getIncidentsByRegion: (region?: string) => Incident[];
  getRecentIncidents: (hours?: number) => Incident[];
  getNearbyIncidents: (lat: number, lon: number, radiusKm?: number) => Incident[];
  isLoading: boolean;
  refreshIncidents: () => Promise<void>;
}

const IncidentContext = createContext<IncidentContextValue | null>(null);

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

function remoteToLocal(s: IncidentData): Incident {
  return {
    id: s.id,
    incidentType: s.incidentType as IncidentType,
    latitude: s.latitude,
    longitude: s.longitude,
    quartier: s.quartier || 'N/A',
    ville: s.ville || 'N/A',
    region: s.region || 'N/A',
    date: s.createdAt || new Date().toISOString(),
    confirmations: s.confirmations || 1,
    photoUri: s.photoUri || null,
    commentaire: s.commentaire || '',
    synced: true,
    estResolue: s.estResolue || false,
    dateResolution: s.dateResolution || null,
  };
}

export function IncidentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [confirmedIds, setConfirmedIds] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [incidentsData, confirmData] = await Promise.all([
        AsyncStorage.getItem(INCIDENTS_KEY),
        AsyncStorage.getItem(INCIDENT_CONFIRMATIONS_KEY),
      ]);
      let localIncidents: Incident[] = [];
      if (incidentsData) {
        localIncidents = JSON.parse(incidentsData);
        setIncidents(localIncidents);
      }
      if (confirmData) setConfirmedIds(JSON.parse(confirmData));
      await fetchFromAppwrite(localIncidents);
    } catch (e) {
      console.error('Error loading incident data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFromAppwrite = async (currentIncidents?: Incident[]) => {
    try {
      const serverIncidents = await appwriteListIncidents();
      const mapped: Incident[] = serverIncidents.map(remoteToLocal);
      const local = currentIncidents || incidents;
      const localIds = new Set(local.map(o => o.id));
      const updatedLocal = local.map(o => {
        const serverVersion = mapped.find(s => s.id === o.id);
        if (serverVersion) return { ...serverVersion, synced: true };
        return o;
      });
      const newFromServer = mapped.filter(o => !localIds.has(o.id));
      const merged = [...updatedLocal, ...newFromServer];
      setIncidents(merged);
      await AsyncStorage.setItem(INCIDENTS_KEY, JSON.stringify(merged));
    } catch (e) {
      console.log('Appwrite incident fetch skipped (offline mode)');
    }
  };

  const saveIncidents = async (newIncidents: Incident[]) => {
    setIncidents(newIncidents);
    await AsyncStorage.setItem(INCIDENTS_KEY, JSON.stringify(newIncidents));
  };

  const saveConfirmations = async (newConfirms: Record<string, string>) => {
    setConfirmedIds(newConfirms);
    await AsyncStorage.setItem(INCIDENT_CONFIRMATIONS_KEY, JSON.stringify(newConfirms));
  };

  const addIncident = useCallback(async (incident: Omit<Incident, 'id' | 'confirmations' | 'synced' | 'estResolue' | 'dateResolution'>) => {
    let newIncident: Incident;
    try {
      const created = await appwriteCreateIncident({
        incidentType: incident.incidentType,
        latitude: incident.latitude,
        longitude: incident.longitude,
        quartier: incident.quartier,
        ville: incident.ville,
        region: incident.region,
        photoUri: incident.photoUri,
        commentaire: incident.commentaire,
        userId: user?.id || '',
      });
      newIncident = remoteToLocal(created);
    } catch (e) {
      const tempId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      newIncident = {
        ...incident,
        id: tempId,
        confirmations: 1,
        synced: false,
        estResolue: false,
        dateResolution: null,
      };
    }
    const updated = [newIncident, ...incidents];
    await saveIncidents(updated);
  }, [incidents, user]);

  const canConfirmIncident = useCallback((id: string): boolean => {
    const today = new Date().toDateString();
    return confirmedIds[id] !== today;
  }, [confirmedIds]);

  const confirmIncident = useCallback(async (id: string): Promise<boolean> => {
    if (!canConfirmIncident(id)) return false;
    const today = new Date().toDateString();
    const updated = incidents.map(o =>
      o.id === id ? { ...o, confirmations: o.confirmations + 1 } : o
    );
    const newConfirms = { ...confirmedIds, [id]: today };
    try { await confirmIncidentDoc(id); } catch {}
    await saveIncidents(updated);
    await saveConfirmations(newConfirms);
    return true;
  }, [incidents, confirmedIds, canConfirmIncident]);

  const markResolved = useCallback(async (id: string) => {
    const updated = incidents.map(o =>
      o.id === id ? { ...o, estResolue: true, dateResolution: new Date().toISOString() } : o
    );
    try { await resolveIncidentDoc(id); } catch {}
    await saveIncidents(updated);
  }, [incidents]);

  const refreshIncidents = useCallback(async () => {
    await fetchFromAppwrite();
  }, [incidents]);

  const getIncidentsByType = useCallback((type?: IncidentType) => {
    if (!type) return incidents;
    return incidents.filter(o => o.incidentType === type);
  }, [incidents]);

  const getIncidentsByRegion = useCallback((region?: string) => {
    if (!region) return incidents;
    return incidents.filter(o => o.region === region);
  }, [incidents]);

  const getRecentIncidents = useCallback((hours: number = 24) => {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return incidents.filter(o => new Date(o.date).getTime() > cutoff && !o.estResolue);
  }, [incidents]);

  const getNearbyIncidents = useCallback((lat: number, lon: number, radiusKm: number = 20) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return incidents.filter(o => {
      if (o.estResolue) return false;
      if (new Date(o.date).getTime() < cutoff) return false;
      return getDistanceKm(lat, lon, o.latitude, o.longitude) <= radiusKm;
    });
  }, [incidents]);

  const value = useMemo(() => ({
    incidents,
    addIncident,
    confirmIncident,
    canConfirmIncident,
    markResolved,
    getIncidentsByType,
    getIncidentsByRegion,
    getRecentIncidents,
    getNearbyIncidents,
    isLoading,
    refreshIncidents,
  }), [incidents, addIncident, confirmIncident, canConfirmIncident, markResolved, getIncidentsByType, getIncidentsByRegion, getRecentIncidents, getNearbyIncidents, isLoading, refreshIncidents]);

  return (
    <IncidentContext.Provider value={value}>
      {children}
    </IncidentContext.Provider>
  );
}

export function useIncidents() {
  const context = useContext(IncidentContext);
  if (!context) {
    throw new Error('useIncidents must be used within an IncidentProvider');
  }
  return context;
}
