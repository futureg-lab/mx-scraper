import { MXPlugin } from "./interfaces/MXPlugin";
import { Example } from "./plugins/example/Example";

export class MXScraper {
    plugins : MXPlugin[] = [];    
    constructor () {
        this.initPlugins ();
    }

    /**
     * Register avalaible plugins
     */
    initPlugins () {
        this.register (new Example());
    }

    /**
     * @param plugin Plugin to register
     */
    register (plugin : MXPlugin) {
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
     * Get a list of all plugins available
     */
    getAllPlugins () : MXPlugin[] {
        return [];
    }
}