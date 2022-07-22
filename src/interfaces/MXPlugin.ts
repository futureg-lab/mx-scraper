import { Book, Option, Metadata } from "./BookDef";

export interface MXPlugin {
    title : string;
    author : string;
    version : string;
    target_url : string;

    fetchBook () : Book;
    search (term : string, option : Option) : Book[];
    
    sortChapters () : void;
    getMetaDatas () : Metadata[];
}