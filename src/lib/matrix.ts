import * as sdk from "matrix-js-sdk";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

let matrixClient: sdk.MatrixClient | null = null;

export async function initMatrixClient(
  baseUrl: string,
  accessToken: string,
  userId: string,
  deviceId: string
): Promise<sdk.MatrixClient> {
  if (matrixClient) {
    matrixClient.stopClient();
  }

  const store = new sdk.IndexedDBStore({
    indexedDB: globalThis.indexedDB,
    dbName: "concord-matrix-store",
  });
  await store.startup();

  matrixClient = sdk.createClient({
    baseUrl,
    accessToken,
    userId,
    deviceId,
    store,
    timelineSupport: true,
    fetchFn: tauriFetch as unknown as typeof globalThis.fetch,
  });

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
