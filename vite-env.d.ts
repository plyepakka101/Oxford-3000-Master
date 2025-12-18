// Removed problematic vite/client reference and resolved aistudio global type naming conflict

declare global {
  // Fix: Defining the expected AIStudio interface to resolve subsequent declaration conflicts
  interface AIStudio {
    hasSelectedApiKey(): Promise<boolean>;
    openSelectKey(): Promise<void>;
  }

  interface Window {
    // Fix: Using readonly and the proper AIStudio type to ensure identical modifiers and structure
    readonly aistudio: AIStudio;
  }
}

declare var process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  };
};

export {};