import { type ILoadScriptProps } from "#/core/loader/loader.types";
import { ScriptLoadError } from "#/core/errors/script-load-error";
import { StyleLoadError } from "#/core/errors/style-load-error";

export class LoaderUtils {
    private static scriptCache = new Map<string, Promise<void>>();
    private static styleCache = new Map<string, Promise<void>>();

    private static isBrowser(): boolean {
        return typeof document !== "undefined";
    }

    static querySelectorAll<K extends keyof HTMLElementTagNameMap>(
        selector: K,
    ): HTMLElementTagNameMap[K][] {
        return Array.from(document.head.querySelectorAll(selector));
    }

    static isScriptLoaded(src: string): boolean {
        if (!LoaderUtils.isBrowser()) {
            return false;
        }

        const target = new URL(src, window.location.origin).href;

        return this.querySelectorAll("script").some((script) => {
            return new URL(script.src).href === target;
        });
    }

    static isStyleLoaded(href: string): boolean {
        if (!LoaderUtils.isBrowser()) {
            return false;
        }

        const target = new URL(href, window.location.origin).href;

        return this.querySelectorAll("link").some((link) => {
            return new URL(link.href).href === target;
        });
    }

    static loadScript({ src, params = {} }: ILoadScriptProps): Promise<void | ScriptLoadError> {
        if (!this.isBrowser()) {
            return Promise.resolve();
        }

        if (this.scriptCache.has(src)) {
            return this.scriptCache.get(src)!;
        }

        if (LoaderUtils.isScriptLoaded(src)) {
            return Promise.resolve();
        }

        const promise = new Promise<void>((resolve, reject) => {
            if (this.isScriptLoaded(src)) {
                resolve();

                return;
            }

            const script = document.createElement("script");

            Object.assign(script, {
                src,
                async: true,
                defer: false,
                ...params,
            });

            if (!script.type) {
                script.type = "text/javascript";
            }

            const timeout = setTimeout(() => {
                reject(new ScriptLoadError(src, "timeout"));
            }, 10000);

            script.onload = () => {
                clearTimeout(timeout);

                resolve();
            };

            script.onerror = (event) => {
                clearTimeout(timeout);

                reject(new ScriptLoadError(src, event));
            };

            document.head.appendChild(script);
        });

        this.scriptCache.set(src, promise);

        return promise;
    }

    static loadStyle = (href: string): Promise<void | StyleLoadError> => {
        if (!this.isBrowser()) {
            return Promise.resolve();
        }

        if (this.styleCache.has(href)) {
            return this.styleCache.get(href)!;
        }

        const promise = new Promise<void>((resolve, reject) => {
            if (this.isStyleLoaded(href)) {
                resolve();

                return;
            }

            const link = document.createElement("link");

            Object.assign(link, {
                href,
                rel: "stylesheet",
                type: "text/css",
                media: "all",
            });

            const timeout = setTimeout(() => {
                reject(new StyleLoadError(href, "timeout"));
            }, 10000);

            link.onload = () => {
                clearTimeout(timeout);

                resolve();
            };

            link.onerror = (event) => {
                clearTimeout(timeout);

                reject(new StyleLoadError(href, event));
            };

            document.head.appendChild(link);
        });

        this.styleCache.set(href, promise);

        return promise;
    };

    static unloadScript(
        src: string,
        options?: {
            globalVar?: string;
            destroy?: () => void;
        },
    ): void {
        if (!this.isBrowser()) {
            return;
        }

        const target = new URL(src, window.location.origin).href;

        try {
            options?.destroy?.();
        } catch (e) {
            console.warn("Error during destroy()", e);
        }

        const scripts = document.querySelectorAll<HTMLScriptElement>("script");

        scripts.forEach((script) => {
            if (new URL(script.src).href === target) {
                script.remove();
            }
        });

        this.scriptCache.delete(src);

        if (options?.globalVar && (window as any)[options.globalVar]) {
            try {
                delete (window as any)[options.globalVar];
            } catch {
                (window as any)[options.globalVar] = undefined;
            }
        }
    }

    static unloadStyle(href: string): void {
        if (!this.isBrowser()) return;

        const target = new URL(href, window.location.origin).href;

        const links = document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');

        links.forEach((link) => {
            if (new URL(link.href).href === target) {
                link.remove();
            }
        });

        this.styleCache.delete(href);
    }
}
