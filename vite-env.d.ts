/**
 * Global declaration file for Oxford 3000 Master.
 * This ensures 'process' is recognized by the TypeScript compiler during build.
 */

// Fix: Use namespace augmentation for NodeJS.ProcessEnv instead of redeclaring the global 'process' variable to avoid type mismatch and redeclaration errors
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: string | undefined;
  }
}

interface AIStudio {
  hasSelectedApiKey(): Promise<boolean>;
  openSelectKey(): Promise<void>;
}

interface Window {
  /**
   * aistudio global object injected by the environment.
   */
  // Fix: Remove 'readonly' modifier to ensure consistency with other declarations of the Window interface and fix modifier mismatch error
  aistudio: AIStudio;
}
