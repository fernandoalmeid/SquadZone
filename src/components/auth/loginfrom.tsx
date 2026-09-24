import { FormEvent, useState } from "react";

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v.5l8 5 8-5V7H4zm16 2.85-7.47 4.67a1 1 0 0 1-1.06 0L4 9.85V17h16V9.85z"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a5 5 0 0 1 5 5v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v3h6V7a3 3 0 0 0-3-3zm0 10a1.5 1.5 0 0 0-1 2.62V18h2v-1.38A1.5 1.5 0 0 0 12 14z"
      />
    </svg>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    console.log({
      email,
      password,
    });
  };

  return (
    <div className="login-card">
      <h1>Welcome Back</h1>
      <p className="subtitle">Sign in to your SquadZone account</p>

      <form onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Email</span>
          <span className="input-wrap">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your Email"
              autoComplete="email"
              required
            />
            <MailIcon />
          </span>
        </label>

        <label className="field">
          <span className="field-label">Password</span>
          <span className="input-wrap">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your Password"
              autoComplete="current-password"
              required
            />
            <LockIcon />
          </span>
        </label>

        <button type="submit" className="login-btn">
          Log in
        </button>
      </form>
    </div>
  );
}

export default LoginForm;
