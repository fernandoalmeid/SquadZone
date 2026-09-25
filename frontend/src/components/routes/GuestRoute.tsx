import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.ts";
import LoadingScreen from "../layout/LoadingScreen.tsx";

function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
<<<<<<< HEAD
  if (user) return <Navigate to="/friends" replace />;
=======
  if (user) return <Navigate to="/" replace />;
>>>>>>> d70a53786ab6670840b679bb743e3f4a9c88c523

  return <Outlet />;
}

export default GuestRoute;
