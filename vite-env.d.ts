
// Removed /// <reference types="vite/client" /> to resolve "Cannot find type definition file" error.

interface AIStudio {
  hasSelectedApiKey(): Promise<boolean>;
  openSelectKey(): Promise<void>;
}

interface Window {
  /**
   * Fix: Removed 'readonly' modifier to match existing declarations and resolve
   * the "All declarations of 'aistudio' must have identical modifiers" error.
   */
  aistudio: AIStudio;
}

/**
 * Fix: Augment the existing NodeJS.ProcessEnv interface instead of redeclaring the
 * 'process' variable. This resolves the conflict with standard Node.js type definitions
 * and avoids "Subsequent variable declarations must have the same type" and 
 * "Cannot redeclare block-scoped variable" errors.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}
