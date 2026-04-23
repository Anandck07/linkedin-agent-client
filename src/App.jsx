import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import LinkedInCallback from "./pages/LinkedInCallback";
import ResetPassword from "./pages/ResetPassword";
import Pricing from "./pages/Pricing";
import { useAuth } from "./AuthContext";

export default function App() {
  const { token } = useAuth();
  return (
    <Routes>
      <Route path="/" element={token ? <Navigate to="/dashboard" /> : <Landing />} />
      <Route path="/auth" element={token ? <Navigate to="/dashboard" /> : <AuthPage />} />
      <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <AuthPage />} />
      <Route path="/register" element={token ? <Navigate to="/dashboard" /> : <AuthPage />} />
      <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/" />} />
      <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/pricing" element={<Pricing />} />
    </Routes>
  );
}
