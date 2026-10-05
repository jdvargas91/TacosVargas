/** Nombre de persona: letras (con acentos), espacios y puntuación básica. Sin dígitos. */
export function isValidPersonName(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 2) return false;
  if (/\d/.test(trimmed)) return false;
  if (!/[a-záéíóúüñ]/i.test(trimmed)) return false;
  return /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ][a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s.'’-]*$/u.test(trimmed);
}

export function personNameError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Escribe el nombre del cliente.";
  if (/\d/.test(trimmed)) return "El nombre solo puede tener letras, no números.";
  if (!isValidPersonName(trimmed)) return "Escribe un nombre válido (solo texto, al menos 2 letras).";
  return null;
}
