#!/usr/bin/env node
/**
 * Quita un Google IdP mal configurado (p. ej. cliente IAP → redirect_uri_mismatch)
 * y deja listo para activar Google en Firebase Console.
 */
import { execSync } from "node:child_process";

const PROJECT = process.env.GCP_PROJECT_ID || "product-fintech-dev";

function token() {
  return execSync("gcloud auth print-access-token", { encoding: "utf8" }).trim();
}

async function delGoogleIdp() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v2/projects/${PROJECT}/defaultSupportedIdpConfigs/google.com`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token()}`,
        "x-goog-user-project": PROJECT,
      },
    }
  );
  if (res.status === 404) return "Google IdP: no existía.";
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`DELETE google.com IdP: ${res.status} ${t}`);
  }
  return "Google IdP: eliminado (cliente IAP / redirect incorrecto).";
}

console.log(await delGoogleIdp());
console.log(
  `\nSiguiente paso (una vez):\n` +
    `  https://console.firebase.google.com/project/${PROJECT}/authentication/providers\n` +
    `  → Google → Enable → Save\n`
);
console.log("Luego: npm run firebase:auth-bootstrap");
