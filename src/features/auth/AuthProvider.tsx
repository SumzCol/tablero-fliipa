import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from "firebase/auth";
import { firebaseConfig } from "@/features/auth/firebaseConfig";
import {
  registerBoardAccessGate,
  registerBoardAuthFailureHandler,
  registerBoardAuthTokenProvider,
} from "@/shared/lib/storage";
import { formatAuthError } from "@/features/auth/authErrors";

export type AuthContextValue = {
  authRequired: boolean;
  ready: boolean;
  user: User | null;
  token: string;
  error: string;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  email: string;
  accessVerified: boolean;
  checkingAccess: boolean;
  canUseBoard: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function hostedAuthSurface(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location?.hostname || "";
  return (
    host.endsWith(".run.app") ||
    host.endsWith(".fliipa.com") ||
    host.endsWith(".web.app") ||
    host.endsWith(".firebaseapp.com")
  );
}

function firebaseApp(): FirebaseApp {
  if (getApps().length) return getApps()[0]!;
  return initializeApp(firebaseConfig);
}

function boardApiUrl(): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/{2,}/g, "/");
  return `${base}api/board`.replace(/\/{2,}/g, "/");
}

async function verifyBoardAccess(auth: Auth): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: "Inicia sesión con Google" };
  let token: string;
  try {
    token = await user.getIdToken(true);
  } catch {
    return { ok: false, error: "Sesión expirada. Vuelve a iniciar sesión." };
  }
  const res = await fetch(boardApiUrl(), {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) {
    let msg = "Tu cuenta no tiene acceso a este tablero";
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    return { ok: false, error: msg };
  }
  if (!res.ok) return { ok: false, error: "No se pudo validar el acceso al tablero" };
  return { ok: true, token };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const authRequired = hostedAuthSurface();
  const authRef = useRef<Auth | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(!authRequired);
  const [accessVerified, setAccessVerified] = useState(!authRequired);
  const [error, setError] = useState("");
  const [checkingAccess, setCheckingAccess] = useState(false);

  const hardSignOut = useCallback(async (message?: string) => {
    if (message) setError(message);
    setAccessVerified(false);
    setToken("");
    const auth = authRef.current || getAuth(firebaseApp());
    try {
      await firebaseSignOut(auth);
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const runAccessCheck = useCallback(async () => {
    if (!authRequired) {
      setAccessVerified(true);
      return true;
    }
    const auth = authRef.current || getAuth(firebaseApp());
    if (!auth.currentUser) {
      setAccessVerified(false);
      setToken("");
      return false;
    }
    setCheckingAccess(true);
    const result = await verifyBoardAccess(auth);
    setCheckingAccess(false);
    if (!result.ok) {
      await hardSignOut(result.error);
      return false;
    }
    setToken(result.token || "");
    setAccessVerified(true);
    setError("");
    return true;
  }, [authRequired, hardSignOut]);

  useEffect(() => {
    if (!authRequired) {
      registerBoardAccessGate(async () => true);
      registerBoardAuthTokenProvider(async () => "");
      registerBoardAuthFailureHandler(async () => {});
      setReady(true);
      setAccessVerified(true);
      return undefined;
    }

    const auth = getAuth(firebaseApp());
    authRef.current = auth;

    registerBoardAccessGate(async () => {
      if (!auth.currentUser) return false;
      try {
        await auth.currentUser.getIdToken();
        return true;
      } catch {
        return false;
      }
    });

    registerBoardAuthTokenProvider(async () => {
      if (!auth.currentUser) return "";
      return auth.currentUser.getIdToken();
    });

    registerBoardAuthFailureHandler(async (message) => {
      await hardSignOut(
        message?.trim() || "Sesión inválida o expirada. Inicia sesión de nuevo."
      );
    });

    const unsubAuth = onAuthStateChanged(auth, async (next) => {
      setUser(next);
      if (!next) {
        setAccessVerified(false);
        setToken("");
        setReady(true);
        return;
      }
      setReady(false);
      await runAccessCheck();
      setReady(true);
    });

    const unsubToken = onIdTokenChanged(auth, async (next) => {
      if (!next) {
        setToken("");
        setAccessVerified(false);
        return;
      }
      try {
        const t = await next.getIdToken();
        setToken(t);
      } catch {
        await hardSignOut("Sesión expirada. Inicia sesión de nuevo.");
      }
    });

    return () => {
      unsubAuth();
      unsubToken();
    };
  }, [authRequired, hardSignOut, runAccessCheck]);

  const signIn = useCallback(async () => {
    setError("");
    const auth = getAuth(firebaseApp());
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, provider);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      const msg = formatAuthError(err.code, err.message || "No se pudo iniciar sesión");
      setError(msg);
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError("");
    await hardSignOut("");
  }, [hardSignOut]);

  const canUseBoard = !authRequired || (!!user && accessVerified);

  const value = useMemo(
    () => ({
      authRequired,
      ready,
      user,
      token,
      error,
      signIn,
      signOut,
      email: user?.email ? String(user.email).toLowerCase() : "",
      accessVerified,
      checkingAccess,
      canUseBoard,
    }),
    [authRequired, ready, user, token, error, signIn, signOut, accessVerified, checkingAccess, canUseBoard]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuera de AuthProvider");
  return ctx;
}
