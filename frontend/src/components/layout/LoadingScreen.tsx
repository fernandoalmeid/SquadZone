import AuthLayout from "./AuthLayout.tsx";

function LoadingScreen() {
  return (
    <AuthLayout>
      <div className="login-card">
        <p className="subtitle loading-text">Loading…</p>
      </div>
    </AuthLayout>
  );
}

export default LoadingScreen;
