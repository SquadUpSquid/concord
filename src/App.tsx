import { useAuthStore } from "@/stores/authStore";
import { LoginPage } from "@/pages/LoginPage";
import { MainPage } from "@/pages/MainPage";
import { ThemeProvider } from "@/components/settings/ThemeProvider";

function App() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  return (
    <ThemeProvider>
      {isLoggedIn ? <MainPage /> : <LoginPage />}
    </ThemeProvider>
  );
}

export default App;
