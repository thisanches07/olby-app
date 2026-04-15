# Obly App

# Páginas legais (Política de Privacidade / Termos)

As lojas (App Store / Google Play) exigem uma **URL pública (HTTPS)** para a Política de Privacidade.

- Arquivos: `legal/index.html`, `legal/privacy.html`, `legal/terms.html`
- Suporte: `suporte@oblyapp.com`

## Publicar (recomendado: Vercel ou Netlify)

1. Publique a pasta `legal/` como site estático.
2. Use as URLs públicas nas consoles:
   - Política de Privacidade: `https://<seu-dominio-ou-host>/privacy.html`
   - Termos de Uso (opcional, recomendado): `https://<seu-dominio-ou-host>/terms.html`

## Setup

```bash
npm install
```

## iOS local development (without rebuilding on every change)

This app uses native modules (for example `expo-iap`), so Expo Go is not enough for full testing.
Use a Development Build (Dev Client):

1. Build and install the iOS Dev Client once:

```bash
npm run ios:dev:build
```

2. Start the local bundler in Dev Client mode:

```bash
npm run start:dev-client
```

3. Open the installed Dev Client on iPhone and connect to the local server (QR on LAN).

After this first build, day-to-day frontend changes (`.tsx`, styles, business logic) do not require a new EAS build.

If LAN is unavailable in your network, you can still force tunnel mode:

```bash
npm run start:dev-client:tunnel
```

## When you still need a new iOS build

Run a new iOS build only when native layer changes, for example:

- adding/removing native dependencies
- changing native permissions/capabilities
- changing config plugins in `app.json`
- Expo SDK upgrades that affect native code

## Useful commands

```bash
npm run start
npm run start:dev-client
npm run start:dev-client:tunnel
npm run ios:dev:build
npm run lint
```

## Important note for Windows

If you are on Windows, local iOS compilation with Xcode is not available.
The professional workflow is exactly this: build Dev Client once with EAS, then iterate locally with Metro + hot reload.
"# olby-app"
