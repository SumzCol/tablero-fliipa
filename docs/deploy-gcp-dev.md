# Tablero Fliipa en GCP (STG · `product-fintech-dev`)

Objetivo: **persistencia en Firestore** (no gist / no `localStorage` como fuente de verdad) y **hosting en Cloud Run**, con dominio opcional bajo el stack STG existente.

## Por qué Firestore (y no Cloud SQL)

| Opción | Coste ~6 usuarios | Complejidad |
| --- | --- | --- |
| **Firestore (Native)** | Suele quedar en **free tier** (50k lecturas / 20k escrituras / día, 1 GiB) | Baja: un documento JSON |
| Cloud SQL (`creds-dev-pg`) | Instancia ya pagada del stack, pero **mezclar** tablero con `fliipa_banking_core` es mala idea | Alta: esquema, proxy, migraciones |

El tablero guarda un **blob JSON** (mismas claves que antes: `fliipa-kanban:tasks`, `file:*`, etc.) en:

- Colección: `fliipa_kanban`
- Documento: `shared`
- Campo: `payloadJson`

## Coste esperado

- **Cloud Run**: escala a 0; con uso bajo-medio de 6 personas suele ser **centavos/mes** (millones de requests gratis).
- **Firestore**: uso interno bajo → **$0** en la práctica.
- **Dominio**: no compra dominio nuevo; se cuelga de **`dev-apps.fliipa.com`** (ya pagado en STG).

## Desplegar

```bash
chmod +x scripts/deploy-gcp-dev.sh
GCP_PROJECT_ID=product-fintech-dev ./scripts/deploy-gcp-dev.sh
```

El script crea la base **Firestore Native** en la región si aún no existe, genera o reutiliza `BOARD_WRITE_KEY` en `.env.gcp.local` (gitignored vía `.env.*`), configura `gcr.io` en Docker y despliega Cloud Run.

**Sembrar datos** (misma forma que el blob de GH Pages):

```bash
gcloud auth application-default login
BOARD_STORE=firestore GCP_PROJECT_ID=product-fintech-dev \
  node scripts/import-board-export.mjs exports/board-from-gh-pages.json
```

Variables útiles:

- `GCP_PROJECT_ID` (default `product-fintech-dev`)
- `APP_BASE_PATH` (default `/board`) → build con `VITE_BASE=/board/`
- `BOARD_WRITE_KEY` (opcional): si se define en Cloud Run, los `PUT` exigen header `X-Fliipa-Board-Key`

## Dominio custom (recomendado)

Patrón igual que admin/redemption en **`dev-apps.fliipa.com`**.

1. Desplegar Cloud Run como `fliipa-kanban-dev` (script arriba).
2. En **`credits-platform`**, editar `terraform/envs/dev/firebase.json` sitio `creds-dev` y añadir **antes** del catch-all de admin:

```json
{
  "source": "/board",
  "run": {
    "serviceId": "fliipa-kanban-dev",
    "region": "us-central1"
  }
},
{
  "source": "/board/**",
  "run": {
    "serviceId": "fliipa-kanban-dev",
    "region": "us-central1"
  }
}
```

3. Redeploy Firebase Hosting (workflow DEV de credits-platform).
4. URL final: **`https://dev-apps.fliipa.com/board/`**

El contenedor ya usa `APP_BASE_PATH=/board` y el build `VITE_BASE=/board/` para que assets y `/api/board` coincidan con el path que reenvía Firebase.

## Alternativa sin tocar Firebase

Usar solo la URL `*.run.app` del servicio. El cliente detecta el host y **no** cae en modo `localStorage` aislado.

## Migración desde GitHub Gist / Pages

1. Exportar respaldo desde el tablero (JSON).
2. Desplegar Cloud Run + Firestore.
3. Un `PUT` inicial a `/board/api/board` con el JSON importado (o script one-off con `gcloud firestore` escribiendo `payloadJson`).
4. Cambiar bookmark del equipo a `dev-apps.fliipa.com/board/`.

## Local (SQLite, alineado con Firestore)

| Entorno | Store | Documento lógico | Payload |
| --- | --- | --- | --- |
| **Local** | SQLite `data/fliipa-kanban.sqlite` | `shared` | columna `payload_json` |
| **GCP STG** | Firestore `fliipa_kanban/shared` | `shared` | campo `payloadJson` |

`npm run dev` define `BOARD_STORE=sqlite` y usa la **misma** API `/api/board` que en producción (ETag, adjuntos, merge en PUT).

- La base se **crea sola** al primer arranque.
- Si existe `data/board.json` legacy y la DB está vacía, se importa una vez.
- Override: `SQLITE_PATH=./otra/ruta.sqlite npm run dev`
- Firestore en laptop: `BOARD_STORE=firestore GCP_PROJECT_ID=product-fintech-dev` + ADC.
- Legacy: `BOARD_STORE=file` sigue disponible.

## Seguridad

- STG interno: `--allow-unauthenticated` como el resto de front STG.
- Opcional: `BOARD_WRITE_KEY` + IAP / VPN si más adelante se expone fuera del equipo.
