
// Fix: Removed problematic vite/client reference to resolve "Cannot find type definition file" error
export {};

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }

  /**
   * Fix: Augment the existing NodeJS namespace instead of redeclaring the 'process' variable.
   * This resolves "Subsequent variable declarations must have the same type" and
   * "Cannot redeclare block-scoped variable 'process'" errors by extending existing Node types.
   */
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
      [key: string]: string | undefined;
    }
  }

  /**
   * Fix: Manually provide ImportMeta types since the vite/client reference was removed.
   * These define the structure of import.meta.env used in Vite environments.
   */
  interface ImportMetaEnv {
    readonly VITE_API_KEY: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
