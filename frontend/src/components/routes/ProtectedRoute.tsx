import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.ts";
import LoadingScreen from "../layout/LoadingScreen.tsx";

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}

export default ProtectedRoute;
