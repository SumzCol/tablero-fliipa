let adminApp = null;

export function firebaseAdminEnabled() {
  return (process.env.BOARD_REQUIRE_AUTH || "").trim() === "1";
}

async function getAdmin() {
  if (adminApp) return adminApp;
  const { initializeApp, getApps, cert, applicationDefault } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");
  if (getApps().length) {
    adminApp = { auth: getAuth() };
    return adminApp;
  }
  const projectId =
    process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    initializeApp({ credential: cert(cred), projectId: projectId || cred.project_id });
  } else {
    initializeApp({ credential: applicationDefault(), projectId });
  }
  adminApp = { auth: getAuth() };
  return adminApp;
}

export async function verifyFirebaseBearer(headerValue) {
  const raw = String(headerValue || "").trim();
  const token = raw.startsWith("Bearer ") ? raw.slice(7).trim() : "";
  if (!token) return null;
  const { auth } = await getAdmin();
  const decoded = await auth.verifyIdToken(token);
  const email = String(decoded.email || "").trim().toLowerCase();
  if (!email) return null;
  return { email, uid: decoded.uid, name: decoded.name || "" };
}
