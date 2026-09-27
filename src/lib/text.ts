/** Repara texto UTF-8 mal interpretado como Latin-1 (ej. CamarÃ³n → Camarón). */
export function repairMojibake(value: string): string {
  if (!value || !/[ÃÂ]/.test(value)) return value;
  try {
    const bytes = Uint8Array.from(Array.from(value, (ch) => ch.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return decoded.includes("\uFFFD") ? value : decoded;
  } catch {
    return value;
  }
}

export function repairDeep<T>(input: T): T {
  if (typeof input === "string") return repairMojibake(input) as T;
  if (Array.isArray(input)) return input.map((item) => repairDeep(item)) as T;
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      out[key] = repairDeep(val);
    }
    return out as T;
  }
  return input;
}
