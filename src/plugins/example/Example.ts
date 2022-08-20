import { Book, Option, Metadata } from "../../interfaces/BookDef";
import { MXPlugin } from "../../interfaces/MXPlugin";
import { CustomOption } from "./CustomOption";

export class Example implements MXPlugin {
    title : string;
    author : string;
    version : string;
    target_url : string;

    constructor () {
        // let's define some variables
        this.title = 'Plugin Example';
        this.author = 'afmika';
        this.version = '1.0.0';
        this.target_url = 'https://some_website.com';
    }

    fetchBook (option : number) : Book {
        return null;
    }

    search (term : string, option : Option) : Book[] {
        return [];
    }
    
    sortChapters () : void {
        return null;
    }

    getMetaDatas () : Metadata[] {
        return null;
    }
}