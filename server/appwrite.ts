import { Client, Databases, ID, Query, Users } from 'node-appwrite';

const DB_ID = '6994aa87003b4207080f';
const COLLECTION_ID = 'outages';
const USERS_COLLECTION = 'users';

const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const usersApi = new Users(client);

export interface OutageDoc {
  $id: string;
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
}

function docToOutage(doc: any) {
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
  };
}

export async function listOutages(filters?: { type?: string; region?: string; hours?: string }) {
  const queries: string[] = [Query.orderDesc('createdAt'), Query.limit(200)];

  if (filters?.type) queries.push(Query.equal('type', filters.type));
  if (filters?.region) queries.push(Query.equal('region', filters.region));
  if (filters?.hours) {
    const cutoff = new Date(Date.now() - parseInt(filters.hours) * 3600000).toISOString();
    queries.push(Query.greaterThan('createdAt', cutoff));
  }

  const result = await databases.listDocuments(DB_ID, COLLECTION_ID, queries);
  return result.documents.map(docToOutage);
}

export async function getOutage(id: string) {
  const doc = await databases.getDocument(DB_ID, COLLECTION_ID, id);
  return docToOutage(doc);
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
}) {
  const doc = await databases.createDocument(DB_ID, COLLECTION_ID, ID.unique(), {
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
  });
  return docToOutage(doc);
}

export async function batchCreateOutages(items: any[]) {
  let created = 0;
  for (const item of items) {
    try {
      const docId = item.id && item.id.length <= 36 ? item.id : ID.unique();
      await databases.createDocument(DB_ID, COLLECTION_ID, docId, {
        type: item.type,
        latitude: item.latitude,
        longitude: item.longitude,
        quartier: item.quartier || 'N/A',
        ville: item.ville || 'N/A',
        region: item.region || 'N/A',
        confirmations: item.confirmations || 1,
        photoUri: item.photoUri || null,
        estRetablie: item.estRetablie || false,
        dateRetablissement: item.dateRetablissement || null,
        createdAt: item.date || item.createdAt || new Date().toISOString(),
      });
      created++;
    } catch {
    }
  }
  return created;
}

export async function confirmOutage(id: string) {
  const doc = await databases.getDocument(DB_ID, COLLECTION_ID, id);
  const updated = await databases.updateDocument(DB_ID, COLLECTION_ID, id, {
    confirmations: (doc.confirmations ?? 1) + 1,
  });
  return docToOutage(updated);
}

export async function restoreOutage(id: string) {
  const updated = await databases.updateDocument(DB_ID, COLLECTION_ID, id, {
    estRetablie: true,
    dateRetablissement: new Date().toISOString(),
  });
  return docToOutage(updated);
}

export async function getStats() {
  const allDocs: any[] = [];
  let offset = 0;
  const batchSize = 100;

  while (true) {
    const result = await databases.listDocuments(DB_ID, COLLECTION_ID, [
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

  return { total, active, restored, byType, byRegion };
}

export async function deleteOutage(id: string) {
  await databases.deleteDocument(DB_ID, COLLECTION_ID, id);
}

export async function updateOutage(id: string, data: Partial<{ type: string; quartier: string; ville: string; region: string; estRetablie: boolean; dateRetablissement: string | null }>) {
  const updated = await databases.updateDocument(DB_ID, COLLECTION_ID, id, data);
  return docToOutage(updated);
}

export async function listAllUsers() {
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
    createdAt: u.createdAt || u.$createdAt,
  }));
}

export async function deleteUser(id: string) {
  await databases.deleteDocument(DB_ID, USERS_COLLECTION, id);
}

export async function setUserAdmin(id: string, isAdmin: boolean) {
  const doc = await databases.updateDocument(DB_ID, USERS_COLLECTION, id, { isAdmin });
  return { id: doc.$id, phone: doc.phone, displayName: doc.displayName || '', isAdmin: doc.isAdmin ?? false };
}

export async function registerUser(phone: string, password: string, displayName?: string) {
  const existing = await databases.listDocuments(DB_ID, USERS_COLLECTION, [
    Query.equal('phone', phone),
    Query.limit(1),
  ]);
  if (existing.documents.length > 0) {
    throw { code: 409, message: 'Ce numéro est déjà utilisé' };
  }

  const email = `${phone}@coupurealert.app`;
  const authUser = await usersApi.create(ID.unique(), email, undefined, password, displayName || phone);
  await usersApi.updateEmailVerification(authUser.$id, true);

  const doc = await databases.createDocument(DB_ID, USERS_COLLECTION, authUser.$id, {
    phone,
    displayName: displayName || '',
    createdAt: new Date().toISOString(),
    isAdmin: false,
  });

  return { id: doc.$id, phone: doc.phone, displayName: doc.displayName || '', isAdmin: false };
}

export async function loginUser(phone: string, password: string) {
  const email = `${phone}@coupurealert.app`;

  try {
    const userList = await usersApi.list([Query.equal('email', email), Query.limit(1)]);
    if (userList.total === 0) {
      throw { code: 401, message: 'Numéro ou mot de passe incorrect' };
    }
  } catch (e: any) {
    if (e?.code === 401) throw e;
    throw { code: 401, message: 'Numéro ou mot de passe incorrect' };
  }

  const result = await databases.listDocuments(DB_ID, USERS_COLLECTION, [
    Query.equal('phone', phone),
    Query.limit(1),
  ]);

  if (result.documents.length === 0) {
    throw { code: 401, message: 'Numéro ou mot de passe incorrect' };
  }

  const user = result.documents[0];
  return { id: user.$id, phone: user.phone, displayName: user.displayName || '', isAdmin: user.isAdmin ?? false };
}

export async function getUserById(id: string) {
  const doc = await databases.getDocument(DB_ID, USERS_COLLECTION, id);
  return { id: doc.$id, phone: doc.phone, displayName: doc.displayName || '', isAdmin: doc.isAdmin ?? false };
}

export async function getUserOutages(userId: string) {
  const result = await databases.listDocuments(DB_ID, COLLECTION_ID, [
    Query.equal('userId', userId),
    Query.orderDesc('createdAt'),
    Query.limit(100),
  ]);
  return result.documents.map(docToOutage);
}

const INCIDENTS_COLLECTION = 'incidents';

function docToIncident(doc: any) {
  return {
    id: doc.$id,
    incidentType: doc.incidentType,
    latitude: doc.latitude,
    longitude: doc.longitude,
    quartier: doc.quartier || 'N/A',
    ville: doc.ville || 'N/A',
    region: doc.region || 'N/A',
    confirmations: doc.confirmations ?? 1,
    photoUri: doc.photoUri || null,
    commentaire: doc.commentaire || '',
    estResolue: doc.estResolue ?? false,
    dateResolution: doc.dateResolution || null,
    createdAt: doc.createdAt || doc.$createdAt,
    userId: doc.userId || '',
  };
}

export async function listIncidents(filters?: { type?: string; region?: string; hours?: string }) {
  const queries: string[] = [Query.orderDesc('createdAt'), Query.limit(200)];

  if (filters?.type) queries.push(Query.equal('incidentType', filters.type));
  if (filters?.region) queries.push(Query.equal('region', filters.region));
  if (filters?.hours) {
    const cutoff = new Date(Date.now() - parseInt(filters.hours) * 3600000).toISOString();
    queries.push(Query.greaterThan('createdAt', cutoff));
  }

  const result = await databases.listDocuments(DB_ID, INCIDENTS_COLLECTION, queries);
  return result.documents.map(docToIncident);
}

export async function createServerIncident(data: {
  incidentType: string;
  latitude: number;
  longitude: number;
  quartier?: string;
  ville?: string;
  region?: string;
  photoUri?: string | null;
  commentaire?: string;
  userId?: string;
}) {
  const doc = await databases.createDocument(DB_ID, INCIDENTS_COLLECTION, ID.unique(), {
    incidentType: data.incidentType,
    latitude: data.latitude,
    longitude: data.longitude,
    quartier: data.quartier || 'N/A',
    ville: data.ville || 'N/A',
    region: data.region || 'N/A',
    confirmations: 1,
    photoUri: data.photoUri || null,
    commentaire: data.commentaire || '',
    estResolue: false,
    dateResolution: null,
    createdAt: new Date().toISOString(),
    userId: data.userId || '',
  });
  return docToIncident(doc);
}

export async function confirmServerIncident(id: string) {
  const doc = await databases.getDocument(DB_ID, INCIDENTS_COLLECTION, id);
  const updated = await databases.updateDocument(DB_ID, INCIDENTS_COLLECTION, id, {
    confirmations: (doc.confirmations ?? 1) + 1,
  });
  return docToIncident(updated);
}

export async function resolveServerIncident(id: string) {
  const updated = await databases.updateDocument(DB_ID, INCIDENTS_COLLECTION, id, {
    estResolue: true,
    dateResolution: new Date().toISOString(),
  });
  return docToIncident(updated);
}

export async function deleteServerIncident(id: string) {
  await databases.deleteDocument(DB_ID, INCIDENTS_COLLECTION, id);
}

export async function getIncidentStats() {
  const allDocs: any[] = [];
  let offset = 0;
  const batchSize = 100;

  while (true) {
    const result = await databases.listDocuments(DB_ID, INCIDENTS_COLLECTION, [
      Query.limit(batchSize),
      Query.offset(offset),
    ]);
    allDocs.push(...result.documents);
    if (result.documents.length < batchSize) break;
    offset += batchSize;
  }

  const total = allDocs.length;
  const active = allDocs.filter(o => !o.estResolue).length;
  const resolved = allDocs.filter(o => o.estResolue).length;
  const byType = {
    broken_pipe: allDocs.filter(o => o.incidentType === 'broken_pipe').length,
    fallen_pole: allDocs.filter(o => o.incidentType === 'fallen_pole').length,
    cable_on_ground: allDocs.filter(o => o.incidentType === 'cable_on_ground').length,
    other: allDocs.filter(o => o.incidentType === 'other').length,
  };
  const byRegion: Record<string, number> = {};
  allDocs.forEach(o => {
    const r = o.region || 'N/A';
    byRegion[r] = (byRegion[r] || 0) + 1;
  });

  return { total, active, resolved, byType, byRegion };
}
