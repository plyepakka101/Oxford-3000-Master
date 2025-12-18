
/**
 * Interface for the Gemini AI Studio environment functions.
 * Renamed to GeminiAIStudio to avoid potential naming collisions with existing global interfaces.
 */
interface GeminiAIStudio {
  hasSelectedApiKey(): Promise<boolean>;
  openSelectKey(): Promise<void>;
}

interface Window {
  /**
   * aistudio global object injected by the environment.
   * Re-added 'readonly' to match the modifier used in the environment's internal declarations.
   */
  readonly aistudio: GeminiAIStudio;
}

/**
 * Definition for ProcessEnv to support process.env.API_KEY.
 * The index signature must be strictly 'string' to match the expected global { [key: string]: string } type.
 */
interface ProcessEnv {
  [key: string]: string;
  API_KEY: string;
}

/**
 * Definition for the Process interface.
 * Merges with the existing global Process interface to provide typing for process.env.
 */
interface Process {
  env: ProcessEnv;
}
