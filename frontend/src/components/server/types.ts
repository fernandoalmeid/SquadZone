import type { Category, Channel } from "../../types/app.ts";

export type ServerModal =
  | { type: "settings" }
  | { type: "invite" }
  | { type: "category"; category?: Category }
  | { type: "channel"; channel?: Channel; categoryId?: number | null };
