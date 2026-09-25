import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.ts";
import FormField from "./FormField.tsx";
import { LockIcon, MailIcon, UserIcon } from "./Icons.tsx";

function SignupForm() {
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      await signup({
        email: formData.email,
        username: formData.username,
        password: formData.password,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="login-card">
      <h1>Create Account</h1>
      <p className="subtitle">Create your SquadZone account</p>

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
          label="Username"
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Enter your Username"
          autoComplete="username"
          minLength={3}
          maxLength={50}
          pattern="[A-Za-z0-9_]+"
          title="Letters, numbers and _ only"
          required
          icon={<UserIcon />}
        />

        <FormField
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter your Password"
          autoComplete="new-password"
          required
          icon={<LockIcon />}
        />

        <FormField
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm your Password"
          autoComplete="new-password"
          required
          icon={<LockIcon />}
        />

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="login-btn" disabled={submitting}>
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="switch-text">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}

export default SignupForm;
