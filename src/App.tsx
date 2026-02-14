import { useAuthStore } from "@/stores/authStore";
import { LoginPage } from "@/pages/LoginPage";
import { MainPage } from "@/pages/MainPage";

function App() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  return isLoggedIn ? <MainPage /> : <LoginPage />;
}

export default App;
