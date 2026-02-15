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

export async function initMatrixClient(
  baseUrl: string,
  accessToken: string,
  userId: string,
  deviceId: string
): Promise<sdk.MatrixClient> {
  if (matrixClient) {
    matrixClient.stopClient();
  }

  const createAndStart = async () => {
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
  };

  try {
    await createAndStart();
  } catch (err) {
    // Stale IndexedDB from a previous session — wipe and retry
    if (String(err).includes("doesn't match")) {
      await deleteDatabase("concord-matrix-store");
      await deleteDatabase("matrix-js-sdk:crypto");
      await createAndStart();
    } else {
      throw err;
    }
  }

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
  await deleteDatabase("concord-matrix-store").catch(() => {});
  await deleteDatabase("matrix-js-sdk:crypto").catch(() => {});
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
