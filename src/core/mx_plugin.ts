import { config } from "../mx_configuration.ts";
import {
  CustomRequest,
  FlareSolverrProxyOption,
} from "../utils/custom_request.ts";
import { Book, ParseLinkHint, PluginOption, SearchOption } from "./book.ts";
import * as fs from "std/fs/mod.ts";
import * as path from "node:path";
import { computeSignatureQuery } from "../utils/downloader.ts";
import { MXLogger } from "../cli/mx_logger.ts";
import { CheerioAPI, load } from "cheerio";

export class MXPlugin {
  /**
   * Title | identifier of the plugin
   */
  title: string = "";

  /**
   * Version of the plugin in x.y.z format
   */
  version: string = "";

  /**
   * Target url | website
   */
  targetUrl: string = "";

  /**
   * Plugin option (Enabling a proxy for example)
   */
  option: PluginOption = { useFlareSolverr: false };

  /**
   * Perform http request using a single instance
   */
  request: CustomRequest = new CustomRequest();

  /**
   * @returns id of the current plugin
   */
  getPluginID() {
    return this.constructor.name;
  }

  /**
   * @param identifier fetch all, fetch a specific chapter... etc
   */
  async fetchBook(_identifier: string): Promise<Book> {
    return await Promise.reject(
      `fetchBook is not yet implemented for ${this.getPluginID()}`,
    );
  }

  /**
   * * Get a book from source if not cached
   * * if `cache` is disabled, it is equivalent to `MXPlugin.fetchBook`
   * @param query query string | book identifier
   * @param disableCache enable or disable fetch cache
   * @returns
   */
  async getBook(query: string, disableCache = false): Promise<Book> {
    if (config.CACHE.ENABLE && !disableCache) {
      let book: Book | null = null;
      const cached = this.fetchBookFromCache(query);
      if (cached) {
        MXLogger.info("[Cache] Loading " + query);
        book = cached;
      } else {
        book = await this.fetchBook(query);
        this.writeBookTocache(query, book);
      }
      return book;
    }
    return await this.fetchBook(query);
  }

  /**
   * @param term search keyword
   * @param option search option
   */
  async search(_term: string, _option: SearchOption): Promise<Book[]> {
    return await Promise.reject(
      `Search not yet implemented for ${this.getPluginID()}`,
    );
  }

  /**
   * * Configure current plugin
   * * By default, this function setups a cloudfare proxy if option.useFlareSolverr is set to true
   */
  configure(option: PluginOption) {
    this.option = option;
    if (this.option.useFlareSolverr) {
      const option: FlareSolverrProxyOption = <FlareSolverrProxyOption> {
        proxyUrl: config.CLOUDFARE_PROXY_HOST,
        timeout: config.CLOUDFARE_MAX_TIMEOUT,
      };
      this.request.configureProxy(option);
    }
  }

  static async autoScanIndirectLink(
    request: CustomRequest,
    intermediateLink: string,
    hint?: ParseLinkHint,
  ): Promise<string[]> {
    // retrieve the real link
    const responseHtml = await request.get(intermediateLink);
    const $: CheerioAPI = load(responseHtml);
    const parseHint = <ParseLinkHint> {
      selector: hint ? hint.selector : "img",
      attribute: hint ? hint.attribute : "src",
    };
    const realLink = $(parseHint.selector)
      .first()
      .attr(parseHint.attribute) || "";

    const compExt = realLink.split(".").pop();
    const extension = compExt && compExt != "" ? compExt : "jpg";
    return [realLink, extension];
  }

  async destructor() {
    if (!this.option || !this.request.proxy) {
      return;
    }
    await this.request.destroy();
  }

  /**
   * Write a book metadata in a temp folder to accelerate future requests
   */
  writeBookTocache(query: string, book: Book) {
    if (!book) {
      return;
    }
    const text = JSON.stringify(book, null, 2);
    const pluginName = this.title;
    const filename = computeSignatureQuery(query, pluginName) + ".json";
    const base = config.CACHE.FOLDER;
    if (!fs.existsSync(base)) {
      Deno.mkdirSync(base, { recursive: true });
    }
    Deno.writeTextFileSync(path.join(base, filename), text);
  }

  /**
   * Fetch a book from the cache folder, returns null if nothing is found
   * @param query
   * @returns
   */
  fetchBookFromCache(query: string): Book | null {
    const pluginName = this.title;
    const filename = computeSignatureQuery(query, pluginName) + ".json";
    const base = config.CACHE.FOLDER;
    const complPath = path.join(base, filename);
    if (fs.existsSync(complPath)) {
      const rawText = Deno.readTextFileSync(complPath);
      const rawJson = JSON.parse(rawText);
      return <Book> rawJson;
    }
    return null;
  }
}
