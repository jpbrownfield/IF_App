# FableForge

An Android-focused progressive web app for downloading and playing Z-machine and Glulx interactive fiction with the bundled Parchment interpreter.

The bundled interpreter is the official Parchment 2026.8.23 single-file release with a small FableForge integration block for reading colors, font sizing, iframe playback, the custom keyboard bridge, and native-aware service-worker behavior.

## Development

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Create a production build with `npm run build`. Service workers require HTTPS (or localhost), so offline playback should be tested with `npm run preview` rather than by opening `index.html` directly.

### Run from VS Code

Use **Terminal → Run Task → Run FableForge locally**, or run `./run-local.ps1` in the integrated PowerShell terminal. The launcher installs missing dependencies, creates a production build, starts the preview server, and opens the app. Press `Ctrl+C` to stop it.

### Browser tests

Install the Chromium test browser once with `npx playwright install chromium`, then run `npm run test:e2e`. The suite uses an emulated Pixel 7 viewport and covers navigation, catalog filtering, local-file import, IndexedDB storage, and the service-worker story route.

## Android

The same Vite build is packaged as a native Android app with Capacitor. Install current Android Studio and its Android SDK, then use:

```powershell
npm run android:open
```

That command builds the web app, syncs `dist` into the native project, and opens the `android` directory in Android Studio. `npm run android:run` runs it on a connected device or emulator, while `npm run android:build` creates a native build from the command line.

The application ID is `io.github.jpbrownfield.fableforge`. Change it before the first Play Store release if a different permanent ID is preferred. GitHub Actions also compiles an unsigned debug APK and retains it as the `fableforge-debug-apk` workflow artifact. Release signing is intentionally not configured until an upload keystore is created and stored as GitHub secrets.

## How storage works

- Downloaded story files live in IndexedDB.
- Library metadata lives in local storage.
- Parchment's VM autosave is enabled and restores progress using the story's stable local URL.
- Removing browser site data removes downloaded stories and progress.

## Settings

Settings are stored locally and include the custom-keyboard master switch, keyboard color, story font size, a 25-color reading palette, Parchment autosave, and an app-update check. The compact custom keyboard has letters without punctuation, a separate movement command bar, common parser shortcuts, optional glide typing, and continuous browser/Android dictation when supported. Dictation remains active until toggled off and automatically restarts when Android ends a speech session. Parchment's native autosave captures a VM snapshot after every completed turn; the app exposes that supported frequency or lets the user turn it off.

## Story catalog

The Browse Library catalog follows the same basic model as Frotz: IFDB supplies discovery metadata and the IF Archive supplies the playable files. Because IFDB's API is not available to browser JavaScript through CORS, `public/catalog.json` is a generated snapshot rather than an unreliable client-side proxy request.

Run `npm run catalog:update` to refresh it from IFDB. The updater keeps only directly playable Z-machine and Glulx files hosted by the IF Archive, caches available cover thumbnails locally, and leaves the existing snapshot intact if IFDB is unavailable. The GitHub Pages workflow also refreshes and redeploys the catalog every Monday.

Users can still import a compatible local file or a direct URL whose server allows browser downloads (CORS).
