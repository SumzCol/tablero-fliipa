#!/usr/bin/env node
/**
 * Bootstrap Firebase Auth en product-fintech-dev (Identity Platform + dominios).
 * Google Sign-In debe activarse en Firebase Console (no usar clientes IAP).
 *
 * Uso: npm run firebase:auth-bootstrap
 */
import { execSync } from "node:child_process";

const PROJECT = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "product-fintech-dev";
const FIREBASE_GOOGLE_CONSOLE =
  `https://console.firebase.google.com/project/${PROJECT}/authentication/providers`;

function gcloudToken() {
  return execSync("gcloud auth print-access-token", { encoding: "utf8" }).trim();
}

async function api(path, { method = "GET", body } = {}) {
  const token = gcloudToken();
  const res = await fetch(`https://identitytoolkit.googleapis.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-goog-user-project": PROJECT,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${json.error?.message || text}`);
  }
  return json;
}

function extraDomains() {
  const fromEnv = (process.env.FIREBASE_AUTHORIZED_DOMAINS || "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  const defaults = [
    "dev-apps.fliipa.com",
    "fliipa-kanban-dev-261303577112.us-central1.run.app",
    "fliipa-kanban-dev-ezfpldyksq-uc.a.run.app",
    "localhost",
  ];
  return [...new Set([...fromEnv, ...defaults])];
}

async function registerGoogleIdpFromEnv() {
  const clientId = (process.env.FIREBASE_GOOGLE_OAUTH_CLIENT_ID || "").trim();
  const clientSecret = (process.env.FIREBASE_GOOGLE_OAUTH_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) return false;

  await api(`/v2/projects/${PROJECT}/defaultSupportedIdpConfigs?idpId=google.com`, {
    method: "POST",
    body: {
      enabled: true,
      name: `projects/${PROJECT}/defaultSupportedIdpConfigs/google.com`,
      clientId,
      clientSecret,
    },
  });
  console.log("Google Sign-In: registrado desde FIREBASE_GOOGLE_OAUTH_* (cliente Web OAuth).");
  return true;
}

async function ensureGoogleIdp() {
  try {
    const cfg = await api(`/v2/projects/${PROJECT}/defaultSupportedIdpConfigs/google.com`);
    if (cfg?.enabled) {
      console.log("Google Sign-In: ya configurado (", cfg.clientId?.slice(0, 20), "…).");
      return;
    }
  } catch (e) {
    if (!String(e.message).includes("404") && !String(e.message).includes("NOT_FOUND")) throw e;
  }

  if (await registerGoogleIdpFromEnv()) return;

  console.log("\n⚠️  Google Sign-In NO está configurado.");
  console.log("Actívalo una vez en Firebase Console (crea el cliente OAuth Web correcto):");
  console.log(`  ${FIREBASE_GOOGLE_CONSOLE}`);
  console.log("  → Sign-in method → Google → Enable → guardar.\n");
  console.log(
    "Si creas el cliente manualmente en GCP (Credentials → OAuth Web), exporta:\n" +
      "  FIREBASE_GOOGLE_OAUTH_CLIENT_ID=….apps.googleusercontent.com\n" +
      "  FIREBASE_GOOGLE_OAUTH_CLIENT_SECRET=…\n" +
      "y vuelve a ejecutar este script.\n"
  );
  console.log("Redirect URI obligatorio en ese cliente:");
  console.log(`  https://${PROJECT}.firebaseapp.com/__/auth/handler`);
}

async function main() {
  console.log(`Proyecto: ${PROJECT}`);
  try {
    await api(`/v2/projects/${PROJECT}/identityPlatform:initializeAuth`, { method: "POST", body: {} });
    console.log("Identity Platform: inicializado.");
  } catch (e) {
    const msg = String(e.message);
    if (
      msg.includes("409") ||
      msg.includes("ALREADY_EXISTS") ||
      msg.includes("already been enabled") ||
      msg.includes("INVALID_PROJECT_ID")
    ) {
      console.log("Identity Platform: ya existía.");
    } else {
      throw e;
    }
  }

  const cfg = await api(`/admin/v2/projects/${PROJECT}/config`);
  const base = cfg.authorizedDomains || [`${PROJECT}.firebaseapp.com`, `${PROJECT}.web.app`];
  const merged = [...new Set([...base, ...extraDomains()])];
  await api(`/admin/v2/projects/${PROJECT}/config?updateMask=authorizedDomains`, {
    method: "PATCH",
    body: { authorizedDomains: merged },
  });
  console.log("Dominios autorizados:", merged.join(", "));

  await ensureGoogleIdp();
  console.log("\nPrueba login: https://dev-apps.fliipa.com/board/");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
