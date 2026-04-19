export class ScriptLoadError extends Error {
    constructor(
        public src: string,
        cause?: unknown,
    ) {
        super(`Failed to load script: ${src}`);

        this.name = "ScriptLoadError";
        this.cause = cause;
    }
}
