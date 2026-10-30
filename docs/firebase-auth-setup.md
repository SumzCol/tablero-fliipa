# Google Sign-In (Firebase Auth) — tablero STG

## Error `redirect_uri_mismatch`

Suele pasar si Google Sign-In se configuró con un **cliente OAuth de IAP** (Cloud IAP). Ese cliente **no** admite el redirect de Firebase:

`https://product-fintech-dev.firebaseapp.com/__/auth/handler`

**Solución (una vez por proyecto):**

1. Quitar IdP roto (opcional, si ya falló):
   ```bash
   node scripts/fix-firebase-google-oauth.mjs
   ```
2. Abrir [Firebase → Authentication → Sign-in method → Google](https://console.firebase.google.com/project/product-fintech-dev/authentication/providers).
3. **Enable** → correo de apoyo del proyecto → **Save**.

Firebase crea/enlaza un **OAuth Web** válido (`.apps.googleusercontent.com`) con el redirect correcto.

4. Comprobar dominios y bootstrap:
   ```bash
   npm run firebase:auth-bootstrap
   ```

**No uses** `gcloud beta iap oauth-clients create` para el login del tablero.

### Cliente OAuth manual (alternativa)

Si creas **Credentials → OAuth client ID → Web application** en GCP:

| Campo | Valor |
| --- | --- |
| Authorized JavaScript origins | `https://dev-apps.fliipa.com`, `https://product-fintech-dev.firebaseapp.com`, `http://localhost` |
| Authorized redirect URIs | `https://product-fintech-dev.firebaseapp.com/__/auth/handler` |

Luego:

```bash
export FIREBASE_GOOGLE_OAUTH_CLIENT_ID="….apps.googleusercontent.com"
export FIREBASE_GOOGLE_OAUTH_CLIENT_SECRET="…"
npm run firebase:auth-bootstrap
```

(No commitear el secret.)

## Bootstrap automático (dominios + Identity Platform)

```bash
npm run firebase:auth-bootstrap
```

Inicializa Identity Platform y dominios autorizados (`dev-apps.fliipa.com`, Run, `localhost`). **No** sustituye el paso de activar Google en Firebase Console la primera vez.

Web app: **Fliipa Board** (`1:261303577112:web:a6fc7092b9ba8af2b5716d`). Config en `src/features/auth/firebaseConfig.ts`.

## Allowlist y miembros

- Semilla: `npm run seed:access` (correos `@sumz.co`, alias, Fran = admin).
- Servidor: `BOARD_BOOTSTRAP_EMAILS` en Cloud Run.

## Deploy del tablero

```bash
npm run deploy
```

`BOARD_REQUIRE_AUTH=1` en Cloud Run.
