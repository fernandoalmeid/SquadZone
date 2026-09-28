import { useState, type ChangeEvent, type FormEvent } from "react";

function SignupForm() {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const signupData = {
      email: formData.email,
      username: formData.username,
      password: formData.password,
    };

    console.log("Signup:", signupData);
  };

  return (
    <div className="login-card">
      <h1>Create Account</h1>

      <p className="subtitle">
        Create your SquadZone account
      </p>

      <form onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Email</span>

          <span className="input-wrap">
            <input
              type="email"
              name="email"
              placeholder="Enter your Email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </span>
        </label>

        <label className="field">
          <span className="field-label">Username</span>

          <span className="input-wrap">
            <input
              type="text"
              name="username"
              placeholder="Enter your Username"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
              required
            />
          </span>
        </label>

        <label className="field">
          <span className="field-label">Password</span>

          <span className="input-wrap">
            <input
              type="password"
              name="password"
              placeholder="Enter your Password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </span>
        </label>

        <label className="field">
          <span className="field-label">Confirm Password</span>

          <span className="input-wrap">
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm your Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </span>
        </label>

        {error && (
          <p className="form-error">
            {error}
          </p>
        )}

        <button type="submit" className="login-btn">
          Sign Up
        </button>
      </form>
    </div>
  );
}

export default SignupForm;