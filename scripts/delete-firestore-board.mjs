#!/usr/bin/env node
/** Borra el documento shared del tablero en Firestore. */
process.env.BOARD_STORE = "firestore";
process.env.GOOGLE_CLOUD_PROJECT =
  process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || "product-fintech-dev";

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const collection = process.env.FIRESTORE_COLLECTION || "fliipa_kanban";
const docId = process.env.FIRESTORE_DOC_ID || "shared";

const { Firestore } = await import("@google-cloud/firestore");
const db = new Firestore({ projectId });
const ref = db.collection(collection).doc(docId);
await ref.delete();
console.log(`Eliminado Firestore ${collection}/${docId} en ${projectId}`);
