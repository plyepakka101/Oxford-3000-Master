
// Fix: Removed /// <reference types="vite/client" /> to resolve "Cannot find type definition" error.
interface ImportMetaEnv {
  readonly VITE_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}
