
/**
 * Global declaration file for MASTERING Oxford 3000.
 * This file provides global type definitions for the environment.
 */

interface ProcessEnv {
  API_KEY: string;
  [key: string]: string | undefined;
}

interface Process {
  env: ProcessEnv;
}

// Removed 'declare var process: Process' to resolve redeclaration and type mismatch errors.
// By keeping the 'Process' interface, we augment the existing global declaration 
// with the necessary 'env' properties.

interface AIStudio {
  hasSelectedApiKey(): Promise<boolean>;
  openSelectKey(): Promise<void>;
}

interface Window {
  /**
   * AIStudio global object for API key management.
   * Added 'readonly' modifier to match the existing declaration in the host environment.
   */
  readonly aistudio: AIStudio;
}
