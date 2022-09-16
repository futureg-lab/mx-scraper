import { Book, PluginOption, SearchOption } from "../core/BookDef";
import { MXPlugin } from "../core/MXPlugin";
import { CustomRequest } from "../utils/CustomRequest";

export class Example extends MXPlugin {
    title : string = 'Example';
    author : string = 'afmika';
    version : string = '1.0.0';
    target_url : string = 'https://example.com';
    option : PluginOption;
    request : CustomRequest;

    constructor () {
        super ();
        this.request = new CustomRequest ();
    }

    override async configure (option : PluginOption) : Promise<void> {
        this.option = option;
    }

    override async fetchBook (identifier : string) : Promise<Book> {
        return null;
    }

    override async search (term : string, option : SearchOption) : Promise<Book[]> {
        return [];
    }

    override async destructor () {
    }
}