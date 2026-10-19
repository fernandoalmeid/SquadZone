import type { AuthResponse, LoginData, SignupData, UpdateProfileData, User } from "../types/auth.ts";
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

export function updateProfile(data: UpdateProfileData) {
  return apiRequest<{ user: User }>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
