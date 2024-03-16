import { MXPlugin } from "../core/mx_plugin.ts";
import { MXScraper } from "../core/mx_scraper.ts";
import {
  downloadBook,
  DownloadOption,
  DownloadProgressCallback,
} from "../utils/downloader.ts";
import {
  batchAListOf,
  readListFromFile,
  resumeBook,
  splitKeyValue,
} from "../utils/utils.ts";
import { CLIEngine } from "./cli_engine.ts";
import { COMMAND_DEF } from "./mx_command.ts";
import * as cliProgress from "cli-progress";
import { Book } from "../core/book.ts";
import { MXLogger } from "./mx_logger.ts";
import { config } from "../mx_configuration.ts";
import { DynamicConfigurer } from "./dynamic_configurer.ts";
import { QueryPlan } from "../core/query_plan.ts";
import { outdent } from "outdent";
import { UniqueBrowser } from "../utils/browser/unique_browser.ts";

export class MXcli extends CLIEngine {
  constructor() {
    // register commands
    super(COMMAND_DEF);
    // at least a plugin specification or info + a metafetch specification
    this.defineRequiredArgs([
      "Plugin | Plugin-Auto-Detect | Show-Plugins | Show-Help | Show-Infos | Search-Plugin | Load-Plan",
    ]);
  }

  async runCommand(engine: MXScraper, parsed: Map<string, string[]>) {
    const verbose = parsed.has("Verbose");

    if (parsed.has("Error-Stack")) {
      DynamicConfigurer.overrideField("SHOW_CLI_ERROR_STACK", true);
    }

    const doption = {
      continue: true,
      forceHeadless: false,
      parallel: false,
    } as DownloadOption;

    if (parsed.has("Download")) {
      doption.continue = !parsed.has("Restart-Download");
      doption.parallel = parsed.has("Parallel-Download") && (
        parsed.has("FetchMeta-List") || parsed.has("FetchMeta-List-From-File")
      );
      doption.metaOnly = parsed.has("Meta-Only");
      doption.forceHeadless = false;
    }

    if (parsed.has("Use-Cache") && parsed.has("No-Cache")) {
      throw Error("Cannot use --no-cache with --use-cache");
    }

    if (parsed.has("Use-Cache") || parsed.has("No-Cache")) {
      const cache = config.CACHE;
      if (parsed.has("Use-Cache")) cache.ENABLE = true;
      if (parsed.has("No-Cache")) cache.ENABLE = false;
      DynamicConfigurer.overrideField("CACHE", cache);
    }

    if (parsed.has("Cookie")) {
      const [cookie] = parsed.get("Cookie")!;
      console.log(`Override cookie value to "${cookie}"`);
      config.REQUEST.HEADER_COOKIE = cookie;
    }

    if (parsed.has("Load-Plan")) {
      const [filepath] = parsed.get("Load-Plan")!;
      const params = {};
      if (parsed.has("Set-Plan-Parameters")) {
        const args = parsed
          .get("Set-Plan-Parameters")!
          .map((arg) => splitKeyValue(arg));
        for (const [key, value] of args) {
          (params as any)[key] = value;
        }
        verbose && console.log(
          "[Plan params] " + Object
            .entries(params)
            .map((item) => item.join("="))
            .join(", "),
        );
      }
      const planner = QueryPlan
        .load(filepath)
        .with(params);

      const book = await planner.get(
        !parsed.has("No-Cache") || parsed.has("Use-Cache"),
      );

      doption.forceHeadless = planner.plan.headless ?? false;

      console.log(resumeBook(book, verbose));
      await this.fetchBookInteractively(book, doption);
    }

    // show help / plugins
    if (parsed.has("Show-Help")) {
      this.commandPrintHelp(engine, verbose);
      return;
    }

    if (parsed.has("Show-Infos")) {
      this.commandPrintInfos(verbose);
      return;
    }

    if (parsed.has("Show-Plugins")) {
      this.commandShowPlugins(engine);
      return;
    }
    if (parsed.has("Search-Plugin")) {
      const [url] = parsed.get("Search-Plugin")!;
      const exactMatch = parsed.has("Exact-Match");
      this.commandSearchPlugin(url, exactMatch, engine);
      return;
    }

    // fetch metadatas
    if (parsed.has("Plugin") || parsed.has("Plugin-Auto-Detect")) {
      let usedCount = 0;
      let inputEntries = [] as Array<string>;
      const listExpected = [
        "FetchMeta",
        "FetchMeta-List",
        "FetchMeta-List-From-File",
      ];
      for (const fetchMethod of listExpected) {
        if (parsed.has(fetchMethod)) {
          usedCount++;
          inputEntries = parsed.get(fetchMethod)!;
        }
      }

      if (usedCount == 0) {
        throw Error("Fetch command expected.");
      }

      if (usedCount > 1) {
        throw Error("Only one Fetch command can be used at a time");
      }

      // titles ok
      // FetchMeta is guaranteed to have one item only
      // FetchMeta-List is guaranteed to have at least one item
      let titles = inputEntries;
      if (parsed.has("FetchMeta-List-From-File")) {
        const filePath = inputEntries[0];
        // read file instead
        titles = readListFromFile(filePath);
        MXLogger.info(`\n\n[File] Fetching "${titles.join(", ")}\n`);
      }

      let plugin: MXPlugin | null = null;
      if (parsed.has("Plugin")) {
        const [pluginName] = parsed.get("Plugin")!;
        plugin = engine.getPluginByIdentifier(pluginName);
        if (plugin == null) {
          throw Error(`Plugin named "${pluginName}" is not present`);
        }
      } else {
        const result = engine.searchPluginFor(
          titles[0],
          parsed.has("Exact-Match"),
        );
        if (result.length > 0) {
          plugin = result[0];
        } else {
          throw Error(`Unable to find a plugin to handle ${titles[0]}`);
        }
        MXLogger.infoRefresh(`[Using] ${plugin.title}`);
      }

      await engine.configureSpecificPlugin(plugin.getPluginID());
      const verbose = parsed.has("Verbose");
      const titlesSet = new Set<string>(titles);
      MXLogger.info("\n");
      await this.commandFetchMetaDatasOrDownload(
        plugin,
        titlesSet,
        doption!,
        verbose,
      );
      return;
    }
  }

  async commandPrintInfos(_verbose: boolean) {
    const customBrowser = await UniqueBrowser.getInstance();
    const infos = customBrowser.infos();

    const str = this.headerString() + outdent`
    - MXScraper environment: ${
      DynamicConfigurer.isDevMode() ? "Dev" : "Release"
    }
    - FlareSolverr:
      - Host: ${config.CLOUDFARE_PROXY_HOST}
      - Max timeout: ${config.CLOUDFARE_MAX_TIMEOUT}
      - Active on: ${config.PLUGIN_PROXY_ENABLE.join(", ")}
    - Cache: ${config.CACHE.ENABLE ? "Enabled" : "Disabled"}
    - Full error stack: ${config.SHOW_CLI_ERROR_STACK ? "Enabled" : "Disabled"}
    - Browser:
      - Status: ${config.BROWSER.ENABLE ? "Enabled" : "Disabled"}
      - Mode: ${config.BROWSER.MODE}
      - Executable:
        - Config: ${config.BROWSER.EXEC_PATH ?? "N/A"}
        - Active: ${infos.execPath}
    `;

    await UniqueBrowser.destroy();

    console.log(str);
  }

  private commandShowPlugins(engine: MXScraper) {
    const plugins = engine.getAllPlugins();
    this.displayPluginList(plugins);
  }

  private commandSearchPlugin(
    url: string,
    exactMatch: boolean,
    engine: MXScraper,
  ) {
    const plugins = engine.searchPluginFor(url, exactMatch);
    this.displayPluginList(plugins);
  }

  private commandPrintHelp(_: MXScraper, verbose: boolean = false) {
    const examples = [
      "mx-scraper --help --verbose",
      "mx-scraper --infos",
      "mx-scraper -h -v",
      "mx-scraper --show-plugins -v",
      "mx-scraper --show-plugins -v -cs",
      "mx-scraper --search-plugin -v http://link/to/a/title",
      "mx-scraper --auto --fetch http://link/to/a/title",
      "mx-scraper --plugin <plugin_name> --fetch-all title1 title2 title3",
      "mx-scraper --auto --fetch-all --download --parallel http://link/to/title1 http://link/to/title2",
      "mx-scraper --auto --download --parallel --fetch-file list.txt --meta-only",
      "mx-scraper -a -d -pa -ff list.txt -mo",
      "mx-scraper -a -d -pa -ff list.txt",
      'mx-scraper -v -d --load-plan danbooru.yaml --plan-params TAG=bocchi_the_rock! "TITLE=Bocchi The Rock"',
    ];

    const commandsInstr = [];
    const keys = Array.from(this.commands.keys());
    for (const key of keys) {
      const command = this.commands.get(key)!;
      let verbText = "";
      if (verbose) {
        const ifHasArgText = command.argCount !== Infinity
          ? `${command.argCount}`
          : "UNLIMITED";

        verbText =
          `Argument(s): ${(!command.argCount ? "NONE" : ifHasArgText)}`;
      }

      commandsInstr.push(outdent`
        ${command.name}: ${command.aliases.join(" | ")}
          Description: ${command.description}
          ${verbText}
      `.trim());
    }

    console.info(outdent`
    ${this.headerString()}
    # Commands:
    ${commandsInstr.join("\n")}

    # Examples:
    ${examples.map((example) => " " + example).join("\n")}
    `);
  }

  private displayPluginList(plugins: MXPlugin[]) {
    const infos = plugins.map(({ title, version, targetUrl }) =>
      `  - ${title} version ${version} (${targetUrl})`
    ).join("\n");

    console.log(`${this.headerString()}Plugin list:\n${infos}`);
  }

  private async commandFetchMetaDatasOrDownload(
    plugin: MXPlugin,
    titlesSet: Set<string>,
    downloadOption: DownloadOption,
    verbose: boolean,
  ) {
    const titles = Array.from(titlesSet);
    if (downloadOption && downloadOption.parallel) {
      const batches = batchAListOf<string>(titles, config.MAX_SIZE_BATCH);
      let count = 1;
      for (const batch of batches) {
        MXLogger.info("\n # Batch " + (count++) + "/" + batches.length);
        await this.parallelFetchAllThenDownload(plugin, batch, downloadOption);
      }
    } else {
      await this.sequentialFetchAll(plugin, titles, downloadOption, verbose);
    }
  }

  private async fetchBookInteractively(
    book: Book,
    downloadOption: DownloadOption,
  ) {
    if (downloadOption) {
      const progress = new cliProgress.SingleBar({
        format: "[{bar}] {percentage}% | ETA: {eta}s {value}/{total} | {msg}",
      }, cliProgress.Presets.shades_classic);

      let started = true;
      const callback: DownloadProgressCallback = (msg, curr, total, _p) => {
        const payload = { msg };
        if (started) {
          progress.start(total, curr, payload);
          started = false;
        } else {
          progress.update(curr, payload);
        }
      };
      await downloadBook(book, downloadOption, callback);
      if (!started) {
        progress.stop();
      }
      console.log();
    }
  }

  private async sequentialFetchAll(
    plugin: MXPlugin,
    titles: string[],
    downloadOption: DownloadOption,
    verbose: boolean,
  ) {
    for (const title of titles) {
      try {
        const book: Book = await plugin.getBook(title);
        console.log(resumeBook(book, verbose));
        await this.fetchBookInteractively(book, downloadOption);
      } catch (err) {
        console.error('\nFailed to fetch "' + title + '"');
        console.error(err.message);
      }
    }
  }

  private async parallelFetchAllThenDownload(
    plugin: MXPlugin,
    titles: string[],
    downloadOption: DownloadOption | null = null,
  ) {
    const books: Book[] = [];

    const multibar = new cliProgress.MultiBar({
      clearOnComplete: false,
      hideCursor: true,
      format: " {bar} | {sourceid} {msg} | {value}/{total}",
    }, cliProgress.Presets.shades_grey);

    try {
      // Fetch metadatas first
      console.log(" Fetching book metadata.. ");
      for (const title of titles) {
        const book = await plugin.getBook(title);
        books.push(book);
      }
      console.log("\n Downloading all..");

      // download concurrently
      const processes: Promise<void>[] = [];
      for (const book of books) {
        let subProgress: cliProgress.SingleBar = null;
        const callback: DownloadProgressCallback = (msg, curr, total, _) => {
          const payload = { sourceid: book.source_id, msg: msg };
          if (subProgress == null) {
            subProgress = multibar.create(total, curr, payload);
          } else {
            subProgress.update(curr, payload);
          }
        };
        processes.push(downloadBook(book, downloadOption, callback));
      }

      // allSettled : handle resolved / failed promises
      // in this particular setup, the processes do not depend to each other
      const resolved: PromiseSettledResult<void>[] = await Promise.allSettled(
        processes,
      );
      const failedDownloads = resolved
        .filter((solution) => solution.status == "rejected")
        .map((_, index) => books[index].source_id);

      if (failedDownloads.length > 0) {
        throw Error("Failed to download " + failedDownloads.join(", "));
      }
    } catch (err) {
      console.error("\nFailed to resolve all");
      console.error(err.message || err);
    } finally {
      multibar.stop();
    }
  }

  private headerString() {
    return `MXScraper-CLI v${DynamicConfigurer.mxVersion()} - FutureG-lab\n`;
  }
}
