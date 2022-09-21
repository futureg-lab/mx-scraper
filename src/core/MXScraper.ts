import { PluginOption } from "./BookDef";
import { MXPlugin } from "./MXPlugin";
import { config } from "../environment";
import { levenshtein } from "../utils/Utils";
import * as fs from 'fs';
import { MXLogger } from "../cli/MXLogger";

const version : string = require('../../package.json').version;

export class MXScraper {
    static version = version;
    plugins : MXPlugin[] = [];

    /**
     * Register avalaible plugins
     */
    async initFromPluginFolder (use_session_from_config : Boolean = false) {
        // init plugins
        const list_to_load = config.LOAD_PLUGINS;
        for (let name of list_to_load) {
            const path_location = '../plugins/' + name;
            const module = await import (path_location);
            if (!module[name])
                throw Error ('Plugin error : plugin "' + name + "' not found in " + path_location);
            const instance = <MXPlugin> (new module[name]);

            MXLogger.infoRefresh ('[Plugin] Loading ' + name);

            if (name != instance.title)
                throw Error ('Plugin at ' + path_location + ' has title "' + instance.title +'", "' + name + '" expected'); 
                        
            await this.register (instance, use_session_from_config);

            MXLogger.infoRefresh ('[Done] Loading ' + name);
        }

        // init download folders
        if (!fs.existsSync(config.DOWNLOAD_FOLDER.DOWNLOAD))
            fs.mkdirSync (config.DOWNLOAD_FOLDER.DOWNLOAD, { recursive: true });
        if (!fs.existsSync(config.DOWNLOAD_FOLDER.TEMP))
            fs.mkdirSync (config.DOWNLOAD_FOLDER.TEMP, { recursive: true });

        MXLogger.flush ();
    }

    /**
     * @param plugin Plugin to register
     * @param use_session_from_config session config
     */
    async register (plugin : MXPlugin, use_session_from_config : Boolean = false) {
        const current_id = plugin.constructor.name;
        if (config.PLUGIN_PROXY_ENABLE.includes(current_id)) {
            const unique_session_id = use_session_from_config ? config.UNIQUE_SESSION : undefined;
            await plugin.configure (<PluginOption>{
                useFlareSolverr : true,
                useThisSessionId : unique_session_id
            });
        }
        
        // duplicate id check
        const list = this.plugins.map((plugin : MXPlugin) => plugin.constructor.name);
        if (list.includes(current_id))
            throw Error ('Plugin error : Unable de register plugin id ' + current_id);
        
        this.plugins.push (plugin);
    }

    /**
     * Search plugins for a specific url
     * @param url Target url
     * @returns An array of plugins
     */
    searchPluginFor (url : string, exact_match : boolean = false) : MXPlugin[] {
        const to_compare_url = new URL (url);
        const max_dist = 1;
        return this.plugins.filter((plugin : MXPlugin) => {
            const target_url = new URL(plugin.target_url);
            if (exact_match)
                return target_url.hostname === to_compare_url.hostname;
            
            return target_url.hostname === to_compare_url.hostname
                || target_url.host === to_compare_url.host
                || levenshtein (target_url.host, to_compare_url.host) <= max_dist;
        });
    }

    /**
     * @param id plugin unique id
     * @returns 
     */
    getPluginByIdentifier (id : string) : MXPlugin {
        const res = this.plugins.filter((plugin : MXPlugin) => {
            return plugin.constructor.name.toLowerCase() == id.toLowerCase()
        });
        if (res.length == 0)
            return null;
        return res[0];
    }

    /**
     * Get a list of all plugins available
     */
    getAllPlugins () : MXPlugin[] {
        return this.plugins;
    }

    /**
     * Free all the ressources used by the registered plugins
     */
    async destructor () {
        for (let plugin of this.plugins)
            await plugin.destructor();
    }
}