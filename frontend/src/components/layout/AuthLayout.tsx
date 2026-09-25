import type { ReactNode } from "react";
import Landscape from "./Landscape.tsx";

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="login-page">
      <Landscape />
      {children}
    </main>
  );
}

export default AuthLayout;
