import { config } from "../environment";
import { CustomRequest, FlareSolverrProxyOption } from "../utils/CustomRequest";
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
     * Version of the plugin in x.y.z format
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
     * * Configure current plugin
     * * By default, this function setups a cloudfare proxy if option.useFlareSolverr is set to true
     * @param option
     */
     async configure (option : PluginOption) : Promise<void> {
        this.option = option;
        if (this.option.useFlareSolverr) {
            const solver_option : FlareSolverrProxyOption = <FlareSolverrProxyOption>{
                proxy_url : config.CLOUDFARE_PROXY_HOST,
                timeout : config.CLOUDFARE_MAX_TIMEOUT,
                session_id : this.option.useThisSessionId || undefined
            };
            this.request.configureProxy (solver_option);
            await this.request.initProxySession (); // init session if there are none
        }
    }
    
    /**
     * Useful if there are remaining sessions
     */
    async destructor () {
        if (!this.option)
            return;
        
        if (this.option.useFlareSolverr && this.request.proxy.session_id)
            await this.request.destroyProxySession ();
    }
}