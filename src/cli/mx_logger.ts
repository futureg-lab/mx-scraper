import * as process from "node:process";
import * as readline from "node:readline";
import { config } from "../mx_configuration.ts";

export class MXLogger {
  /**
   * console.info wrapper
   */
  static info(...arg: unknown[]) {
    if (config.LOGGER?.ENABLE && process.stdout.isTTY) {
      console.info(...arg);
    }
  }

  /**
   * Log and ovewrite previous terminal output
   */
  static infoRefresh(...msg: string[]) {
    if (config.LOGGER?.ENABLE && process.stdout.isTTY) {
      readline.clearLine(process.stdout, 0); // clear whole line
      readline.cursorTo(process.stdout, 0); // restore cursor
      process.stdout.write(msg.join(" "));
    }
  }

  /**
   * Clear the screen buffer
   */
  static flush() {
    if (config.LOGGER?.ENABLE && process.stdout.isTTY) {
      console.log("");
    }
  }
}
