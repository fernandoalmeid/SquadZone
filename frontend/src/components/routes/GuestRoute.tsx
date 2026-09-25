import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.ts";
import LoadingScreen from "../layout/LoadingScreen.tsx";

function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;

  return <Outlet />;
}

export default GuestRoute;
