
// Use interface merging to augment the existing global Process and ProcessEnv types.
// This avoids the "Cannot redeclare block-scoped variable 'process'" error and 
// satisfies the requirement for 'process' to match the system-defined 'Process' type.
interface ProcessEnv {
  API_KEY: string;
  [key: string]: string | undefined;
}

interface Process {
  env: ProcessEnv;
}

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
