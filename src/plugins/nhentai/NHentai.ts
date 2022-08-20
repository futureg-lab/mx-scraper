import { Book, Option, Metadata } from "../../interfaces/BookDef";
import { MXPlugin } from "../../interfaces/MXPlugin";
import { CustomOption } from "./NHOption";

export class NHentai implements MXPlugin {
    title : string;
    author : string;
    version : string;
    target_url : string;

    constructor () {
        // let's define some variables
        this.title = 'NHentai';
        this.author = 'afmika';
        this.version = '1.0.0';
        this.target_url = 'https://nhentai.net/';
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