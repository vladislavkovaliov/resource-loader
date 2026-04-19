import test from "node:test";
import assert from "node:assert/strict";

import { LoaderUtils } from "./loader";
import { ScriptLoadError } from "../errors/script-load-error";

test("loadScript rejects with ScriptLoadError on timeout", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });

    const originalWindow = (globalThis as any).window;
    const originalDocument = (globalThis as any).document;

    const scriptEl: any = {};
    const head = {
        querySelectorAll: () => [],
        appendChild: () => undefined,
    };

    (globalThis as any).window = {
        location: { origin: "https://example.test" },
    };

    (globalThis as any).document = {
        head,
        createElement: () => scriptEl,
    };

    const promise = LoaderUtils.loadScript({ src: "/sdk.js" });

    // Прокручиваем внутренний timeout из loader.ts (10_000ms)
    t.mock.timers.tick(10_000);

    await assert.rejects(promise, (error: unknown) => {
        assert.ok(error instanceof ScriptLoadError);
        assert.equal((error as ScriptLoadError).src, "/sdk.js");
        assert.equal((error as Error).name, "ScriptLoadError");
        return true;
    });

    t.mock.timers.reset();
    (globalThis as any).window = originalWindow;
    (globalThis as any).document = originalDocument;
});
