import puppeteer, { Browser } from "puppeteer";
import { config } from "../../mx_configuration.ts";
import { exists } from "std/fs/exists.ts";

type HeadlessBrowserInfos = {
  execPath: string;
};

type CustomScript = (browser: Browser) => Promise<void>;

export class CustomBrowser {
  private browser: Browser | null = null;

  private instanceInfos: HeadlessBrowserInfos = {
    execPath: "",
  };

  // Note : we cannot use async operation in a constructor
  // use HeadlessBrowser.create (...) instead
  private constructor() {}

  private async initializeBrowser() {
    let browserPath: string;
    if (
      config.BROWSER.EXEC_PATH == null || !config.BROWSER.ENABLE
    ) {
      browserPath = puppeteer.executablePath();
    } else {
      browserPath = config.BROWSER.EXEC_PATH;
      if (!await exists(browserPath)) {
        throw new Error(`browser path "${browserPath}" does not exist`);
      }
    }

    this.browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: config.BROWSER.MODE == "HEADLESS",
    });
    this.instanceInfos.execPath = browserPath;
  }

  /**
   * Create a new HeadlessBrowser instance
   */
  static async create() {
    const headless = new CustomBrowser();
    await headless.initializeBrowser();
    return headless;
  }

  /**
   * Get the rendered html
   */
  async getRenderedHtml(targetUrl: string): Promise<string> {
    if (this.browser == null) {
      throw Error("browser not initialized");
    }
    const browser = this.browser;
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: "networkidle2" });
    return await page.content();
  }

  /**
   * Free all resources
   */
  async destroy() {
    await this.browser?.close();
  }

  getBrowser() {
    if (this.browser == null) {
      throw Error("browser not initialized");
    }
    return this.browser;
  }

  infos() {
    return this.instanceInfos;
  }
}
