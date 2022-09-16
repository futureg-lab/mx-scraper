import { CustomRequest } from "../utils/CustomRequest";
import { Book, PluginOption, SearchOption } from "./BookDef";

export class MXPlugin {
    /**
     * Title | identifier of the plugin
     */
    title : string;

    /**
     * Author of the plugin
     */
    author : string;
    
    /**
     * Version of the plugin x.y.z format
     */
    version : string;
    
    /**
     * Target url | website 
     */
    target_url : string;

    /**
     * Plugin option (Enabling a proxy for example)
     */
    option : PluginOption;
    
    /**
     * Perform http request using a single instance
     */
    request : CustomRequest;

    /**
     * @param identifier fetch all, fetch a specific chapter... etc
     */
    async fetchBook (identifier : string) : Promise<Book> {
        throw Error ('Yet to be implemented');
    }

    /**
     * @param term search keyword
     * @param option search option
     */
    async search (term : string, option : SearchOption) : Promise<Book[]> {
        throw Error ('Yet to be implemented');
    }

    /**
     * Configure current plugin
     * @param option
     */
    async configure (option : PluginOption) {
        this.option = option;
    }
    
    /**
     * Useful if there are remaining sessions
     */
    async destructor () {
        // nothing to do
    }
}