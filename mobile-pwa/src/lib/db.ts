// IndexedDB local para cache + queue offline de la PWA
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface OfflineMutation {
  id?: number;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: any;
  createdAt: number;
  tries: number;
  lastError?: string;
}

interface Base2DB extends DBSchema {
  cache: {
    key: string;
    value: { key: string; value: any; updatedAt: number };
  };
  mutations: {
    key: number;
    value: OfflineMutation;
    indexes: { 'by-created': number };
  };
}

let dbPromise: Promise<IDBPDatabase<Base2DB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<Base2DB>('base2', 1, {
      upgrade(db) {
        db.createObjectStore('cache', { keyPath: 'key' });
        const muts = db.createObjectStore('mutations', {
          keyPath: 'id',
          autoIncrement: true,
        });
        muts.createIndex('by-created', 'createdAt');
      },
    });
  }
  return dbPromise;
}

export async function cacheSet<T>(key: string, value: T) {
  const db = await getDb();
  await db.put('cache', { key, value, updatedAt: Date.now() });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const entry = await db.get('cache', key);
  return entry ? (entry.value as T) : null;
}

export async function queueMutation(m: Omit<OfflineMutation, 'id' | 'createdAt' | 'tries'>) {
  const db = await getDb();
  const now = Date.now();
  const id = await db.add('mutations', { ...m, createdAt: now, tries: 0 });
  return id as number;
}

export async function getQueuedMutations(): Promise<OfflineMutation[]> {
  const db = await getDb();
  return db.getAllFromIndex('mutations', 'by-created');
}

export async function removeQueuedMutation(id: number) {
  const db = await getDb();
  await db.delete('mutations', id);
}

export async function updateQueuedMutation(m: OfflineMutation) {
  const db = await getDb();
  if (m.id == null) return;
  await db.put('mutations', m);
}

export async function countQueued(): Promise<number> {
  const db = await getDb();
  return db.count('mutations');
}
