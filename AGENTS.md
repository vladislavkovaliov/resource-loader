# resource-loader

## Commands

| Command | What it does |
|---------|-------------|
| `npm test` | Runs tests via Node test runner (no Jest/Vitest) |
| `npm run lint:fix` | Biome format on `src/` |
| `npm run prepare` | Husky install |

Husky pre-commit runs `lint:fix` then `test` (no standalone typecheck step).

## Test quirks

Uses `node:test` + `node:assert/strict` with `tsx` loader:
```
node --import tsx --test src/core/loader/loader.test.ts
```
- No test runner config file exists.
- Tests mock `globalThis.window` / `globalThis.document` to simulate browser DOM.
- Cache (`scriptCache` / `styleCache`) is tested by reaching into private static fields — clear before each test.

## Path alias

`#/` maps to `src/` via tsconfig `paths`. Resolved by tsup via tsconfig; also works in tests via tsx.

## Build

tsup → CJS + ESM in `dist/` with `.d.ts` and sourcemaps. Entry: `src/index.ts` (currently empty — real code lives under `src/core/`).

## Release

semantic-release on `dev`, `main`, and `rc/*` branches. Uses conventional commits with a custom commitizen adapter (`cz-adapter/`). npmPublish is off (private package). Draft GitHub releases.

Engine: Node 24, npm 11.
