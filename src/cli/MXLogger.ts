import { config } from "../environment";
import logUpdate from 'log-update';

export class MXLogger {
    /**
     * console.info wrapper
     * @param arg any[]
     */
    static info (...arg : any[]) {
        if (config.LOGGER?.ENABLE)
            console.info (...arg);
    }

    /**
     * Log and ovewrite previous terminal output
     * @param msg 
     */
    static infoRefresh (...msg : string[]) {
        if (config.LOGGER?.ENABLE)
            logUpdate (...msg);
    }
}