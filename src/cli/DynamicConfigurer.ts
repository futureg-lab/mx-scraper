import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { argv } from "node:process";
import { config } from "../environment";
import { MXLogger } from "./MXLogger";

/**
 * Provides a way to override the configuration located in `src/environment.ts`
 */
export class DynamicConfigurer {
  /**
   * Filename of the project configuration file
   */
  static CONFIG_FILENAME: string = "mx-scraper.config.json";

  private static MX_VERSION: string | null = null; 

  /**
   * Commplete path of the project configuration file
   */
  static configPath() {
    const [exec_file] = argv;
    let conf_dir = path.dirname(exec_file);

    // are we in dev mode ?
    // if yes, we must change it to the caller folder
    if (DynamicConfigurer.isDevMode()) {
      conf_dir = path.dirname(require.main.filename);
    }

    return path.join(conf_dir, DynamicConfigurer.CONFIG_FILENAME);
  }

  /**
   * Create a configuration file if not created yet
   */
  static createConfigIfNotDefined() {
    const file_path = DynamicConfigurer.configPath();
    if (!fs.existsSync(file_path)) {
      this.forceCreateConfig();
    }
  }

  /**
   * Create | Overwrite project configuration file
   */
  static forceCreateConfig() {
    const content = JSON.stringify(config, null, 2);
    const file_path = DynamicConfigurer.configPath();
    fs.writeFileSync(file_path, content);
  }

  /**
   * Override the project configuration `environment.ts` at runtime
   */
  static forceOverrideConfig() {
    this.createConfigIfNotDefined();
    const file_path = DynamicConfigurer.configPath();
    const json = JSON.parse(fs.readFileSync(file_path).toString());
    MXLogger.info("[Config] Using " + file_path);
    const version = json?.["VERSION"];
    if (version !== this.mxVersion()) {
      throw Error(
        `Cannot override configuration: config v${version ?? "<=3.2.2"} not compatible with MXScraper v${this.mxVersion()}`
      );
    }
    for (const [k, v] of Object.entries(json)) {
      this.overrideField(k, v);
    }
  }

  /**
   * Dynamically overwrite a value of the current configuration
   * @param key target to overwrite
   * @param value value associated to `key`
   */
  static overrideField(key: string, value: any) {
    config[key] = value;
  }

  /**
   * Check if current instance is in dev-mode or compiled
   */
  static isDevMode() {
    return process["pkg"] == undefined;
  }

  static async mxVersion() {
    if (!this.MX_VERSION) {
      this.MX_VERSION = require("../../package.json").version;
    }
    return this.MX_VERSION;
  }

  static mxPlatformInfos() {
    return {
      type: os.type(),
      release: os.release(),
      platform: os.platform(),
      arch: os.arch()
    };
  }
}
