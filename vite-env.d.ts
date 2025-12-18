
interface AIStudio {
  hasSelectedApiKey(): Promise<boolean>;
  openSelectKey(): Promise<void>;
}

interface Window {
  /**
   * aistudio global object injected by the environment.
   */
  // Removed readonly modifier to resolve the "All declarations of 'aistudio' must have identical modifiers" error.
  aistudio: AIStudio;
}

/**
 * Definition for ProcessEnv to support process.env.API_KEY.
 * This interface merges with existing global declarations.
 */
interface ProcessEnv {
  API_KEY: string;
  [key: string]: string | undefined;
}

/**
 * Definition for the Process interface.
 * This interface merges with existing global declarations.
 */
interface Process {
  env: ProcessEnv;
}

/**
 * The 'process' variable is already declared in the global execution context as a block-scoped 
 * variable (const/let). We remove the 'declare var process' to avoid redeclaration errors
 * while relying on the 'Process' interface above to provide the necessary type information.
 */
