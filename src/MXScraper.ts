import { MXPlugin } from "./interfaces/MXPlugin";
import { Example } from "./plugins/Example";
import { config } from "./utils/environment ";

export class MXScraper {
    plugins : MXPlugin[] = [];    
    constructor () {
    }

    /**
     * Register avalaible plugins
     */
    async initFromPluginFolder () {
        const list_to_load = config.LOAD_PLUGINS;
        for (let name of list_to_load) {
            const module = await import('./plugins/' + name);
            if (!module[name])
                throw Error ('Plugin error : plugin "' + name + "' not found in ./plugins/");
            const instance = <MXPlugin> (new module[name]);
            await this.register (instance);
        }
    }

    /**
     * @param plugin Plugin to register
     */
    async register (plugin : MXPlugin) {
        const current_id = plugin.constructor.name;
        if (config.PLUGIN_PROXY_ENABLE[current_id]) {
            await plugin.configure ({
                useFlareSolverr : true,
                enableUniqueSession : true
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
        return [];
    }

    /**
     * @param id plugin unique id
     * @returns 
     */
    getPluginByIdentifier (id : string) : MXPlugin {
        const res = this.plugins.filter((plugin : MXPlugin) => plugin.constructor.name == id);
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

    async destructor () {
        for (let plugin of this.plugins)
            await plugin.destructor();
    }
}