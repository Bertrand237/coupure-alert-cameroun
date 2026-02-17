import { Client, Databases, ID } from 'node-appwrite';

const ENDPOINT = process.env.APPWRITE_ENDPOINT!;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID!;
const API_KEY = process.env.APPWRITE_API_KEY!;
const DB_ID = '6994aa87003b4207080f';
const COLLECTION_ID = 'users';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setup() {
  console.log('Connecting to Appwrite...');
  const client = new Client();
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
  const databases = new Databases(client);

  try {
    await databases.deleteCollection(DB_ID, COLLECTION_ID);
    console.log('Old users collection deleted.');
    await sleep(2000);
  } catch {
    console.log('No existing users collection.');
  }

  console.log('Creating collection "users"...');
  await databases.createCollection(DB_ID, COLLECTION_ID, 'Users', undefined, true, true);
  await sleep(1000);

  console.log('Creating attributes...');

  await databases.createStringAttribute(DB_ID, COLLECTION_ID, 'phone', 20, true);
  console.log('  + phone');
  await sleep(2000);

  await databases.createStringAttribute(DB_ID, COLLECTION_ID, 'passwordHash', 255, true);
  console.log('  + passwordHash');
  await sleep(2000);

  await databases.createStringAttribute(DB_ID, COLLECTION_ID, 'displayName', 100, false, '');
  console.log('  + displayName');
  await sleep(2000);

  await databases.createDatetimeAttribute(DB_ID, COLLECTION_ID, 'createdAt', true);
  console.log('  + createdAt');
  await sleep(3000);

  console.log('Creating indexes...');
  await databases.createIndex(DB_ID, COLLECTION_ID, 'idx_phone', 'unique', ['phone']);
  console.log('  + idx_phone (unique)');

  console.log('\nUsers collection setup complete!');
}

setup().catch(e => {
  console.error('Setup failed:', e);
  process.exit(1);
});
