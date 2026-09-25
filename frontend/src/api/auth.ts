import type { AuthResponse, LoginData, SignupData, User } from "../types/auth.ts";
import { apiRequest } from "./client.ts";

export function login(data: LoginData) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function signup(data: SignupData) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getCurrentUser() {
  return apiRequest<{ user: User }>("/auth/me");
}
