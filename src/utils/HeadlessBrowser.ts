import * as Puppeteer from "puppeteer";
import { config } from "../environment.ts";
import { DynamicConfigurer } from "../cli/DynamicConfigurer.ts";
import { release as osRelease } from "node:os";

type HeadlessBrowserInfos = {
  exec_path: string;
};

type CustomScript = (browser: Puppeteer.Browser) => Promise<void>; 

export class HeadlessBrowser {
  private browser: Puppeteer.Browser = null;

  private instance_infos: HeadlessBrowserInfos = {
    exec_path: ""
  };

  // Note : we cannot use async operation in a constructor
  // use HeadlessBrowser.create (...) instead
  private constructor() {}

  /**
   * @param type
   */
  private async initializeBrowser() {
    let browser_path = config.BROWSER.EXEC_PATH;

    if (DynamicConfigurer.isDevMode()) {
      if (osRelease().includes("rpi4")) {
        // FIXME: ARM processors
        // https://github.com/puppeteer/puppeteer/issues/7740
        // this only solves the case for RPi4 with chromium installed
        browser_path = "/usr/bin/chromium-browser";
      } else {
        browser_path = Puppeteer.executablePath();
      }
    }

    this.browser = await Puppeteer.launch({
      executablePath: browser_path,
      headless: config.BROWSER.MODE == "HEADLESS" ? "new" : false,
    });
    this.instance_infos.exec_path = browser_path;
  }

  /**
   * Create a new HeadlessBrowser instance
   * @param custom_type
   * @returns
   */
  static async create() {
    const headless = new HeadlessBrowser();
    await headless.initializeBrowser();
    return headless;
  }

  /**
   * Get the rendered html
   * @param target_url
   */
  async getRenderedHtml(target_url: string): Promise<string> {
    const browser = <Puppeteer.Browser> this.browser;
    const page = await browser.newPage();
    await page.goto(target_url, { waitUntil: "networkidle2" });
    return await page.content();
  }

  /**
   * @param fun custom async function
   */
  async runWithinContext(fun: CustomScript) {
    await fun(this.browser);
  }

  /**
   * Free all resources
   */
  async destroy() {
    await this.browser.close();
  }

  getBrowser() {
    return this.browser;
  }

  infos() {
    return this.instance_infos;
  }
}
