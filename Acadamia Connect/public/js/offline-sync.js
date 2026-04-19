/**
 * Offline Sync Manager for Academia Connect V2
 * Uses IndexedDB to queue write actions when offline
 * and syncs them when the network is restored.
 */

const OfflineSync = (() => {
  const DB_NAME = 'academia-offline';
  const DB_VERSION = 1;
  const STORE_NAME = 'action-queue';
  let db = null;
  let isOnline = navigator.onLine;

  // ===== INDEXEDDB SETUP =====
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }
      };
      
      request.onsuccess = (e) => { db = e.target.result; resolve(db); };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // ===== QUEUE ACTION =====
  async function queueAction(actionType, url, method, payload) {
    if (!db) await openDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const action = {
        actionType,
        url,
        method: method || 'POST',
        payload: JSON.stringify(payload),
        synced: 0,
        created_at: new Date().toISOString()
      };
      
      const request = store.add(action);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ===== GET PENDING ACTIONS =====
  async function getPendingActions() {
    if (!db) await openDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('synced');
      const request = index.getAll(0);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ===== MARK ACTION AS SYNCED =====
  async function markSynced(id) {
    if (!db) await openDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      
      request.onsuccess = () => {
        const action = request.result;
        if (action) {
          action.synced = 1;
          store.put(action);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ===== SYNC ALL PENDING ACTIONS =====
  async function syncPendingActions() {
    const pending = await getPendingActions();
    if (pending.length === 0) return { synced: 0 };
    
    let syncedCount = 0;
    
    for (const action of pending) {
      try {
        const payload = JSON.parse(action.payload);
        const response = await fetch(action.url, {
          method: action.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include'
        });
        
        if (response.ok) {
          await markSynced(action.id);
          syncedCount++;
        }
      } catch (e) {
        // Network still unavailable, skip
      }
    }
    
    if (syncedCount > 0) {
      showOfflineBanner(false);
      showToast(`${syncedCount} offline action(s) synced successfully`, 'success');
    }
    
    return { synced: syncedCount, total: pending.length };
  }

  // ===== OFFLINE BANNER =====
  function showOfflineBanner(show) {
    let banner = document.getElementById('offline-banner');
    
    if (show) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
          background: #ff8800; color: #fff; text-align: center;
          padding: 8px 16px; font-size: 0.85rem; font-weight: 600;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        `;
        banner.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/>
            <path d="M5 12.55a10.94 10.94 0 015.17-2.39"/>
            <path d="M10.71 5.05A16 16 0 0122.56 9"/>
            <path d="M1.42 9a15.91 15.91 0 014.7-2.88"/>
            <path d="M8.53 16.11a6 6 0 016.95 0"/>
            <line x1="12" y1="20" x2="12.01" y2="20"/>
          </svg>
          You are offline. Changes will be saved and synced when you reconnect.
        `;
        document.body.prepend(banner);
      }
    } else {
      if (banner) banner.remove();
    }
  }

  // ===== SMART API WRAPPER =====
  // Intercepts API calls and queues them when offline
  async function smartPost(url, payload) {
    if (!navigator.onLine) {
      await queueAction('api_call', url, 'POST', payload);
      showOfflineBanner(true);
      return { success: true, offline: true, message: 'Saved offline. Will sync when connected.' };
    }
    return API.post(url, payload);
  }

  // ===== NETWORK LISTENERS =====
  function init() {
    openDB().catch(console.error);
    
    window.addEventListener('online', async () => {
      isOnline = true;
      showOfflineBanner(false);
      const result = await syncPendingActions();
      if (result.synced > 0) {
        // Refresh current view
        if (AppState?.role === 'student') {
          renderStudentPortal();
        }
      }
    });
    
    window.addEventListener('offline', () => {
      isOnline = false;
      showOfflineBanner(true);
    });
    
    // Show banner if already offline
    if (!navigator.onLine) {
      showOfflineBanner(true);
    }
  }

  return { init, queueAction, syncPendingActions, smartPost, showOfflineBanner };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => OfflineSync.init());
} else {
  OfflineSync.init();
}
