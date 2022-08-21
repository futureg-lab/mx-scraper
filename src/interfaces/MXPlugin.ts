import { CustomRequest } from "../utils/CustomRequest";
import { Book, PluginOption, Metadata, SearchOption } from "./BookDef";

export interface MXPlugin {
    title : string;
    author : string;
    version : string;
    target_url : string;
    option : PluginOption;
    request : CustomRequest;

    /**
     * @param identifier fetch all, fetch a specific chapter... etc
     */
    fetchBook (identifier : string) : Promise<Book>;

    /**
     * @param term search keyword
     * @param option search option
     */
    search (term : string, option : SearchOption) : Promise<Book[]>;

    configure (option : PluginOption) : Promise<void>;
    
    getMetaDatas () : Metadata[];

    /**
     * Useful if there are remaining sessions
     */
    destructor () : Promise<void>;
}