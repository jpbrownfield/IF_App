const DB_NAME = 'FableForgeDB';
const STORE_NAME = 'gameFiles';
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open game storage.'));
  });
}

export async function saveGameFile(gameId: string, file: Blob): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(file, gameId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save game.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Saving was cancelled.'));
  });
  database.close();
}

export async function hasGameFile(gameId: string): Promise<boolean> {
  const database = await openDatabase();
  const exists = await new Promise<boolean>((resolve, reject) => {
    const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).count(gameId);
    request.onsuccess = () => resolve(request.result > 0);
    request.onerror = () => reject(request.error ?? new Error('Could not read game storage.'));
  });
  database.close();
  return exists;
}
