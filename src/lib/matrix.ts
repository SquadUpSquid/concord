import * as sdk from "matrix-js-sdk";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

let matrixClient: sdk.MatrixClient | null = null;

/** Registered by App.tsx so React re-renders when the client changes. */
let _onClientChanged: (() => void) | null = null;
export function setClientChangeNotifier(fn: (() => void) | null) {
  _onClientChanged = fn;
}
function emitClientChanged() {
  try { _onClientChanged?.(); } catch { /* noop */ }
}

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
    const knownNames = [
      "concord-matrix-store",
      "matrix-js-sdk:crypto",
      "matrix-js-sdk::matrix-sdk-crypto",
    ];
    await Promise.all(knownNames.map((n) => deleteDatabase(n).catch(() => {})));
  }
}

async function createClient(
  baseUrl: string,
  accessToken: string,
  userId: string,
  deviceId: string
): Promise<sdk.MatrixClient> {
  const store = new sdk.IndexedDBStore({
    indexedDB: globalThis.indexedDB,
    dbName: "concord-matrix-store",
  });

  // Use a local variable for all async operations so concurrent calls
  // (e.g. from React StrictMode) don't interfere with each other.
  const client = sdk.createClient({
    baseUrl,
    accessToken,
    userId,
    deviceId,
    store,
    timelineSupport: true,
    fetchFn: tauriFetch as unknown as typeof globalThis.fetch,
    fallbackICEServerAllowed: true,
    iceCandidatePoolSize: 20,
    useE2eForGroupCall: false,
  });

  await store.startup();
  await client.initRustCrypto();

  // startClient() internally creates CallEventHandler + GroupCallEventHandler
  // and starts them after initial sync completes (if WebRTC is supported).
  await client.startClient({ initialSyncLimit: 20 });

  // Only publish the client after it is fully initialized.
  matrixClient = client;
  emitClientChanged();
  return client;
}

/** In-flight init promise — prevents duplicate concurrent initialization. */
let _initPromise: Promise<sdk.MatrixClient> | null = null;

export async function initMatrixClient(
  baseUrl: string,
  accessToken: string,
  userId: string,
  deviceId: string
): Promise<sdk.MatrixClient> {
  // If an init is already in progress, return the same promise so React
  // StrictMode double-firing the effect doesn't start two parallel inits.
  if (_initPromise) return _initPromise;

  if (matrixClient) {
    matrixClient.stopClient();
    matrixClient = null;
    emitClientChanged();
  }

  _initPromise = (async () => {
    try {
      // Try with existing databases (preserves crypto keys)
      return await createClient(baseUrl, accessToken, userId, deviceId);
    } catch (err) {
      // Device ID mismatch or corrupt DB — wipe and retry
      console.warn("Client init failed, clearing databases and retrying:", err);
      await clearAllDatabases();
      return await createClient(baseUrl, accessToken, userId, deviceId);
    } finally {
      _initPromise = null;
    }
  })();

  return _initPromise;
}

export function getMatrixClient(): sdk.MatrixClient | null {
  return matrixClient;
}

export async function destroyMatrixClient(): Promise<void> {
  if (matrixClient) {
    matrixClient.stopClient();
    matrixClient = null;
    emitClientChanged();
  }
}

export async function loginToMatrix(
  homeserverUrl: string,
  username: string,
  password: string
): Promise<{ accessToken: string; userId: string; deviceId: string }> {
  // New login = new device, clear old databases
  await clearAllDatabases();

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

type MatrixAuthFlow = { stages?: string[] };
type MatrixUiaData = {
  session?: string;
  flows?: MatrixAuthFlow[];
};
type MatrixLikeError = {
  data?: MatrixUiaData & { error?: string };
  message?: string;
};

function chooseSupportedRegistrationFlow(flows: MatrixAuthFlow[]): string[] | null {
  const supportedStages = new Set([
    "m.login.dummy",
    "m.login.registration_token",
    "org.matrix.msc3231.login.registration_token",
  ]);

  const supportedFlow = flows.find((flow) => {
    const stages = flow.stages ?? [];
    return stages.length > 0 && stages.every((stage) => supportedStages.has(stage));
  });

  return supportedFlow?.stages ?? null;
}

function normalizeUsername(username: string): string {
  return username.startsWith("@") ? username.slice(1).split(":")[0] : username;
}

export async function registerToMatrix(
  homeserverUrl: string,
  username: string,
  password: string,
  registrationToken?: string
): Promise<{ accessToken: string; userId: string; deviceId: string }> {
  await clearAllDatabases();

  const tempClient = sdk.createClient({
    baseUrl: homeserverUrl,
    fetchFn: tauriFetch as unknown as typeof globalThis.fetch,
  });

  const registerRequestBase = {
    username: normalizeUsername(username),
    password,
    inhibit_login: false,
    initial_device_display_name: "Concord Desktop",
  };

  try {
    const response = await tempClient.registerRequest(registerRequestBase);
    if (!response.access_token || !response.device_id) {
      throw new Error("Registration succeeded but no access token/device was returned.");
    }
    return {
      accessToken: response.access_token,
      userId: response.user_id,
      deviceId: response.device_id,
    };
  } catch (err) {
    const matrixErr = err as MatrixLikeError;
    const rawError = matrixErr.data?.error ?? matrixErr.message ?? "";
    if (rawError.includes("Registration has been disabled")) {
      throw new Error("This homeserver does not allow direct password signup via /register. On matrix.org, create an account through the web signup flow (external auth) and then log in here.");
    }
    const uia = matrixErr.data;
    const session = uia?.session;
    const flows = Array.isArray(uia?.flows) ? uia.flows : [];
    if (!session || flows.length === 0) {
      throw err;
    }

    const stages = chooseSupportedRegistrationFlow(flows);
    if (!stages) {
      throw new Error("This homeserver requires unsupported registration steps in-app. Try registering in Element first.");
    }

    if (
      (stages.includes("m.login.registration_token") || stages.includes("org.matrix.msc3231.login.registration_token")) &&
      !registrationToken?.trim()
    ) {
      throw new Error("This homeserver requires a registration token.");
    }

    for (const stage of stages) {
      const auth: Record<string, unknown> = { type: stage, session };
      if (stage === "m.login.registration_token" || stage === "org.matrix.msc3231.login.registration_token") {
        auth.token = registrationToken!.trim();
      }

      const response = await tempClient.registerRequest({
        ...registerRequestBase,
        auth: auth as sdk.AuthDict,
      });

      if (response.access_token && response.device_id) {
        return {
          accessToken: response.access_token,
          userId: response.user_id,
          deviceId: response.device_id,
        };
      }
    }

    throw new Error("Registration did not complete. Please try again.");
  }
}
