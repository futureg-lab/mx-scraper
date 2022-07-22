import { MXPlugin } from "./interfaces/MXPlugin";

export class MXScraper {
    initPlugins () {

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