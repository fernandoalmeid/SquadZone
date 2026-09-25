import SignupForm from "../components/auth/SignupForm.tsx";
import AuthLayout from "../components/layout/AuthLayout.tsx";

function Signup() {
  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}

export default Signup;
