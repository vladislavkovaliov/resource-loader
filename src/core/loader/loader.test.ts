import test from "node:test";
import assert from "node:assert/strict";

import { LoaderUtils } from "./loader";
import { ScriptLoadError } from "../errors/script-load-error";
import { StyleLoadError } from "../errors/style-load-error";

let originalWindow: any;
let originalDocument: any;

function setupDom() {
    const listeners: Record<string, Function> = {};

    const scriptEl: any = {
        set onload(fn: Function) {
            listeners.load = fn;
        },
        set onerror(fn: Function) {
            listeners.error = fn;
        },
        triggerLoad() {
            listeners.load?.();
        },
        triggerError(err?: any) {
            listeners.error?.(err);
        },
    };

    const linkEl: any = {
        set onload(fn: Function) {
            listeners.load = fn;
        },
        set onerror(fn: Function) {
            listeners.error = fn;
        },
        triggerLoad() {
            listeners.load?.();
        },
        triggerError(err?: any) {
            listeners.error?.(err);
        },
    };

    let appended: any[] = [];

    const head = {
        querySelectorAll: () => [],
        appendChild: (el: any) => {
            appended.push(el);
        },
    };

    const doc = {
        head,
        querySelectorAll: () => appended,
        createElement: (tag: string) => {
            if (tag === "script") return scriptEl;
            if (tag === "link") return linkEl;
            return {};
        },
    };

    return { scriptEl, linkEl, doc, appended };
}

test.beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;

    LoaderUtils["scriptCache"].clear();
    LoaderUtils["styleCache"].clear();
});

test.afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
});

test("loadScript resolves on load", async () => {
    const { scriptEl, doc } = setupDom();

    globalThis.window = { location: { origin: "https://test" } } as any;
    globalThis.document = doc as any;

    const p = LoaderUtils.loadScript({ src: "/a.js" });

    scriptEl.triggerLoad();

    await p;
});

test("loadScript rejects on error", async () => {
    const { scriptEl, doc } = setupDom();

    globalThis.window = { location: { origin: "https://test" } } as any;
    globalThis.document = doc as any;

    const p = LoaderUtils.loadScript({ src: "/a.js" });

    scriptEl.triggerError(new Error("fail"));

    await assert.rejects(p, ScriptLoadError);
});

test("loadScript rejects on timeout", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });

    const { doc } = setupDom();

    globalThis.window = { location: { origin: "https://test" } } as any;
    globalThis.document = doc as any;

    const p = LoaderUtils.loadScript({ src: "/a.js" });

    t.mock.timers.tick(10000);

    await assert.rejects(p, ScriptLoadError);

    t.mock.timers.reset();
});

test("loadScript uses cache", async () => {
    const { scriptEl, doc, appended } = setupDom();

    globalThis.window = { location: { origin: "https://test" } } as any;
    globalThis.document = doc as any;

    const p1 = LoaderUtils.loadScript({ src: "/a.js" });
    const p2 = LoaderUtils.loadScript({ src: "/a.js" });

    scriptEl.triggerLoad();

    await Promise.all([p1, p2]);

    assert.equal(appended.length, 1);
});

test("loadScript resolves if already loaded", async () => {
    globalThis.window = {
        location: { origin: "https://test" },
    } as any;

    globalThis.document = {
        head: {
            querySelectorAll: () => [{ src: "https://test/a.js" }],
        },
    } as any;

    await LoaderUtils.loadScript({ src: "/a.js" });
});

test("unloadScript removes script and clears global", () => {
    let removed = false;

    const script = {
        src: "https://test/a.js",
        remove: () => {
            removed = true;
        },
    };

    globalThis.window = {
        location: { origin: "https://test" },
        app: {},
    } as any;

    globalThis.document = {
        querySelectorAll: () => [script],
    } as any;

    LoaderUtils.unloadScript("/a.js", {
        globalVar: "app",
        destroy: () => {},
    });

    assert.equal(removed, true);
    assert.equal((globalThis.window as any).app, undefined);
});

test("loadStyle resolves on load", async () => {
    const { linkEl, doc } = setupDom();

    globalThis.window = { location: { origin: "https://test" } } as any;
    globalThis.document = doc as any;

    const p = LoaderUtils.loadStyle("/a.css");

    linkEl.triggerLoad();

    await p;
});

test("loadStyle rejects on error", async () => {
    const { linkEl, doc } = setupDom();

    globalThis.window = { location: { origin: "https://test" } } as any;
    globalThis.document = doc as any;

    const p = LoaderUtils.loadStyle("/a.css");

    linkEl.triggerError();

    await assert.rejects(p, StyleLoadError);
});

test("unloadStyle removes link", () => {
    let removed = false;

    const link = {
        href: "https://test/a.css",
        remove: () => {
            removed = true;
        },
    };

    globalThis.window = {
        location: { origin: "https://test" },
    } as any;

    globalThis.document = {
        querySelectorAll: () => [link],
    } as any;

    LoaderUtils.unloadStyle("/a.css");

    assert.equal(removed, true);
});
