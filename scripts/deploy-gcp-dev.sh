#!/usr/bin/env bash
# Despliega tablero Fliipa en Cloud Run (STG) con Firestore como backend.
# Requiere: gcloud auth, docker, permisos en product-fintech-dev.
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-product-fintech-dev}"
REGION="${GCP_REGION:-us-central1}"
SERVICE="${KANBAN_SERVICE:-fliipa-kanban-dev}"
IMAGE="${CONTAINER_IMAGE:-gcr.io/${PROJECT_ID}/${SERVICE}}"
APP_BASE_PATH="${APP_BASE_PATH:-/board}"
VITE_BASE="${VITE_BASE:-${APP_BASE_PATH}/}"
SECRETS_FILE="${SECRETS_FILE:-.env.gcp.local}"

if [[ -f "$SECRETS_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a && source "$SECRETS_FILE" && set +a
fi
if [[ -z "${BOARD_WRITE_KEY:-}" ]]; then
  BOARD_WRITE_KEY="$(openssl rand -hex 32)"
  {
    echo "# Generado por deploy-gcp-dev.sh — no commitear"
    echo "BOARD_WRITE_KEY=${BOARD_WRITE_KEY}"
  } >>"$SECRETS_FILE"
  echo "==> BOARD_WRITE_KEY nueva guardada en ${SECRETS_FILE}"
fi

echo "==> Proyecto ${PROJECT_ID} · servicio ${SERVICE} · base ${APP_BASE_PATH}"

gcloud config set project "$PROJECT_ID" >/dev/null

echo "==> Firestore API (idempotente)"
gcloud services enable firestore.googleapis.com --project="$PROJECT_ID" >/dev/null 2>&1 || true

if ! gcloud firestore databases list --project="$PROJECT_ID" --format='value(name)' 2>/dev/null | grep -q .; then
  echo "==> Crear base Firestore Native (${REGION})"
  gcloud firestore databases create --location="$REGION" --type=firestore-native --project="$PROJECT_ID"
fi

RUNTIME_SA="${KANBAN_RUNTIME_SA:-}"
if [[ -z "$RUNTIME_SA" ]]; then
  PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
  RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
fi

echo "==> IAM datastore.user para ${RUNTIME_SA}"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/datastore.user" \
  --condition=None >/dev/null 2>&1 || true

echo "==> Docker auth (gcr.io)"
gcloud auth configure-docker gcr.io --quiet >/dev/null 2>&1 || true

echo "==> Build imagen ${IMAGE}"
export PATH="/usr/bin:/usr/local/bin:${PATH}"
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker no está en PATH (instala Docker o añade /usr/bin al PATH)."
  exit 1
fi
docker build \
  --build-arg "VITE_BASE=${VITE_BASE}" \
  -t "$IMAGE" .
docker push "$IMAGE"

BOOTSTRAP_EMAILS="${BOARD_BOOTSTRAP_EMAILS:-mf.herazo@sumz.co,fj.martinez@sumz.co,da.aviles@sumz.co,a.suarez@sumz.co,if.aponte@sumz.co,wa.bohorquez@sumz.co,ja.blanco@sumz.co,n.ibagon@sumz.co}"

echo "==> Cloud Run deploy"
gcloud run deploy "$SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$IMAGE" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --concurrency=80 \
  --set-env-vars="^:^BOARD_STORE=firestore:GCP_PROJECT_ID=${PROJECT_ID}:FIRESTORE_COLLECTION=fliipa_kanban:FIRESTORE_DOC_ID=shared:APP_BASE_PATH=${APP_BASE_PATH}:BOARD_WRITE_KEY=${BOARD_WRITE_KEY}:BOARD_REQUIRE_AUTH=1:BOARD_BOOTSTRAP_EMAILS=${BOOTSTRAP_EMAILS}"

URL="$(gcloud run services describe "$SERVICE" --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)')"
echo ""
echo "Listo: ${URL}${APP_BASE_PATH}/"
echo "API:   ${URL}${APP_BASE_PATH}/api/board?probe=1"
echo ""
echo "Dominio custom (opcional): ver docs/deploy-gcp-dev.md"
