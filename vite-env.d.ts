/// <reference types="vite/client" />

// Interface for the AI Studio key selection utility
interface AIStudio {
  hasSelectedApiKey(): Promise<boolean>;
  openSelectKey(): Promise<void>;
}

// Augment the global Window interface with the aistudio property.
// Using the readonly modifier to ensure compatibility with pre-configured environmental definitions.
interface Window {
  readonly aistudio: AIStudio;
}

// Augment the NodeJS global namespace to extend ProcessEnv.
// This is the recommended approach to define environment variables like API_KEY without
// conflicting with the built-in 'process' variable declaration.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: string | undefined;
  }
}
