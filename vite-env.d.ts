
interface AIStudio {
  hasSelectedApiKey(): Promise<boolean>;
  openSelectKey(): Promise<void>;
}

interface Window {
  /**
   * aistudio global object injected by the environment.
   */
  // Fix: Added readonly modifier to match the environment's declaration and resolve modifier mismatch.
  readonly aistudio: AIStudio;
}

/**
 * ประกาศตัวแปร Process interface และ process แบบ global
 * เพื่อแก้ปัญหา TS2580 และข้อขัดแย้งในการประกาศตัวแปรซ้ำ (TS2403)
 */
// Fix: Use the standard Process interface name to satisfy "Variable 'process' must be of type 'Process'"
interface Process {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  };
}

// Fix: Redefine as var and use the Process interface to ensure type compatibility with existing declarations.
declare var process: Process;
