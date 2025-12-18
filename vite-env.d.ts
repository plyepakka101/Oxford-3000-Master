
/**
 * Interface for the Gemini AI Studio environment functions.
 */
interface AIStudio {
  hasSelectedApiKey(): Promise<boolean>;
  openSelectKey(): Promise<void>;
}

interface Window {
  /**
   * aistudio global object injected by the environment.
   * Modifiers and types must match the global definition exactly.
   */
  aistudio: AIStudio;
}

/**
 * Definition for the Process interface.
 * Merges with the existing global Process interface to provide typing for process.env.
 * Property 'env' must be exactly '{ [key: string]: string }' to match the global definition.
 */
interface Process {
  env: { [key: string]: string };
}
