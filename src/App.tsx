import { useAuthStore } from "@/stores/authStore";
import { getMatrixClient } from "@/lib/matrix";
import { LoginPage } from "@/pages/LoginPage";
import { MainPage } from "@/pages/MainPage";
import { ThemeProvider } from "@/components/settings/ThemeProvider";

function App() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  // Show main app if logged in OR we have an active client (avoids blank screen when
  // persist rehydration overwrites isLoggedIn to false briefly after login)
  const showMainApp = isLoggedIn || !!getMatrixClient();

  return (
    <ThemeProvider>
      {showMainApp ? <MainPage /> : <LoginPage />}
    </ThemeProvider>
  );
}

export default App;
