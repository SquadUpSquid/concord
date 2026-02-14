import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { loginToMatrix, initMatrixClient } from "@/lib/matrix";
import { registerEventHandlers } from "@/lib/matrixEventHandlers";

export function LoginPage() {
  const [homeserver, setHomeserver] = useState("https://matrix.org");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { accessToken, userId, deviceId } = await loginToMatrix(
        homeserver,
        username,
        password
      );

      useAuthStore.getState().setCredentials({
        accessToken,
        userId,
        deviceId,
        homeserverUrl: homeserver,
      });

      const client = await initMatrixClient(
        homeserver,
        accessToken,
        userId,
        deviceId
      );
      registerEventHandlers(client);
    } catch (err: unknown) {
      console.error("Login error:", err);
      let msg = "Login failed. Check your credentials.";
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === "object" && err !== null && "data" in err) {
        const matrixErr = err as { data?: { error?: string } };
        msg = matrixErr.data?.error ?? msg;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-bg-tertiary">
      <div className="w-full max-w-md rounded-md bg-bg-primary p-8 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-text-primary">
          Welcome back!
        </h1>
        <p className="mb-6 text-center text-sm text-text-muted">
          Log in with your Matrix account
        </p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
              Homeserver
            </label>
            <input
              type="url"
              value={homeserver}
              onChange={(e) => setHomeserver(e.target.value)}
              className="w-full rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
              placeholder="https://matrix.org"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
              placeholder="username"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
              placeholder="Password"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-sm bg-accent p-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}
