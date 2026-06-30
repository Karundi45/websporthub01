import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ActivityDB extends DBSchema {
  activityData: {
    key: string;
    value: {
      day: string;
      calories: number;
      distance: number;
      minutes: number;
      workouts: number;
      intensity: number;
    };
  };
  personalBests: {
    key: string;
    value: {
      id: string;
      name: string;
      value: string | number;
      unit: string;
      trend: string;
      trendValue: string;
      iconType: 'dumbbell' | 'activity' | 'timer';
    };
  };
}

let dbPromise: Promise<IDBPDatabase<ActivityDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ActivityDB>('ActivityDB', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('activityData')) {
          db.createObjectStore('activityData', { keyPath: 'day' });
        }
        if (!db.objectStoreNames.contains('personalBests')) {
          db.createObjectStore('personalBests', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveActivityData(data: ActivityDB['activityData']['value'][]) {
  const db = await getDB();
  const tx = db.transaction('activityData', 'readwrite');
  await Promise.all(data.map((item) => tx.store.put(item)));
  await tx.done;
}

export async function getActivityData() {
  const db = await getDB();
  return db.getAll('activityData');
}

export async function savePersonalBests(data: ActivityDB['personalBests']['value'][]) {
  const db = await getDB();
  const tx = db.transaction('personalBests', 'readwrite');
  await Promise.all(data.map((item) => tx.store.put(item)));
  await tx.done;
}

export async function getPersonalBests() {
  const db = await getDB();
  return db.getAll('personalBests');
}
