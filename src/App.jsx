import { Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import { useAuth } from "./AuthContext";

export default function App() {
  const { token } = useAuth();
  return (
    <Routes>
      <Route path="/" element={token ? <Navigate to="/dashboard" /> : <AuthPage />} />
      <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/" />} />
    </Routes>
  );
}
