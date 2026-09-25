import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.ts";
import FormField from "./FormField.tsx";
import { LockIcon, MailIcon } from "./Icons.tsx";

function LoginForm() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="login-card">
      <h1>Welcome Back</h1>
      <p className="subtitle">Sign in to your SquadZone account</p>

      <form onSubmit={handleSubmit}>
        <FormField
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your Email"
          autoComplete="email"
          required
          icon={<MailIcon />}
        />

        <FormField
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter your Password"
          autoComplete="current-password"
          required
          icon={<LockIcon />}
        />

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="login-btn" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="switch-text">
        Don't have an account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
}

export default LoginForm;
