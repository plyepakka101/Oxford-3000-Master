
/**
 * Global declaration file for TypeScript.
 * No 'export' or 'import' at the top level to keep it a global script.
 */

// Fix: Augment the Process and ProcessEnv interfaces to add API_KEY.
// By not using 'declare var process', we avoid redeclaration conflicts
// and allow the existing global 'process' (which is of type 'Process') to be extended.
interface ProcessEnv {
  API_KEY: string;
  [key: string]: string | undefined;
}

interface Process {
  env: ProcessEnv;
}

interface AIStudio {
  hasSelectedApiKey(): Promise<boolean>;
  openSelectKey(): Promise<void>;
}

interface Window {
  // Fix: Removed 'readonly' modifier to ensure identity with other declarations of 'aistudio'.
  // All declarations of the same property on an interface must have identical modifiers for successful merging.
  aistudio: AIStudio;
}
