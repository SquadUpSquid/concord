import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { loginToMatrix, registerToMatrix, initMatrixClient } from "@/lib/matrix";
import { registerEventHandlers } from "@/lib/matrixEventHandlers";

export function LoginPage() {
  const [homeserver, setHomeserver] = useState("https://matrix.org");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegisterMode && password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const { accessToken, userId, deviceId } = isRegisterMode
        ? await registerToMatrix(homeserver, username, password, registrationToken)
        : await loginToMatrix(homeserver, username, password);

      // Init client BEFORE setting credentials so isLoggedIn only
      // flips to true after everything succeeds
      const client = await initMatrixClient(
        homeserver,
        accessToken,
        userId,
        deviceId
      );
      registerEventHandlers(client);

      // Only mark as logged in after client is fully initialized
      useAuthStore.getState().setCredentials({
        accessToken,
        userId,
        deviceId,
        homeserverUrl: homeserver,
      });
    } catch (err: unknown) {
      console.error("Login error:", err);
      // Safety: ensure we're logged out if anything failed
      useAuthStore.getState().logout();
      let msg = isRegisterMode
        ? "Account creation failed. Please check your details."
        : "Login failed. Check your credentials.";
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
          {isRegisterMode ? "Create your account" : "Welcome back!"}
        </h1>
        <p className="mb-6 text-center text-sm text-text-muted">
          {isRegisterMode ? "Register a new Matrix account" : "Log in with your Matrix account"}
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
              Username / MXID
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

          {isRegisterMode && (
            <>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Confirm password"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
                  Registration Token (optional)
                </label>
                <input
                  type="text"
                  value={registrationToken}
                  onChange={(e) => setRegistrationToken(e.target.value)}
                  className="w-full rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Required on some homeservers"
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-sm bg-accent p-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading
              ? (isRegisterMode ? "Creating account..." : "Logging in...")
              : (isRegisterMode ? "Create Account" : "Log In")}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setError(null);
              setIsRegisterMode((v) => !v);
              setConfirmPassword("");
              setRegistrationToken("");
            }}
            className="w-full rounded-sm border border-bg-active p-2.5 text-sm text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
          >
            {isRegisterMode ? "I already have an account" : "Create a new account"}
          </button>
        </form>
      </div>
    </div>
  );
}
