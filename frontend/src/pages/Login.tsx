import LoginForm from "../components/auth/LoginForm.tsx";
import AuthLayout from "../components/layout/AuthLayout.tsx";

function Login() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}

export default Login;
