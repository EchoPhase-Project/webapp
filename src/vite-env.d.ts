/// <reference types="vite/client" />

interface ImportMetaEnv {
    /**
     * The developer aids: the /dev playground, the Query devtools, error
     * details. True in the dev server and in a build with
     * VITE_DEV_TOOLS=true; vite.config.ts defines it. Read this, not DEV.
     */
    readonly DEV_TOOLS: boolean;
    /** "true" makes a build with the developer aids (see DEV_TOOLS). */
    readonly VITE_DEV_TOOLS?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
