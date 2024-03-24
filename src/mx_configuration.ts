import * as os from "node:os";
import { z } from "zod";
import { getParkedModuleNames } from "./plugins/static_load.ts";

const VERSION = "4.0.2";
const MACHINE = {
  type: os.type(),
  release: os.release(),
  platform: os.platform(),
  arch: os.arch(),
};

const configSchema = z.object({
  VERSION: z.string(),
  CLOUDFARE_PROXY_HOST: z.string(),
  CLOUDFARE_MAX_TIMEOUT: z.number().min(100),
  LOAD_PLUGINS: z.array(z.string()).min(1),
  BROWSER: z.object({
    ENABLE: z.boolean(),
    MODE: z.enum(["HEADFULL", "HEADLESS"]),
    EXEC_PATH: z.string().nullable().optional(),
  }),
  PLUGIN_PROXY_ENABLE: z.array(z.string()),
  DOWNLOAD_FOLDER: z.object({
    DOWNLOAD: z.string(),
    TEMP: z.string(),
  }),
  CACHE: z.object({
    ENABLE: z.boolean(),
    FOLDER: z.string(),
  }),
  MAX_SIZE_BATCH: z.number().min(2),
  LOGGER: z.object({
    ENABLE: z.boolean(),
  }),
  SHOW_CLI_ERROR_STACK: z.boolean(),
  REQUEST: z.object({
    HEADER_COOKIE: z.string().nullable().optional(),
    HEADER_USER_AGENT: z.string(),
  }),
  DEV: z.object({
    SERVER_PORT: z.number().nullable().optional(),
  }),
});

export type MXConfiguration = z.infer<typeof configSchema>;
export const config = configSchema.parse({
  VERSION,
  CLOUDFARE_PROXY_HOST: "http://localhost:8191/v1",
  CLOUDFARE_MAX_TIMEOUT: 120000,
  LOAD_PLUGINS: [
    ...getParkedModuleNames(),
  ],
  BROWSER: {
    MODE: "HEADLESS",
    ENABLE: false,
    EXEC_PATH: null,
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
    HEADER_USER_AGENT:
      `mx-scraper/${VERSION} (${MACHINE.type}; ${MACHINE.platform}; ${MACHINE.arch})`,
  },
  DEV: {
    SERVER_PORT: 3000,
  },
});

export function validateConfig() {
  try {
    configSchema.parse(config);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues.map(({ message, path }) =>
        ` - ${message} at path ${path.join(".")}`
      );
      throw Error(`Invalid configuration:\n${issues.join("\n")}`);
    } else {
      throw err;
    }
  }
}
