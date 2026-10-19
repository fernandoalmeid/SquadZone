export interface User {
  id: number;
  email: string;
  username: string;
  avatar: string | null;
  banner: string | null;
  bio: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  username: string;
  password: string;
}

export interface UpdateProfileData {
  username?: string;
  bio?: string;
  /** data URL (PNG/JPEG/GIF/WebP) or null to remove */
  avatar?: string | null;
  /** data URL (PNG/JPEG/GIF/WebP) or null to remove */
  banner?: string | null;
}
