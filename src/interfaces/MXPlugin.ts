import { Book, Option, Metadata } from "./BookDef";

export interface MXPlugin {
    title : string;
    author : string;
    version : string;
    target_url : string;

    /**
     * @param option fetch all, fetch a specific chapter... etc
     */
    fetchBook (option : Option) : Book;

    /**
     * @param term search keyword
     * @param option search option
     */
    search (term : string, option : Option) : Book[];
    
    sortChapters () : void;
    getMetaDatas () : Metadata[];
}