/**
 * Offline Time Entry Cache
 * IndexedDB-based storage for time entries that works offline.
 * Queues entries for sync when back online.
 */

const DB_NAME = 'reinplaner-time-cache';
const DB_VERSION = 1;
const STORE_PENDING = 'pending-time-entries';
const STORE_SYNCED = 'synced-time-entries';
const STORE_ACTIVE = 'active-time-entry';

export interface CachedTimeEntry {
  id: string; // Local ID (UUID), replaced on server sync
  localId: string; // Unique local identifier
  employeeId: string | null;
  customerId: string | null;
  objectId: string | null;
  orderId: string | null;
  startTime: string; // ISO string
  endTime: string | null;
  durationMinutes: number | null;
  breakMinutes: number | null;
  type: 'clock_in_out' | 'stopwatch';
  notes: string | null;
  createdAt: string; // ISO string - when created locally
  syncedAt: string | null; // ISO string - when synced to server
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  errorMessage: string | null;
  retryCount?: number; // How many times sync was retried
}

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  entryId: string;
  data: Partial<CachedTimeEntry>;
  createdAt: string;
  retryCount: number;
}

let dbInstance: IDBDatabase | null = null;

function generateLocalId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error('Failed to open offline cache database'));

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Pending entries store (not yet synced)
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        const pendingStore = db.createObjectStore(STORE_PENDING, { keyPath: 'localId' });
        pendingStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        pendingStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Synced entries store (historical data)
      if (!db.objectStoreNames.contains(STORE_SYNCED)) {
        const syncedStore = db.createObjectStore(STORE_SYNCED, { keyPath: 'localId' });
        syncedStore.createIndex('syncedAt', 'syncedAt', { unique: false });
        syncedStore.createIndex('employeeId', 'employeeId', { unique: false });
      }

      // Active entry store (currently running time entry)
      if (!db.objectStoreNames.contains(STORE_ACTIVE)) {
        db.createObjectStore(STORE_ACTIVE, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Check if IndexedDB is available
 */
export function isOfflineCacheAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof indexedDB !== 'undefined';
}

/**
 * Get the currently active time entry from local cache
 */
export async function getActiveTimeEntry(): Promise<CachedTimeEntry | null> {
  if (!isOfflineCacheAvailable()) return null;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ACTIVE, 'readonly');
      const store = tx.objectStore(STORE_ACTIVE);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as CachedTimeEntry[];
        resolve(entries.length > 0 ? entries[0] : null);
      };
      request.onerror = () => reject(new Error('Failed to get active entry'));
    });
  } catch (error) {
    console.error('[OfflineCache] Error getting active entry:', error);
    return null;
  }
}

/**
 * Save an active time entry to local cache
 */
export async function saveActiveTimeEntry(entry: CachedTimeEntry): Promise<void> {
  if (!isOfflineCacheAvailable()) return;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ACTIVE, 'readwrite');
      const store = tx.objectStore(STORE_ACTIVE);

      // Clear existing active entries first
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        const putRequest = store.put(entry);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(new Error('Failed to save active entry'));
      };
      clearRequest.onerror = () => reject(new Error('Failed to clear active entries'));
    });
  } catch (error) {
    console.error('[OfflineCache] Error saving active entry:', error);
  }
}

/**
 * Clear the active time entry from local cache
 */
export async function clearActiveTimeEntry(): Promise<void> {
  if (!isOfflineCacheAvailable()) return;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ACTIVE, 'readwrite');
      const store = tx.objectStore(STORE_ACTIVE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear active entry'));
    });
  } catch (error) {
    console.error('[OfflineCache] Error clearing active entry:', error);
  }
}

/**
 * Save a pending time entry to the sync queue
 */
export async function savePendingEntry(entry: Omit<CachedTimeEntry, 'localId' | 'createdAt' | 'syncStatus' | 'errorMessage'>): Promise<CachedTimeEntry> {
  if (!isOfflineCacheAvailable()) {
    throw new Error('Offline cache not available');
  }

  const cachedEntry: CachedTimeEntry = {
    ...entry,
    localId: generateLocalId(),
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
    errorMessage: null,
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readwrite');
    const store = tx.objectStore(STORE_PENDING);
    const request = store.put(cachedEntry);

    request.onsuccess = () => resolve(cachedEntry);
    request.onerror = () => reject(new Error('Failed to save pending entry'));
  });
}

/**
 * Update a pending time entry (e.g., after it was synced with server ID)
 */
export async function updatePendingEntry(localId: string, updates: Partial<CachedTimeEntry>): Promise<void> {
  if (!isOfflineCacheAvailable()) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readwrite');
    const store = tx.objectStore(STORE_PENDING);
    const getRequest = store.get(localId);

    getRequest.onsuccess = () => {
      const entry = getRequest.result as CachedTimeEntry;
      if (!entry) {
        resolve(); // Not found, nothing to update
        return;
      }
      const updated = { ...entry, ...updates };
      const putRequest = store.put(updated);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(new Error('Failed to update pending entry'));
    };
    getRequest.onerror = () => reject(new Error('Failed to get pending entry for update'));
  });
}

/**
 * Get all pending time entries
 */
export async function getPendingEntries(): Promise<CachedTimeEntry[]> {
  if (!isOfflineCacheAvailable()) return [];

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING, 'readonly');
      const store = tx.objectStore(STORE_PENDING);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as CachedTimeEntry[]);
      request.onerror = () => reject(new Error('Failed to get pending entries'));
    });
  } catch (error) {
    console.error('[OfflineCache] Error getting pending entries:', error);
    return [];
  }
}

/**
 * Delete a pending entry (after successful sync)
 */
export async function deletePendingEntry(localId: string): Promise<void> {
  if (!isOfflineCacheAvailable()) return;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING, 'readwrite');
      const store = tx.objectStore(STORE_PENDING);
      const request = store.delete(localId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete pending entry'));
    });
  } catch (error) {
    console.error('[OfflineCache] Error deleting pending entry:', error);
  }
}

/**
 * Get the count of pending entries
 */
export async function getPendingCount(): Promise<number> {
  if (!isOfflineCacheAvailable()) return 0;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING, 'readonly');
      const store = tx.objectStore(STORE_PENDING);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to count pending entries'));
    });
  } catch (error) {
    console.error('[OfflineCache] Error counting pending entries:', error);
    return 0;
  }
}

/**
 * Move synced entries to the synced store for historical reference
 */
export async function archiveSyncedEntry(entry: CachedTimeEntry): Promise<void> {
  if (!isOfflineCacheAvailable()) return;

  const db = await openDB();

  // First add to synced store
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SYNCED, 'readwrite');
    const store = tx.objectStore(STORE_SYNCED);
    const request = store.put({ ...entry, syncedAt: new Date().toISOString() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to archive synced entry'));
  });

  // Then delete from pending
  await deletePendingEntry(entry.localId);
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Get cached time entries for a specific employee (from synced store)
 */
export async function getCachedEntriesForEmployee(employeeId: string, limit = 50): Promise<CachedTimeEntry[]> {
  if (!isOfflineCacheAvailable()) return [];

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SYNCED, 'readonly');
      const store = tx.objectStore(STORE_SYNCED);
      const index = store.index('employeeId');
      const request = index.getAll(employeeId);

      request.onsuccess = () => {
        const entries = (request.result as CachedTimeEntry[])
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
          .slice(0, limit);
        resolve(entries);
      };
      request.onerror = () => reject(new Error('Failed to get cached entries'));
    });
  } catch (error) {
    console.error('[OfflineCache] Error getting cached entries:', error);
    return [];
  }
}

/**
 * Clear all offline cache data (for logout / debugging)
 */
export async function clearAllCache(): Promise<void> {
  if (!isOfflineCacheAvailable()) return;

  const db = await openDB();
  const stores = [STORE_PENDING, STORE_SYNCED, STORE_ACTIVE];

  for (const storeName of stores) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
    });
  }
}
