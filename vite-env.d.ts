
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
   */
  // เปลี่ยนเป็น optional เพื่อให้ตรวจสอบได้ง่ายขึ้นในโค้ด
  aistudio?: AIStudio;
}

/**
 * Definition for the Process interface.
 * Merges with the existing global Process interface to provide typing for process.env.
 */
interface Process {
  env: { [key: string]: string };
}
