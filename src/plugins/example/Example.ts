import { Book, PluginOption, Metadata, SearchOption } from "../../interfaces/BookDef";
import { MXPlugin } from "../../interfaces/MXPlugin";

export class Example implements MXPlugin {
    title : string;
    author : string;
    version : string;
    target_url : string;
    unique_identifier : string;
    option : PluginOption;

    constructor () {
        // let's define some variables
        this.title = 'Plugin Example';
        this.unique_identifier = 'example';
        this.author = 'afmika';
        this.version = '1.0.0';
        this.target_url = 'https://example.com';
    }

    config (option : PluginOption) : void {
        this.option = option;
    }

    fetchBook (identifier : string) : Book {
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