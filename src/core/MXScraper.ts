import { PluginOption } from "./BookDef";
import { MXPlugin } from "./MXPlugin";
import { config } from "../environment";
import { levenshtein } from "../utils/Utils";
import * as fs from "fs";
import * as path from "path";
import { MXLogger } from "../cli/MXLogger";

const version: string = require("../../package.json").version;

export class MXScraper {
  static version = version;
  static plugin_base_path = "../plugins";
  private plugins: MXPlugin[] = [];
  private enable_proxy_map: Map<string, PluginOption> = new Map<
    string,
    PluginOption
  >();

  /**
   * Register avalaible plugins
   */
  async initAllPlugins() {
    // init plugins
    const list_to_load = config.LOAD_PLUGINS;
    for (let name of list_to_load) {
      await this.initPluginByName(name);
    }

    // init download folders
    this.prepareDownloadFolders();
    MXLogger.flush();
  }

  /**
   * Initialize download folders (if not exist)
   */
  prepareDownloadFolders() {
    if (!fs.existsSync(config.DOWNLOAD_FOLDER.DOWNLOAD)) {
      fs.mkdirSync(config.DOWNLOAD_FOLDER.DOWNLOAD, { recursive: true });
    }
    if (!fs.existsSync(config.DOWNLOAD_FOLDER.TEMP)) {
      fs.mkdirSync(config.DOWNLOAD_FOLDER.TEMP, { recursive: true });
    }
  }

  /**
   * Init one plugin at a
   */
  async initPluginByName(name: string) {
    const path_location = path.join(MXScraper.plugin_base_path, name);
    const module = await import(path_location);
    if (!module[name]) {
      throw Error(
        'Plugin error : plugin "' + name + "' not found in " + path_location,
      );
    }
    const instance = <MXPlugin> (new module[name]());

    MXLogger.infoRefresh("[Plugin] Loading " + name);

    if (name != instance.title) {
      throw Error(
        "Plugin at " + path_location + ' has title "' + instance.title +
          '", "' + name + '" expected',
      );
    }

    await this.register(instance);
    MXLogger.infoRefresh("[Done] Loading " + name);
  }

  /**
   * @param plugin Plugin to register
   */
  async register(plugin: MXPlugin) {
    const current_id = plugin.getPluginID();

    if (config.PLUGIN_PROXY_ENABLE.includes(current_id)) {
      this.enable_proxy_map.set(
        current_id,
        <PluginOption> {
          useFlareSolverr: true,
        },
      );
    }

    // duplicate id check
    const list = this.plugins.map((plugin: MXPlugin) =>
      plugin.constructor.name
    );
    if (list.includes(current_id)) {
      throw Error("Plugin error : Unable de register plugin id " + current_id);
    }

    this.plugins.push(plugin);
  }

  /**
   * Configure proxy for plugins that needs it
   */
  async configureAllPlugins() {
    for (let plugin of this.plugins) {
      const current_id = plugin.getPluginID();
      if (this.enable_proxy_map.has(current_id)) {
        await plugin.configure(this.enable_proxy_map.get(current_id));
      }
    }
  }

  /**
   * @param id plugin identifier (case non-sensitive)
   * @returns
   */
  async configureSpecificPlugin(id: string) {
    const plugin = this.getPluginByIdentifier(id);
    if (!plugin) return;
    if (this.enable_proxy_map.has(id)) {
      await plugin.configure(this.enable_proxy_map.get(id));
    }
  }

  /**
   * Search plugins for a specific url
   * @param url Target url
   * @returns An array of plugins
   */
  searchPluginFor(url: string, exact_match: boolean = false): MXPlugin[] {
    const to_compare_url = new URL(url);
    const max_dist = 1;
    return this.plugins.filter((plugin: MXPlugin) => {
      const target_url = new URL(plugin.target_url);
      if (exact_match) {
        return target_url.hostname === to_compare_url.hostname;
      }

      return target_url.hostname === to_compare_url.hostname ||
        target_url.host === to_compare_url.host ||
        levenshtein(target_url.host, to_compare_url.host) <= max_dist;
    });
  }

  /**
   * @param id plugin unique id (case non-sensitive for convenience)
   * @returns
   */
  getPluginByIdentifier(id: string): MXPlugin {
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
    for (let plugin of this.plugins) {
      await plugin.destructor();
    }
  }
}
