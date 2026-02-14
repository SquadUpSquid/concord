import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LoginPage } from "@/pages/LoginPage";
import { MainPage } from "@/pages/MainPage";

function App() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/" /> : <LoginPage />}
        />
        <Route
          path="/*"
          element={isLoggedIn ? <MainPage /> : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
