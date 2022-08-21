import { Book, PluginOption, Metadata, SearchOption } from "../../interfaces/BookDef";
import { MXPlugin } from "../../interfaces/MXPlugin";
import { CustomRequest, FlareSolverrProxyOption } from "../../utils/CustomRequest";
import { config } from "../../utils/environement";

export class NHentai implements MXPlugin {
    title : string;
    author : string;
    version : string;
    target_url : string;
    unique_identifier : string;
    option : PluginOption;
    request : CustomRequest;

    constructor () {
        // let's define some variables
        this.title = 'NHentai';
        this.author = 'afmika';
        this.version = '1.0.0';
        this.unique_identifier = 'nhentai';
        this.target_url = 'https://nhentai.net/';
        this.request = new CustomRequest();
    }

    async configure (option : PluginOption) : Promise<void> {
        this.option = option;
        if (this.option.useFlareSolverr) {
            const solver_option : FlareSolverrProxyOption = <FlareSolverrProxyOption>{
                proxy_url : config.CLOUDFARE_PROXY_HOST,
                timeout : config.CLOUDFARE_MAX_TIMEOUT
            };
            this.request.configureProxy (solver_option);
            await this.request.initProxySession (); // init session if there are none
        }
    }

    async fetchBook (hentai_id : string) : Promise<Book> {
        const url = this.target_url + 'g/' + hentai_id;
        let response_html = await this.request.get(url);

        return null;
    }

    async search (term : string, option : SearchOption) : Promise<Book[]> {
        return [];
    }

    getMetaDatas () : Metadata[] {
        return null;
    }

    async destructor () {
        if (this.request.proxy.session_id)
            await this.request.destroyProxySession ();
    }
}