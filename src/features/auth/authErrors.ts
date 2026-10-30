/** Mensajes claros para errores comunes de Firebase Auth en el tablero. */
export function formatAuthError(code: string | undefined, message: string): string {
  switch (code) {
    case "auth/configuration-not-found":
      return (
        "Firebase Authentication no está activo en este proyecto. " +
        "Un admin debe ejecutar npm run firebase:auth-bootstrap o activar Google en Firebase Console."
      );
    case "auth/operation-not-allowed":
      return (
        "Google Sign-In no está habilitado. Actívalo en Firebase Console → Authentication → Google " +
        "(product-fintech-dev)."
      );
    case "auth/unauthorized-domain":
      return "Este dominio no está autorizado en Firebase. Añade dev-apps.fliipa.com en Authentication → Settings.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Inicia sesión con Google para ver el tablero.";
    default:
      if (/redirect_uri_mismatch/i.test(message)) {
        return (
          "OAuth mal configurado (redirect_uri_mismatch). Un admin debe activar Google en " +
          "Firebase Console → Authentication → Google, no usar clientes IAP. Ver docs/firebase-auth-setup.md."
        );
      }
      return message || "No se pudo iniciar sesión";
  }
}
