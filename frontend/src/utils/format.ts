import type { Member, Role } from "../types/app.ts";

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0]!.charAt(0) + words[1]!.charAt(0) : name.slice(0, 2);
  return letters.toUpperCase();
}

export function formatTime(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === today.toDateString()) {
    return `Today at ${time}`;
  }
  return `${date.toLocaleDateString()} ${time}`;
}

export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  return err instanceof Error ? err.message : fallback;
}

export function memberColor(member: Member, roles: Role[]): string | undefined {
  return roles.find((role) => member.roleIds.includes(role.id))?.color;
}
