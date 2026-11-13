import type {
  CustomGroceryItem,
  MealPreferenceRecord,
  PantryItem,
  Recipe,
  UserPreferences,
  WeeklyPlan,
} from '../types/meal';

const DB_NAME = 'hearth_table_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

export interface PersistedAppState {
  recipes: Recipe[];
  weeklyPlan: WeeklyPlan;
  pantry: PantryItem[];
  mealPreferences: Record<string, MealPreferenceRecord>;
  checkedGroceries: Record<string, boolean>;
  customGroceries: CustomGroceryItem[];
  preferences: UserPreferences;
  updatedAt: number;
}

const LOCAL_FALLBACK_KEY = 'hearth_table_state_v1';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadPersistedState(): Promise<Partial<PersistedAppState> | null> {
  try {
    const db = await openDB();
    const result = await new Promise<Partial<PersistedAppState> | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('main');
      req.onsuccess = () => resolve(req.result as Partial<PersistedAppState> | undefined);
      req.onerror = () => reject(req.error);
    });
    if (result) return result;
  } catch {
    // fallback to localStorage
  }

  try {
    const raw = localStorage.getItem(LOCAL_FALLBACK_KEY);
    if (raw) return JSON.parse(raw) as Partial<PersistedAppState>;
  } catch {
    // ignore
  }
  return null;
}

export async function savePersistedState(state: PersistedAppState): Promise<void> {
  try {
    localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors on fallback
  }

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(state, 'main');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // already mirrored in localStorage
  }
}
