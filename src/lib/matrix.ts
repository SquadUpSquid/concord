import * as sdk from "matrix-js-sdk";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

let matrixClient: sdk.MatrixClient | null = null;

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = globalThis.indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

async function clearAllDatabases(): Promise<void> {
  if (typeof globalThis.indexedDB.databases === "function") {
    const dbs = await globalThis.indexedDB.databases();
    await Promise.all(
      dbs.map((db) => db.name ? deleteDatabase(db.name) : Promise.resolve())
    );
  } else {
    // Fallback: delete known database names
    const knownNames = [
      "concord-matrix-store",
      "matrix-js-sdk:crypto",
      "matrix-js-sdk::matrix-sdk-crypto",
    ];
    await Promise.all(knownNames.map((n) => deleteDatabase(n).catch(() => {})));
  }
}

export async function initMatrixClient(
  baseUrl: string,
  accessToken: string,
  userId: string,
  deviceId: string
): Promise<sdk.MatrixClient> {
  if (matrixClient) {
    matrixClient.stopClient();
  }

  // Clear all IndexedDB databases to prevent device ID mismatch errors
  await clearAllDatabases();

  const store = new sdk.IndexedDBStore({
    indexedDB: globalThis.indexedDB,
    dbName: "concord-matrix-store",
  });

  matrixClient = sdk.createClient({
    baseUrl,
    accessToken,
    userId,
    deviceId,
    store,
    timelineSupport: true,
    fetchFn: tauriFetch as unknown as typeof globalThis.fetch,
  });

  await store.startup();
  await matrixClient.initRustCrypto();
  await matrixClient.startClient({ initialSyncLimit: 20 });

  return matrixClient;
}

export function getMatrixClient(): sdk.MatrixClient | null {
  return matrixClient;
}

export async function destroyMatrixClient(): Promise<void> {
  if (matrixClient) {
    matrixClient.stopClient();
    matrixClient = null;
  }
  await clearAllDatabases();
}

export async function loginToMatrix(
  homeserverUrl: string,
  username: string,
  password: string
): Promise<{ accessToken: string; userId: string; deviceId: string }> {
  const tempClient = sdk.createClient({
    baseUrl: homeserverUrl,
    fetchFn: tauriFetch as unknown as typeof globalThis.fetch,
  });

  const response = await tempClient.login("m.login.password", {
    identifier: { type: "m.id.user", user: username },
    password,
    initial_device_display_name: "Concord Desktop",
  });

  return {
    accessToken: response.access_token,
    userId: response.user_id,
    deviceId: response.device_id,
  };
}
