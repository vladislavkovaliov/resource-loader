export type ScriptParams = Partial<
    Pick<
        HTMLScriptElement,
        "async" | "defer" | "type" | "crossOrigin" | "noModule" | "referrerPolicy" | "integrity"
    >
> &
    Record<string, unknown>;

export interface ILoadScriptProps {
    src: string;
    params: ScriptParams;
    // params?: any;
    // params: Omit<ScriptHTMLAttribute<HTMLScriptElement>, 'src'>;
}
