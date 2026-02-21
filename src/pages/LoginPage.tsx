import { useMemo, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { loginToMatrix, registerToMatrix, initMatrixClient } from "@/lib/matrix";
import { registerEventHandlers } from "@/lib/matrixEventHandlers";
import { TitleBar } from "@/components/layout/TitleBar";

export function LoginPage() {
  const [homeserver, setHomeserver] = useState("https://matrix.org");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordChecks = useMemo(() => ({
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }), [password]);
  const isPasswordStrong = passwordChecks.length
    && passwordChecks.lower
    && passwordChecks.upper
    && passwordChecks.number
    && passwordChecks.symbol;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { accessToken, userId, deviceId } = await loginToMatrix(homeserver, username, password);

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

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRegisterSuccess(null);
    setLoading(true);

    try {
      if (!isPasswordStrong) {
        throw new Error("Password is too weak. Use at least 8 chars with upper/lowercase, number, and symbol.");
      }
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const { userId } = await registerToMatrix(homeserver, username, password, registrationToken);
      setRegisterSuccess(`Account created successfully (${userId}). Go back to login to sign in.`);
      setPassword("");
      setConfirmPassword("");
      setRegistrationToken("");
    } catch (err: unknown) {
      console.error("Registration error:", err);
      let msg = "Account creation failed. Please check your details.";
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
    <div className="flex h-screen w-screen flex-col bg-bg-tertiary">
      <TitleBar />
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-md bg-bg-primary p-8 shadow-lg">
          <h1 className="mb-2 text-center text-2xl font-bold text-text-primary">
            {showCreateAccount ? "Create your account" : "Welcome back!"}
          </h1>
          <p className="mb-6 text-center text-sm text-text-muted">
            {showCreateAccount ? "Register a new Matrix account" : "Log in with your Matrix account"}
          </p>

          <form onSubmit={showCreateAccount ? handleCreateAccount : handleLogin} className="flex flex-col gap-4">
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
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
                placeholder="Password"
                required
              />
            </div>
            <label className="mt-[-8px] flex cursor-pointer items-center gap-2 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-bg-active bg-bg-input"
              />
              Show password
            </label>

            {showCreateAccount && (
              <>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
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
                <div className="rounded-sm bg-bg-secondary p-3 text-xs text-text-muted">
                  <p className="mb-2 font-semibold uppercase text-text-secondary">Password strength</p>
                  <ul className="space-y-1">
                    <li className={passwordChecks.length ? "text-green" : "text-text-muted"}>At least 8 characters</li>
                    <li className={passwordChecks.lower ? "text-green" : "text-text-muted"}>At least one lowercase letter</li>
                    <li className={passwordChecks.upper ? "text-green" : "text-text-muted"}>At least one uppercase letter</li>
                    <li className={passwordChecks.number ? "text-green" : "text-text-muted"}>At least one number</li>
                    <li className={passwordChecks.symbol ? "text-green" : "text-text-muted"}>At least one symbol</li>
                  </ul>
                </div>
              </>
            )}

            {error && (
              <p className="text-sm text-red">{error}</p>
            )}
            {registerSuccess && (
              <p className="text-sm text-green">{registerSuccess}</p>
            )}

            <button
              type="submit"
              disabled={loading || (showCreateAccount && !isPasswordStrong)}
              className="mt-2 w-full rounded-sm bg-accent p-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {loading
                ? (showCreateAccount ? "Creating account..." : "Logging in...")
                : (showCreateAccount ? "Create Account" : "Log In")}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setError(null);
                setRegisterSuccess(null);
                setPassword("");
                setConfirmPassword("");
                setRegistrationToken("");
                setShowCreateAccount((v) => !v);
              }}
              className="w-full rounded-sm border border-bg-active p-2.5 text-sm text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
            >
              {showCreateAccount ? "Back to Login" : "Create a new account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
