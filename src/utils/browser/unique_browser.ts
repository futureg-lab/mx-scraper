import { CustomBrowser } from "./browser.ts";

export class UniqueBrowser {
  private static browser: CustomBrowser | null = null;
  private constructor() {}

  /**
   * @param type
   * @returns global instance of `UniqueBrowser` | create a new one if not defined
   */
  static async getInstance() {
    if (UniqueBrowser.browser == null) {
      UniqueBrowser.browser = await CustomBrowser.create();
    }
    return UniqueBrowser.browser!;
  }

  /**
   * Free all resources
   */
  static async destroy() {
    await UniqueBrowser.browser?.destroy();
    UniqueBrowser.browser = null;
  }
}
