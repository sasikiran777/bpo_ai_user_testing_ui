type StoreName = 'audio'

const DB_NAME = 'bpo_test'
const DB_VERSION = 1

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('audio')) {
        db.createObjectStore('audio')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

const withStore = async <T>(storeName: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const req = fn(store)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
    tx.onerror = () => {
      reject(tx.error)
      db.close()
    }
  })
}

export const idbAudio = {
  set: (key: string, blob: Blob) => withStore('audio', 'readwrite', (s) => s.put(blob, key)),
  get: (key: string) => withStore<Blob | undefined>('audio', 'readonly', (s) => s.get(key)),
  del: (key: string) => withStore('audio', 'readwrite', (s) => s.delete(key)),
}

