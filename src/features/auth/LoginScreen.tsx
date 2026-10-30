import { useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { formatAuthError } from "@/features/auth/authErrors";

export default function LoginScreen() {
  const { signIn, error } = useAuth();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  async function handleLogin() {
    setBusy(true);
    setLocalError("");
    try {
      await signIn();
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code !== "auth/popup-closed-by-user") {
        setLocalError(formatAuthError(err.code, err.message || "Error al iniciar sesión"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0d12",
        color: "#e8eaef",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          background: "#141820",
          border: "1px solid #2a3140",
          borderRadius: 14,
          padding: "28px 24px",
        }}
      >
        <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>Fliipa board</h1>
        <p style={{ margin: "0 0 20px", color: "#9aa3b5", lineHeight: 1.5 }}>
          Debes iniciar sesión con Google (cuenta <strong>@sumz.co</strong> autorizada) para abrir el tablero.
          Sin sesión vigente no hay acceso al contenido.
        </p>
        <button
          type="button"
          onClick={handleLogin}
          disabled={busy}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #3a4458",
            background: "#fff",
            color: "#111",
            fontWeight: 600,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy ? "Abriendo Google…" : "Continuar con Google"}
        </button>
        {(localError || error) && (
          <p style={{ marginTop: 16, color: "#f07178", fontSize: 14 }}>{localError || error}</p>
        )}
      </div>
    </div>
  );
}
