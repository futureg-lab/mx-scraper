import { PluginOption } from "./book.ts";
import { MXPlugin } from "./mx_plugin.ts";
import { config } from "../mx_configuration.ts";
import { levenshtein } from "../utils/utils.ts";
import { MXLogger } from "../cli/mx_logger.ts";
import { DynamicConfigurer } from "../cli/dynamic_configurer.ts";
import * as fs from "std/fs/mod.ts";
import { resolveModule } from "../plugins/static_load.ts";

export class MXScraper {
  static version = DynamicConfigurer.mxVersion();
  private plugins: MXPlugin[] = [];
  private enableProxyMap: Map<string, PluginOption> = new Map<
    string,
    PluginOption
  >();

  /**
   * Register avalaible plugins
   */
  async initAllPlugins() {
    // init plugins
    const listToLoad = config.LOAD_PLUGINS;
    for (const plugLocation of listToLoad) {
      await this.initPluginByLocation(plugLocation);
    }

    // init download folders
    this.prepareDownloadFolders();
    MXLogger.flush();
  }

  /**
   * Initialize download folders (if not present)
   */
  prepareDownloadFolders() {
    if (!fs.existsSync(config.DOWNLOAD_FOLDER.DOWNLOAD)) {
      Deno.mkdirSync(config.DOWNLOAD_FOLDER.DOWNLOAD, { recursive: true });
    }
    if (!fs.existsSync(config.DOWNLOAD_FOLDER.TEMP)) {
      Deno.mkdirSync(config.DOWNLOAD_FOLDER.TEMP, { recursive: true });
    }
  }

  /**
   * Init one plugin at a time
   */
  async initPluginByLocation(plugLocation: string) {
    // https://github.com/denoland/deno/issues/8655
    // TODO: dynamically import a non-statically analyzable module does not work!
    // It is currently not possible to import external modules that was not known prior to `compilation`
    // Reason: At compilation, deno will resolve all urls and paths then bundle it with the binary
    // which means, dyn imports will fail

    // For the time being, the imports should be within the project's context
    // This is not an issue in dev mode though
    this.register(await resolveModule(plugLocation));
  }

  /**
   * @param plugin Plugin to register
   */
  register(plugin: MXPlugin) {
    const currentId = plugin.getPluginID();

    if (config.PLUGIN_PROXY_ENABLE.includes(currentId)) {
      this.enableProxyMap.set(
        currentId,
        <PluginOption> {
          useFlareSolverr: true,
        },
      );
    }

    // duplicate id check
    const list = this.plugins.map((plugin: MXPlugin) =>
      plugin.constructor.name
    );
    if (list.includes(currentId)) {
      throw Error(
        `Plugin error: plugin id "${currentId}" cannot be registered twice`,
      );
    }

    this.plugins.push(plugin);
  }

  /**
   * Configure proxy for plugins that needs it
   */
  configureAllPlugins() {
    for (const plugin of this.plugins) {
      const currentId = plugin.getPluginID();
      if (this.enableProxyMap.has(currentId)) {
        plugin.configure(this.enableProxyMap.get(currentId)!);
      }
    }
  }

  /**
   * @param id plugin identifier (case insensitive)
   */
  configureSpecificPlugin(id: string) {
    const plugin = this.getPluginByIdentifier(id);
    if (!plugin) return;
    if (this.enableProxyMap.has(id)) {
      plugin.configure(this.enableProxyMap.get(id)!);
    }
  }

  /**
   * Search plugins that can handle a specific url
   */
  searchPluginFor(url: string, exactMatch: boolean = false): MXPlugin[] {
    const toCompareUrl = new URL(url);
    const maxDist = 1;
    return this.plugins.filter((plugin: MXPlugin) => {
      const targetUrl = new URL(plugin.targetUrl);
      if (exactMatch) {
        return targetUrl.hostname === toCompareUrl.hostname;
      }
      return targetUrl.hostname === toCompareUrl.hostname ||
        targetUrl.host === toCompareUrl.host ||
        levenshtein(targetUrl.host, toCompareUrl.host) <= maxDist;
    });
  }

  /**
   * @param id plugin unique id (case non-sensitive for convenience)
   * @returns
   */
  getPluginByIdentifier(id: string): MXPlugin | null {
    const res = this.plugins.filter((plugin: MXPlugin) => {
      return plugin.getPluginID().toLocaleLowerCase() == id.toLowerCase();
    });
    if (res.length == 0) {
      return null;
    }
    return res[0];
  }

  /**
   * Get a list of all plugins available
   */
  getAllPlugins(): MXPlugin[] {
    return this.plugins;
  }

  /**
   * Free all the ressources used by the registered plugins
   */
  async destructor() {
    for (const plugin of this.plugins) {
      await plugin.destructor();
    }
  }
}
