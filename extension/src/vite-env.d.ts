/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly GEMINI_APY_KEY: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }