import axios, { AxiosRequestConfig } from "axios";
import { FlareSolverrClient, FlareSolverrCommand } from "./FlareSolverrClient";
import * as fs from "fs";
import { UniqueHeadlessBrowser } from "./UniqueHeadlessBrowser";
import * as Puppeteer from "puppeteer";

export interface FlareSolverrProxyOption {
  proxy_url: string;
  timeout?: number;
}

const ENABLE_HEADLESS_ERROR = "Headless mode should be enabled first";

/**
 * A request wrapper for axios for 'GET' requests
 */
export class CustomRequest {
  proxy: FlareSolverrProxyOption = null;
  private renderHTML: boolean = false;
  private reuse_instance: boolean = false;

  /**
   * @param option Custom proxy configuration
   */
  constructor(option?: FlareSolverrProxyOption) {
    if (option) {
      this.configureProxy(option);
    }
  }

  /**
   * @param option proxy option {proxy_url, timeout?}
   */
  configureProxy(option: FlareSolverrProxyOption) {
    this.proxy = option;
  }

  /**
   * Enable HTML rendering for GET request
   */
  enableRendering() {
    this.renderHTML = true;
  }

  /**
   * Disable HTML rendering for GET request
   */
  disableRendering() {
    this.renderHTML = false;
  }

  /**
   * Enable Reusing browser instance for GET request
   */
  enableReUsingBrowserInstance() {
    if (!this.renderHTML) {
      throw Error(ENABLE_HEADLESS_ERROR);
    }
    this.reuse_instance = true;
  }

  /**
   * Disable Reusing browser instance for GET request
   */
  disableReUsingBrowserInstance() {
    if (!this.renderHTML) {
      throw Error(ENABLE_HEADLESS_ERROR);
    }
    this.reuse_instance = false;
  }

  /**
   * @param target_url
   * @returns
   */
  async get(target_url: string): Promise<string> {
    // cloudfare
    if (this.proxy) {
      const solver = new FlareSolverrClient(this.proxy.proxy_url);
      const cmd: FlareSolverrCommand = {
        cmd: "request.get",
        url: target_url,
      };
      const { solution } = await solver.performCommand(cmd);
      return solution.response;
    }
    return await CustomRequest.doGet(
      target_url,
      this.renderHTML,
      this.reuse_instance,
    );
  }

  /**
   * @param target_url
   * @param headless_mode Enable headless mode (run script), `false` by default
   * @returns
   */
  static async doGet(
    target_url: string,
    headless_mode = false,
    reuse_browser = false,
  ) {
    if (headless_mode) {
      const unique = await UniqueHeadlessBrowser.getInstance();
      const headless = unique.getHeadlessBrowser();
      // MXLogger.info ('engine ' + headless.infos().current);
      const html = await headless.getRenderedHtml(target_url);
      if (!reuse_browser) {
        await UniqueHeadlessBrowser.destroy();
      }
      return html;
    }

    // perform a simple request with axios
    let axios_req_conf: AxiosRequestConfig = {
      url: target_url,
      method: "GET",
    };
    const { data } = await axios(axios_req_conf);
    return <string> data;
  }

  async downloadImage(
    target_url: string,
    output_location_path: string,
    count_max: number = 1,
  ) {
    if (this.renderHTML) {
      const unique = await UniqueHeadlessBrowser.getInstance();
      const headless = unique.getHeadlessBrowser();
      if (headless.infos().current_type != "JSDOM") {
        const browser = headless.getBrowser() as Puppeteer.Browser;
        const page = await browser.newPage();
        try {
          let count = 0;
          page.on("response", async (response) => {
            if (count > count_max) return;
            const matches = /.*\.(jpg|jpeg|png|svg|gif|webp)$/.exec(
              response.url(),
            );
            if (
              response.request().resourceType() == "image" ||
              matches && (matches.length == 2)
            ) {
              const buffer = await response.buffer();
              fs.writeFileSync(output_location_path, buffer, "base64");
              count++;
            }
          });
          await page.goto(target_url);
          return true;
        } catch (err) {
          throw err;
        } finally {
          if (!this.reuse_instance) {
            // kill everything
            await UniqueHeadlessBrowser.destroy();
          } else {
            await page.close();
          }
        }
      }
    }
    // renderHtml false | headless.infos() == 'JSDOM'
    await new CustomRequest().download(target_url, output_location_path);
    return true;
  }

  /**
   * @param target_url download url
   * @param output_location_path where to save the file
   */
  async download(target_url: string, output_location_path: string) {
    const response = await axios({
      method: "get",
      url: target_url,
      responseType: "stream",
    });
    const writer = fs.createWriteStream(output_location_path);
    response.data.pipe(writer);
    return new Promise<unknown>((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  }

  /**
   * Free all resources
   * * A new UniqueHeadlessBrowser will be created on the next
   */
  async destroy() {
    if (this.renderHTML) {
      await UniqueHeadlessBrowser.destroy();
    }
  }
}
