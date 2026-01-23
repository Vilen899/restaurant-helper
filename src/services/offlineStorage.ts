const DB_NAME = "restaurant-helper-db";
const STORE_NAME = "offline-orders";
const DB_VERSION = 1;

export type OfflineOrder = {
  localId: string;
  data: any;
  createdAt: number;
  synced: boolean;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "localId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineOrder(data: any) {
  const db = await openDB();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.put({
      localId: crypto.randomUUID(),
      data,
      createdAt: Date.now(),
      synced: false,
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingOrders(): Promise<OfflineOrder[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result.filter(o => !o.synced));
    req.onerror = () => reject(req.error);
  });
}

export async function markOrderSynced(localId: string) {
  const db = await openDB();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(localId);

    req.onsuccess = () => {
      const order = req.result;
      if (order) {
        order.synced = true;
        store.put(order);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
