import { createContext } from "react";
import type { LoginData, SignupData, UpdateProfileData, User } from "../types/auth.ts";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (data: LoginData) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  updateUser: (data: UpdateProfileData) => Promise<User>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
