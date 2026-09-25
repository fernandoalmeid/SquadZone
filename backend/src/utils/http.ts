export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function parseId(value: unknown): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "Invalid id");
  }
  return id;
}

export function requireText(value: unknown, field: string, max: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    throw new HttpError(400, `${field} is required`);
  }
  if (text.length > max) {
    throw new HttpError(400, `${field} must be at most ${max} characters`);
  }
  return text;
}

export function parseIdList(value: unknown): number[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new HttpError(400, "Invalid list of ids");
  }
  return [...new Set(value.map(parseId))];
}

export function parseColor(value: unknown): string {
  if (value === undefined) {
    return "#8b7fd6";
  }
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new HttpError(400, "Color must be a hex value like #8b7fd6");
  }
  return value.toLowerCase();
}
