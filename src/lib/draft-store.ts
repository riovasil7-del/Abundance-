import { draftsFor, dropDraft, type LocalDraft } from "./low-data";

const DB_NAME = "hojnost-drafts";
const STORE = "drafts";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listDeviceDrafts(ownerId: string): Promise<LocalDraft[]> {
  const db = await openDb();
  const rows = await new Promise<LocalDraft[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as LocalDraft[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return draftsFor(rows, ownerId);
}

export async function saveDeviceDraft(draft: LocalDraft): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(draft);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function discardDeviceDraft(ownerId: string, id: string): Promise<void> {
  const rows = await listDeviceDrafts(ownerId);
  if (!rows.some((row) => row.id === id)) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export function withoutDraft(rows: readonly LocalDraft[], ownerId: string, id: string): LocalDraft[] {
  return dropDraft(rows, ownerId, id);
}
