# resource-loader

A lightweight TypeScript library for dynamically loading and unloading scripts and stylesheets in the browser.

## Features

- Load `<script>` and `<link rel="stylesheet">` at runtime
- Request deduplication via in-memory cache
- 10-second timeout with typed errors
- Check if a resource is already present in the DOM
- Unload with optional global variable cleanup and `destroy()` callback
- SSR-safe — gracefully no-ops outside the browser
- Built with TypeScript, distributed as CJS + ESM via tsup

## Installation

```bash
npm install resource-loader
```

## API

### `loadScript({ src, params? })`

Injects a `<script>` element into `<head>`. Returns a `Promise<void>` that resolves on load or rejects with `ScriptLoadError`.

- `src` — script URL
- `params` — optional attributes (`async`, `defer`, `type`, `crossOrigin`, `integrity`, etc.)

```ts
import { LoaderUtils } from "resource-loader";

await LoaderUtils.loadScript({
  src: "https://cdn.example.com/widget.js",
  params: { async: true },
});
```

### `loadStyle(href)`

Injects a `<link rel="stylesheet">` into `<head>`. Returns a `Promise<void>` that resolves on load or rejects with `StyleLoadError`.

```ts
await LoaderUtils.loadStyle("https://cdn.example.com/styles.css");
```

### `unloadScript(src, options?)`

Removes the matching `<script>` from the DOM and clears the cache.

- `options.globalVar` — deletes `window[globalVar]` after removal
- `options.destroy` — called before the element is removed

```ts
LoaderUtils.unloadScript("https://cdn.example.com/widget.js", {
  globalVar: "MyWidget",
});
```

### `unloadStyle(href)`

Removes the matching `<link>` from the DOM and clears the cache.

```ts
LoaderUtils.unloadStyle("https://cdn.example.com/styles.css");
```

### `isScriptLoaded(src)`

Returns `true` if a `<script>` with the given URL is already in `<head>`.

### `isStyleLoaded(href)`

Returns `true` if a `<link>` with the given URL is already in `<head>`.

## Errors

- **`ScriptLoadError`** — thrown when a script fails to load or times out
- **`StyleLoadError`** — thrown when a stylesheet fails to load or times out

Both include the resource URL and the underlying cause.

## Development

```bash
npm test              # node --import tsx --test src/core/loader/loader.test.ts
npm run lint:fix      # biome format --write src
```

## CI/CD

- **Branches:** `dev`, `main`, `rc/*`
- **Release:** conventional commits + semantic-release → draft GitHub releases
- **Node:** 24 / **npm:** 11
