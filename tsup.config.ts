// tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],       // Your entry point
    dts: true,                     // Generate .d.ts
    format: ["cjs", "esm"],        // Emit both CJS and ESM
    outDir: "dist",                // Output folder
    sourcemap: true,               // Optional: emit sourcemaps
    clean: true,                   // Clean output dir before build
    target: "esnext",              // Match tsconfig target
});