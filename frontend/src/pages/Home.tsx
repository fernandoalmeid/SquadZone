import AuthLayout from "../components/layout/AuthLayout.tsx";
import { useAuth } from "../hooks/useAuth.ts";

function Home() {
  const { user, logout } = useAuth();

  return (
    <AuthLayout>
      <div className="login-card">
        <h1>Hi, {user?.username}</h1>
        <p className="subtitle">You're signed in as {user?.email}</p>

        <button type="button" className="login-btn" onClick={logout}>
          Log out
        </button>
      </div>
    </AuthLayout>
  );
}

export default Home;
