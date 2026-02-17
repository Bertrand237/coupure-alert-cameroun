import { Client, Account, Databases, ID, Query, Permission, Role } from 'appwrite';

const ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '';
const DB_ID = process.env.EXPO_PUBLIC_APPWRITE_DB_ID || '6994aa87003b4207080f';
const OUTAGES_COLLECTION = 'outages';
const USERS_COLLECTION = 'users';

const client = new Client();
client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);

function phoneToEmail(phone: string): string {
  return `${phone}@coupurealert.app`;
}

export interface UserProfile {
  id: string;
  phone: string;
  displayName: string;
  isAdmin: boolean;
}

export interface OutageData {
  id: string;
  type: string;
  latitude: number;
  longitude: number;
  quartier: string;
  ville: string;
  region: string;
  confirmations: number;
  photoUri: string | null;
  estRetablie: boolean;
  dateRetablissement: string | null;
  createdAt: string;
  userId?: string;
}

function docToOutage(doc: any): OutageData {
  return {
    id: doc.$id,
    type: doc.type,
    latitude: doc.latitude,
    longitude: doc.longitude,
    quartier: doc.quartier || 'N/A',
    ville: doc.ville || 'N/A',
    region: doc.region || 'N/A',
    confirmations: doc.confirmations ?? 1,
    photoUri: doc.photoUri || null,
    estRetablie: doc.estRetablie ?? false,
    dateRetablissement: doc.dateRetablissement || null,
    createdAt: doc.createdAt || doc.$createdAt,
    userId: doc.userId || '',
  };
}

export async function registerUser(phone: string, password: string, displayName?: string): Promise<UserProfile> {
  const email = phoneToEmail(phone);

  const existing = await databases.listDocuments(DB_ID, USERS_COLLECTION, [
    Query.equal('phone', phone),
    Query.limit(1),
  ]);
  if (existing.documents.length > 0) {
    throw new Error('Ce numéro est déjà utilisé');
  }

  const authUser = await account.create(ID.unique(), email, password, displayName || phone);

  await account.createEmailPasswordSession(email, password);

  const profileDoc = await databases.createDocument(DB_ID, USERS_COLLECTION, authUser.$id, {
    phone,
    displayName: displayName || '',
    createdAt: new Date().toISOString(),
    isAdmin: false,
  }, [
    Permission.read(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ]);

  return {
    id: authUser.$id,
    phone,
    displayName: displayName || '',
    isAdmin: false,
  };
}

export async function loginUser(phone: string, password: string): Promise<UserProfile> {
  const email = phoneToEmail(phone);

  try {
    await account.deleteSession('current');
  } catch {}

  await account.createEmailPasswordSession(email, password);

  const profile = await databases.listDocuments(DB_ID, USERS_COLLECTION, [
    Query.equal('phone', phone),
    Query.limit(1),
  ]);

  if (profile.documents.length > 0) {
    const doc = profile.documents[0];
    return {
      id: doc.$id,
      phone: doc.phone,
      displayName: doc.displayName || '',
      isAdmin: doc.isAdmin ?? false,
    };
  }

  const authUser = await account.get();
  return {
    id: authUser.$id,
    phone,
    displayName: authUser.name || '',
    isAdmin: false,
  };
}

export async function logoutUser(): Promise<void> {
  try {
    await account.deleteSession('current');
  } catch {}
}

export async function getCurrentSession(): Promise<UserProfile | null> {
  try {
    const authUser = await account.get();
    const profile = await databases.listDocuments(DB_ID, USERS_COLLECTION, [
      Query.equal('phone', authUser.email.replace('@coupurealert.app', '')),
      Query.limit(1),
    ]);
    if (profile.documents.length > 0) {
      const doc = profile.documents[0];
      return {
        id: doc.$id,
        phone: doc.phone,
        displayName: doc.displayName || '',
        isAdmin: doc.isAdmin ?? false,
      };
    }
    return {
      id: authUser.$id,
      phone: authUser.email.replace('@coupurealert.app', ''),
      displayName: authUser.name || '',
      isAdmin: false,
    };
  } catch {
    return null;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const doc = await databases.getDocument(DB_ID, USERS_COLLECTION, userId);
    return {
      id: doc.$id,
      phone: doc.phone,
      displayName: doc.displayName || '',
      isAdmin: doc.isAdmin ?? false,
    };
  } catch {
    return null;
  }
}

export async function listOutages(filters?: { type?: string; region?: string; ville?: string; hours?: string }): Promise<OutageData[]> {
  const queries: string[] = [Query.orderDesc('createdAt'), Query.limit(200)];

  if (filters?.type) queries.push(Query.equal('type', filters.type));
  if (filters?.region) queries.push(Query.equal('region', filters.region));
  if (filters?.ville) queries.push(Query.equal('ville', filters.ville));
  if (filters?.hours) {
    const cutoff = new Date(Date.now() - parseInt(filters.hours) * 3600000).toISOString();
    queries.push(Query.greaterThan('createdAt', cutoff));
  }

  const result = await databases.listDocuments(DB_ID, OUTAGES_COLLECTION, queries);
  return result.documents.map(docToOutage);
}

export async function createOutage(data: {
  type: string;
  latitude: number;
  longitude: number;
  quartier?: string;
  ville?: string;
  region?: string;
  photoUri?: string | null;
  userId?: string;
}): Promise<OutageData> {
  const doc = await databases.createDocument(DB_ID, OUTAGES_COLLECTION, ID.unique(), {
    type: data.type,
    latitude: data.latitude,
    longitude: data.longitude,
    quartier: data.quartier || 'N/A',
    ville: data.ville || 'N/A',
    region: data.region || 'N/A',
    confirmations: 1,
    photoUri: data.photoUri || null,
    estRetablie: false,
    dateRetablissement: null,
    createdAt: new Date().toISOString(),
    userId: data.userId || '',
  }, [
    Permission.read(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ]);
  return docToOutage(doc);
}

export async function confirmOutageDoc(id: string): Promise<OutageData> {
  const doc = await databases.getDocument(DB_ID, OUTAGES_COLLECTION, id);
  const updated = await databases.updateDocument(DB_ID, OUTAGES_COLLECTION, id, {
    confirmations: (doc.confirmations ?? 1) + 1,
  });
  return docToOutage(updated);
}

export async function restoreOutageDoc(id: string): Promise<OutageData> {
  const updated = await databases.updateDocument(DB_ID, OUTAGES_COLLECTION, id, {
    estRetablie: true,
    dateRetablissement: new Date().toISOString(),
  });
  return docToOutage(updated);
}

export async function deleteOutageDoc(id: string): Promise<void> {
  await databases.deleteDocument(DB_ID, OUTAGES_COLLECTION, id);
}

export async function updateOutageDoc(id: string, data: Record<string, any>): Promise<OutageData> {
  const updated = await databases.updateDocument(DB_ID, OUTAGES_COLLECTION, id, data);
  return docToOutage(updated);
}

export async function getOutageStats() {
  const allDocs: any[] = [];
  let offset = 0;
  const batchSize = 100;

  while (true) {
    const result = await databases.listDocuments(DB_ID, OUTAGES_COLLECTION, [
      Query.limit(batchSize),
      Query.offset(offset),
    ]);
    allDocs.push(...result.documents);
    if (result.documents.length < batchSize) break;
    offset += batchSize;
  }

  const total = allDocs.length;
  const active = allDocs.filter(o => !o.estRetablie).length;
  const restored = allDocs.filter(o => o.estRetablie).length;
  const byType = {
    water: allDocs.filter(o => o.type === 'water').length,
    electricity: allDocs.filter(o => o.type === 'electricity').length,
    internet: allDocs.filter(o => o.type === 'internet').length,
  };
  const byRegion: Record<string, number> = {};
  allDocs.forEach(o => {
    const r = o.region || 'N/A';
    byRegion[r] = (byRegion[r] || 0) + 1;
  });

  return { total, active, restored, byType, byRegion, outages: allDocs.map(docToOutage) };
}

export async function listAllUsers(): Promise<UserProfile[]> {
  const allUsers: any[] = [];
  let offset = 0;
  const batchSize = 100;
  while (true) {
    const result = await databases.listDocuments(DB_ID, USERS_COLLECTION, [
      Query.limit(batchSize),
      Query.offset(offset),
      Query.orderDesc('$createdAt'),
    ]);
    allUsers.push(...result.documents);
    if (result.documents.length < batchSize) break;
    offset += batchSize;
  }
  return allUsers.map(u => ({
    id: u.$id,
    phone: u.phone,
    displayName: u.displayName || '',
    isAdmin: u.isAdmin ?? false,
  }));
}

export async function deleteUserDoc(id: string): Promise<void> {
  await databases.deleteDocument(DB_ID, USERS_COLLECTION, id);
}

export async function setUserAdminStatus(id: string, isAdmin: boolean): Promise<UserProfile> {
  const doc = await databases.updateDocument(DB_ID, USERS_COLLECTION, id, { isAdmin });
  return {
    id: doc.$id,
    phone: doc.phone,
    displayName: doc.displayName || '',
    isAdmin: doc.isAdmin ?? false,
  };
}
