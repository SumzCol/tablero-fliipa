/** true solo en desarrollo local (vite dev o localhost); false en builds desplegados. */
export function isLocalDevEnvironment() {
  if (import.meta.env?.DEV) return true;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}
