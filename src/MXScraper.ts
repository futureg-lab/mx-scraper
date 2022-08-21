import { MXPlugin } from "./interfaces/MXPlugin";
import { Example } from "./plugins/example/Example";
import { NHentai } from "./plugins/nhentai/NHentai";
import { config } from "./utils/environement";

export class MXScraper {
    plugins : MXPlugin[] = [];    
    constructor () {
        // this.initPlugins ();
    }

    /**
     * Register avalaible plugins
     */
    initPlugins () {
        this.register (new Example());
        this.register (new NHentai());
    }

    /**
     * @param plugin Plugin to register
     */
    register (plugin : MXPlugin) {
        const current_id = plugin.unique_identifier;
        if (config.PLUGIN_PROXY_ENABLE[current_id]) {
            plugin.config ({
                useFlareSolverr : true,
                enableUniqueSession : true
            });
        }

        
        // duplicate id check
        const list = this.plugins.map((plugin : MXPlugin) => plugin.unique_identifier);
        console.info(list);
        // if (list.includes(current_id))
        //     throw Error ('Duplicate id : Unable de register plugin id ' + current_id);
        
        this.plugins.push (plugin);
    }

    /**
     * Search plugins for a specific url
     * @param url Target url
     * @returns An array of plugins
     */
    searchPluginFor (url : string, exact_match : boolean = false) : MXPlugin[] {
        return [];
    }

    /**
     * @param id plugin unique id
     * @returns 
     */
    getPluginByIdentifier (id : string) : MXPlugin {
        const res = this.plugins.filter((plugin : MXPlugin) => plugin.unique_identifier == id);
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
}