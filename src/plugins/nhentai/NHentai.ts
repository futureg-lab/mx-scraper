import { Book, PluginOption, Metadata, SearchOption } from "../../interfaces/BookDef";
import { MXPlugin } from "../../interfaces/MXPlugin";
import { CustomRequest, FlareSolverrProxyOption } from "../../utils/CustomRequest";

export class NHentai implements MXPlugin {
    title : string;
    author : string;
    version : string;
    target_url : string;
    unique_identifier : string;
    option : PluginOption;

    constructor () {
        // let's define some variables
        this.title = 'NHentai';
        this.author = 'afmika';
        this.version = '1.0.0';
        this.unique_identifier = 'nhentai';
        this.target_url = 'https://nhentai.net/';
    }

    config (option : PluginOption) : void {
        this.option = option;
    }

    fetchBook (hentai_id : string) : Book {
        const url = this.target_url + 'g/' + hentai_id;
        const request : CustomRequest = new CustomRequest(<FlareSolverrProxyOption>{
            proxy_url : 'http:'
        });
        return null;
    }

    search (term : string, option : SearchOption) : Book[] {
        return [];
    }
    
    sortChapters () : void {
        return null;
    }

    getMetaDatas () : Metadata[] {
        return null;
    }
}