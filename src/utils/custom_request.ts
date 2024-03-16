import {
  FlareSolverrClient,
  FlareSolverrCommand,
} from "./flaresolverr_client.ts";
import { config } from "../mx_configuration.ts";
import { UniqueBrowser } from "./browser/unique_browser.ts";

export interface FlareSolverrProxyOption {
  proxyUrl: string;
  timeout?: number;
}

const ENABLE_HEADLESS_ERROR = "Headless mode should be enabled first";

/**
 * A request wrapper for axios for 'GET' requests
 */
export class CustomRequest {
  proxy: FlareSolverrProxyOption | null = null;
  private renderHTML: boolean = false;
  private reuseInstance: boolean = false;

  /**
   * @param option proxy option
   */
  constructor(option?: FlareSolverrProxyOption) {
    if (option) {
      this.configureProxy(option);
    }
  }

  /**
   * @param option proxy option
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
    this.reuseInstance = true;
  }

  /**
   * Disable Reusing browser instance for GET request
   */
  disableReUsingBrowserInstance() {
    if (!this.renderHTML) {
      throw Error(ENABLE_HEADLESS_ERROR);
    }
    this.reuseInstance = false;
  }

  async get(targetUrl: string): Promise<string> {
    // cloudfare
    if (this.proxy) {
      const solver = new FlareSolverrClient(this.proxy.proxyUrl);
      const cmd: FlareSolverrCommand = {
        cmd: "request.get",
        url: targetUrl,
      };
      const { solution } = await solver.performCommand(cmd);
      return solution.response;
    }
    return await CustomRequest.doGet(
      targetUrl,
      this.renderHTML,
      this.reuseInstance,
    );
  }

  private static async doGet(
    targetUrl: string,
    headlessMode = false,
    reuseBrowser = false,
  ) {
    if (headlessMode) {
      const customBrowser = await UniqueBrowser.getInstance();
      const html = await customBrowser.getRenderedHtml(targetUrl);
      if (!reuseBrowser) {
        await UniqueBrowser.destroy();
      }
      return html;
    }

    const headers = new Headers();
    if (config.REQUEST.HEADER_COOKIE != null) {
      headers.set("Cookie", config.REQUEST.HEADER_COOKIE);
    }
    headers.set("User-Agent", config.REQUEST.HEADER_USER_AGENT);

    const response = await fetch(targetUrl, {
      headers,
    });

    return await response.text();
  }

  async downloadImage(
    targetUrl: string,
    outputLocationPath: string,
  ) {
    if (this.renderHTML) {
      const customBrowser = await UniqueBrowser.getInstance();
      const browser = customBrowser.getBrowser();
      const page = await browser.newPage();
      try {
        let count = 0;
        const response = await page.goto(targetUrl);
        if (!response) {
          throw Error(`No response received from url ${targetUrl}`);
        }
        const matches = /.*\.(jpg|jpeg|png|svg|gif|webp)$/.exec(
          response.url(),
        );
        if (
          response.request().resourceType() == "image" ||
          matches && (matches.length == 2)
        ) {
          const buffer = await response.arrayBuffer();
          Deno.writeFileSync(outputLocationPath, new Uint8Array(buffer));
          count++;
        }
        return true;
      } catch (err) {
        throw err;
      } finally {
        if (!this.reuseInstance) {
          await UniqueBrowser.destroy();
        } else {
          await page.close();
        }
      }
    }
    await new CustomRequest().download(targetUrl, outputLocationPath);
    return true;
  }

  /**
   * @param targetUrl download url
   * @param outputLocationPath where to save the file
   */
  async download(targetUrl: string, outputLocationPath: string) {
    const download = await Deno.open(outputLocationPath, {
      create: true,
      write: true,
    });
    const req = await fetch(targetUrl);
    await req.body?.pipeTo(download.writable);
    // download.close(); // stream already closed by pipeTo?
  }

  /**
   * Free all resources
   * * A new UniqueHeadlessBrowser will be created on the next
   */
  async destroy() {
    if (this.renderHTML) {
      await UniqueBrowser.destroy();
    }
  }
}
