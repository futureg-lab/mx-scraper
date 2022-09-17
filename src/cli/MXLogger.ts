import { config } from "../environment";
import * as readline from "readline";

export class MXLogger {
    /**
     * console.info wrapper
     * @param arg any[]
     */
    static info (...arg : any[]) {
        if (config.LOGGER?.ENABLE && process.stdout.isTTY)
            console.info (...arg);
    }

    /**
     * Log and ovewrite previous terminal output
     * @param msg 
     */
    static infoRefresh (...msg : string[]) {
        if (config.LOGGER?.ENABLE && process.stdout.isTTY) {
            readline.clearLine (process.stdout, 0); // clear whole line
            readline.cursorTo (process.stdout, 0); // restore cursor
            process.stdout.write (msg.join(' '));
        }
    }

    /**
     * Clear the screen buffer
     */
    static flush () {
        if (config.LOGGER?.ENABLE && process.stdout.isTTY)
            console.log ('');
    }
}