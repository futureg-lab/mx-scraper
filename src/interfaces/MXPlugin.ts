import { Book, PluginOption, Metadata, SearchOption } from "./BookDef";

export interface MXPlugin {
    title : string;
    author : string;
    version : string;
    target_url : string;
    unique_identifier : string;
    option : PluginOption;

    /**
     * @param identifier fetch all, fetch a specific chapter... etc
     */
    fetchBook (identifier : string) : Book;

    /**
     * @param term search keyword
     * @param option search option
     */
    search (term : string, option : SearchOption) : Book[];

    config (option : PluginOption) : void;
    
    sortChapters () : void;
    getMetaDatas () : Metadata[];
}