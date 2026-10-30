/** Nombres legacy del tablero GH Pages → responsable canónico (miembros Sumz). */
export const LEGACY_PERSON_LABEL_MAP: Record<string, string> = {
  "Ale Suárez": "Aleja",
  "Iván Aponte": "Ivan",
  "Alejandro Bohorquez": "William",
  "Jorge Antonio Blanco": "whitte",
  white: "whitte",
  whitte: "whitte",
  "Nicolás Ibagón": "Nicolás",
  "Nicolas Ibagon": "Nicolás",
  "Maria fernanda herazo escobar": "Mafe",
  "María Fernanda Herazo": "Mafe",
};

/** Personas que ya no están en el equipo: se quitan de tareas/iniciativas en seed. */
export const REMOVED_PERSON_LABELS = new Set([
  "Miguel Ángel Rodríguez",
  "Miguel Angel Rodriguez",
]);

export function isSumzOrgEmail(email: string | null | undefined): boolean {
  const norm = String(email || "").trim().toLowerCase();
  return norm.endsWith("@sumz.co");
}
