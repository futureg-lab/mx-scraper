import * as path from "node:path";
import * as fs from "std/fs/mod.ts";

import {
  config,
  MXConfiguration,
  validateConfig,
} from "../mx_configuration.ts";
import { MXLogger } from "./mx_logger.ts";

type ConfigKey = keyof MXConfiguration;

/**
 * Provides a way to override the configuration located in `src/environment.ts`
 */
export class DynamicConfigurer {
  /**
   * Filename of the project configuration file
   */
  static CONFIG_FILENAME: string = "mx-scraper.config.json";

  /**
   * Commplete path of the project configuration file
   */
  static configPath() {
    const confDir = Deno.cwd();
    return path.join(confDir, DynamicConfigurer.CONFIG_FILENAME);
  }

  /**
   * Create a configuration file if not created yet
   */
  static createConfigIfNotDefined() {
    const filePath = DynamicConfigurer.configPath();
    if (!fs.existsSync(filePath)) {
      this.forceCreateConfig();
    }
  }

  /**
   * Create | Overwrite project configuration file
   */
  static forceCreateConfig() {
    const content = JSON.stringify(config, null, 2);
    const filePath = DynamicConfigurer.configPath();
    Deno.writeTextFileSync(filePath, content);
  }

  /**
   * Override the project configuration `mx_configuration.ts` at runtime
   */
  static forceOverrideConfig() {
    this.createConfigIfNotDefined();
    const filePath = DynamicConfigurer.configPath();
    const json = JSON.parse(Deno.readTextFileSync(filePath));
    MXLogger.info("[Config] Using " + filePath);
    const version = json?.["VERSION"];
    if (version !== this.mxVersion()) {
      throw Error(
        `Cannot override configuration: config v${
          version ?? "<=3.2.2"
        } not compatible with MXScraper v${this.mxVersion()}`,
      );
    }
    for (const [k, v] of Object.entries(json)) {
      this.overrideField(k as ConfigKey, v);
    }
    validateConfig();
  }

  /**
   * Dynamically overwrite a value of the current configuration
   * @param key target to overwrite
   * @param value value associated to `key`
   */
  static overrideField(key: ConfigKey, value: unknown) {
    (config as any)[key] = value;
  }

  /**
   * Check if current instance is in dev-mode or compiled
   */
  static isDevMode() {
    return !Deno.args.includes("--is_compiled_binary");
  }

  static mxVersion() {
    return config.VERSION;
  }
}
