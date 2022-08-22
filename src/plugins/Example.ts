import { Book, PluginOption, Metadata, SearchOption } from "../interfaces/BookDef";
import { MXPlugin } from "../interfaces/MXPlugin";
import { CustomRequest } from "../utils/CustomRequest";

export class Example implements MXPlugin {
    title : string;
    author : string;
    version : string;
    target_url : string;
    unique_identifier : string;
    option : PluginOption;
    request : CustomRequest;

    constructor () {
        // let's define some variables
        this.title = 'Plugin Example';
        this.unique_identifier = 'example';
        this.author = 'afmika';
        this.version = '1.0.0';
        this.target_url = 'https://example.com';
    }

    async configure (option : PluginOption) : Promise<void> {
        this.option = option;
    }

    fetchBook (identifier : string) : Promise<Book> {
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
            this.request.destroyProxySession ();
    }
}