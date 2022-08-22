import { PluginOption } from "./interfaces/BookDef";
import { MXPlugin } from "./interfaces/MXPlugin";
import { config } from "./environment ";

export class MXScraper {
    plugins : MXPlugin[] = [];
    constructor () {
    }

    /**
     * Register avalaible plugins
     */
    async initFromPluginFolder (use_session_from_config : Boolean = false) {
        const list_to_load = config.LOAD_PLUGINS;
        for (let name of list_to_load) {
            const module = await import('./plugins/' + name);
            if (!module[name])
                throw Error ('Plugin error : plugin "' + name + "' not found in ./plugins/");
            const instance = <MXPlugin> (new module[name]);
            await this.register (instance, use_session_from_config);
        }
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