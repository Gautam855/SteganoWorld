/**
 * 🗄️ Key Store — IndexedDB Storage for Private Keys
 * ====================================================
 * Private keys NEVER leave this device.
 * Stored securely in IndexedDB (not localStorage for security).
 *
 * Stores:
 * - encryptionPrivateKey: RSA-OAEP private key (PEM) for decrypting messages
 * - signingPrivateKey: RSASSA-PKCS1-v1_5 private key (PEM) for auth challenges
 * - encryptionPublicKey: RSA-OAEP public key (PEM) for encrypting own sent messages
 * - signingPublicKey: RSASSA-PKCS1-v1_5 public key (PEM) sent to server for auth
 * - user profile data
 */

const DB_NAME = 'SteganoWorldE2E';
const DB_VERSION = 1;
const STORE_NAME = 'keys';

interface StoredKeys {
  id: string;  // always 'current_user'
  userId: string;
  username: string;
  displayName: string;
  encryptionPublicKey: string;
  encryptionPrivateKey: string;
  signingPublicKey: string;
  signingPrivateKey: string;
  token: string;
  createdAt: string;
}


// ─── Database Setup ──────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}


// ─── Save Keys ───────────────────────────────────────────────────

export async function saveKeys(data: {
  userId: string;
  username: string;
  displayName: string;
  encryptionPublicKey: string;
  encryptionPrivateKey: string;
  signingPublicKey: string;
  signingPrivateKey: string;
  token: string;
}): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  store.put({
    id: 'current_user',
    ...data,
    createdAt: new Date().toISOString(),
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}


// ─── Get Keys ────────────────────────────────────────────────────

export async function getKeys(): Promise<StoredKeys | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.get('current_user');

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}


// ─── Update Token ────────────────────────────────────────────────

export async function updateToken(token: string): Promise<void> {
  const keys = await getKeys();
  if (keys) {
    keys.token = token;
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(keys);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }
}


// ─── Delete Keys (Logout) ────────────────────────────────────────

export async function deleteKeys(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.delete('current_user');

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}


// ─── Export Keys (For Backup) ────────────────────────────────────

export async function exportKeysForBackup(): Promise<string | null> {
  const keys = await getKeys();
  if (!keys) return null;

  // Export everything except the token (security: don't backup auth token)
  const backup = {
    userId: keys.userId,
    username: keys.username,
    displayName: keys.displayName,
    encryptionPublicKey: keys.encryptionPublicKey,
    encryptionPrivateKey: keys.encryptionPrivateKey,
    signingPublicKey: keys.signingPublicKey,
    signingPrivateKey: keys.signingPrivateKey,
    exportedAt: new Date().toISOString(),
  };

  return btoa(JSON.stringify(backup));
}


// ─── Import Keys (From Backup) ──────────────────────────────────

export async function importKeysFromBackup(base64Data: string): Promise<{
  username: string;
  displayName: string;
  signingPublicKey: string;
  signingPrivateKey: string;
  encryptionPublicKey: string;
  encryptionPrivateKey: string;
} | null> {
  try {
    const json = JSON.parse(atob(base64Data));
    if (!json.encryptionPrivateKey || !json.signingPrivateKey || !json.username) {
      throw new Error('Invalid backup data');
    }
    return json;
  } catch {
    return null;
  }
}


// ─── Check if User is Logged In ──────────────────────────────────

export async function isLoggedIn(): Promise<boolean> {
  const keys = await getKeys();
  return keys !== null && !!keys.token;
}
