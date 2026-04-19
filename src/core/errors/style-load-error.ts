export class StyleLoadError extends Error {
    constructor(
        public href: string,
        cause?: unknown,
    ) {
        super(`Failed to load stylesheet: ${href}`);

        this.name = "StyleLoadError";
        this.cause = cause;
    }
}
