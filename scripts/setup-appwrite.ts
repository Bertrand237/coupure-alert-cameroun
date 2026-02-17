import { Client, Databases, ID } from 'node-appwrite';

const ENDPOINT = process.env.APPWRITE_ENDPOINT!;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID!;
const API_KEY = process.env.APPWRITE_API_KEY!;

const DB_ID = '6994aa87003b4207080f';
const COLLECTION_ID = 'outages';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createAttrSafe(databases: Databases, fn: () => Promise<any>, name: string) {
  try {
    await fn();
    console.log(`  + ${name}`);
  } catch (e: any) {
    if (e.code === 409) {
      console.log(`  ~ ${name} (already exists)`);
    } else {
      console.log(`  ! ${name} failed: ${e.message}`);
      throw e;
    }
  }
  await sleep(2000);
}

async function setup() {
  console.log('Connecting to Appwrite...');

  const client = new Client();
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);

  const databases = new Databases(client);

  try {
    console.log('Deleting old collection if it exists...');
    await databases.deleteCollection(DB_ID, COLLECTION_ID);
    console.log('Old collection deleted.');
    await sleep(2000);
  } catch {
    console.log('No existing collection to delete.');
  }

  console.log('Creating collection "outages"...');
  await databases.createCollection(DB_ID, COLLECTION_ID, 'Outages', undefined, true, true);
  console.log('Collection created.');
  await sleep(1000);

  console.log('Creating attributes...');

  await createAttrSafe(databases, () =>
    databases.createEnumAttribute(DB_ID, COLLECTION_ID, 'type', ['water', 'electricity', 'internet'], true),
    'type (enum)');

  await createAttrSafe(databases, () =>
    databases.createFloatAttribute(DB_ID, COLLECTION_ID, 'latitude', true),
    'latitude (float)');

  await createAttrSafe(databases, () =>
    databases.createFloatAttribute(DB_ID, COLLECTION_ID, 'longitude', true),
    'longitude (float)');

  await createAttrSafe(databases, () =>
    databases.createStringAttribute(DB_ID, COLLECTION_ID, 'quartier', 255, false, 'N/A'),
    'quartier (string)');

  await createAttrSafe(databases, () =>
    databases.createStringAttribute(DB_ID, COLLECTION_ID, 'ville', 255, false, 'N/A'),
    'ville (string)');

  await createAttrSafe(databases, () =>
    databases.createStringAttribute(DB_ID, COLLECTION_ID, 'region', 255, false, 'N/A'),
    'region (string)');

  await createAttrSafe(databases, () =>
    databases.createIntegerAttribute(DB_ID, COLLECTION_ID, 'confirmations', false, undefined, undefined, 1),
    'confirmations (integer)');

  await createAttrSafe(databases, () =>
    databases.createStringAttribute(DB_ID, COLLECTION_ID, 'photoUri', 2048, false),
    'photoUri (string)');

  await createAttrSafe(databases, () =>
    databases.createBooleanAttribute(DB_ID, COLLECTION_ID, 'estRetablie', false, false),
    'estRetablie (boolean)');

  await createAttrSafe(databases, () =>
    databases.createDatetimeAttribute(DB_ID, COLLECTION_ID, 'dateRetablissement', false),
    'dateRetablissement (datetime)');

  await createAttrSafe(databases, () =>
    databases.createDatetimeAttribute(DB_ID, COLLECTION_ID, 'createdAt', true),
    'createdAt (datetime)');

  await sleep(3000);
  console.log('Creating indexes...');

  try {
    await databases.createIndex(DB_ID, COLLECTION_ID, 'idx_type', 'key', ['type']);
    console.log('  + idx_type');
    await sleep(2000);
    await databases.createIndex(DB_ID, COLLECTION_ID, 'idx_region', 'key', ['region']);
    console.log('  + idx_region');
    await sleep(2000);
    await databases.createIndex(DB_ID, COLLECTION_ID, 'idx_createdAt', 'key', ['createdAt'], ['desc']);
    console.log('  + idx_createdAt');
    await sleep(2000);
  } catch (e: any) {
    console.log('Index note:', e.message);
  }

  console.log('\nAppwrite setup complete!');
  console.log('Database ID:', DB_ID);
  console.log('Collection ID:', COLLECTION_ID);
}

setup().catch(e => {
  console.error('Setup failed:', e);
  process.exit(1);
});
