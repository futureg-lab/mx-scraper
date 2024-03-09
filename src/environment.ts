import { DynamicConfigurer } from "./cli/DynamicConfigurer.ts";

const VERSION = DynamicConfigurer.mxVersion();
const machine = DynamicConfigurer.mxPlatformInfos();

export interface MXConfiguration {
  VERSION: string;
  CLOUDFARE_PROXY_HOST: string;
  CLOUDFARE_MAX_TIMEOUT: number;
  LOAD_PLUGINS: Array<string>;
  BROWSER: {
    ENABLE: boolean;
    MODE: "HEADFULL" | "HEADLESS";
    EXEC_PATH: string;
  };
  PLUGIN_PROXY_ENABLE: Array<string>;
  DOWNLOAD_FOLDER: {
    DOWNLOAD: string;
    TEMP: string;
  };
  CACHE: {
    ENABLE: boolean;
    FOLDER: string;
  };
  MAX_SIZE_BATCH: number;
  LOGGER: {
    ENABLE: boolean;
  };
  SHOW_CLI_ERROR_STACK: boolean;
  REQUEST: {
    HEADER_COOKIE: string | null;
    HEADER_USER_AGENT: string; 
  }
}

export const config: MXConfiguration = {
  VERSION,
  CLOUDFARE_PROXY_HOST: "http://localhost:8191/v1",
  CLOUDFARE_MAX_TIMEOUT: 120000,
  LOAD_PLUGINS: [
    "Example",
    "NHentai",
    "EHentai",
    "GPrincess",
    "Eyval",
    "Kemono",
    "HentaiKage",
    "Rule34Comic"
  ],
  BROWSER: {
    MODE: "HEADLESS",
    ENABLE: false,
    EXEC_PATH: "./browser/chrome",
  },
  PLUGIN_PROXY_ENABLE: [
    "NHentai",
  ],
  DOWNLOAD_FOLDER: {
    DOWNLOAD: "./download/download",
    TEMP: "./download/temp",
  },
  CACHE: {
    ENABLE: true,
    FOLDER: "./query_cache",
  },
  MAX_SIZE_BATCH: 10,
  LOGGER: {
    ENABLE: true,
  },
  SHOW_CLI_ERROR_STACK: false,
  REQUEST: {
    HEADER_COOKIE: null,
    HEADER_USER_AGENT: `mx-scraper/${VERSION} (${machine.type}; ${machine.platform}; ${machine.arch})`
  }
};
