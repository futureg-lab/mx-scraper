import { config } from "../environment";
import { CustomRequest, FlareSolverrProxyOption } from "../utils/CustomRequest";
import { Book, PluginOption, SearchOption } from "./BookDef";
import * as fs from 'fs';
import * as fsextra from 'fs-extra';
import * as path from 'path';
import { computeSignatureQuery } from "../utils/Downloader";
import { MXLogger } from "../cli/MXLogger";

export class MXPlugin {
    /**
     * Title | identifier of the plugin
     */
    title : string;

    /**
     * Author of the plugin
     */
    author : string;
    
    /**
     * Version of the plugin in x.y.z format
     */
    version : string;
    
    /**
     * Target url | website 
     */
    target_url : string;

    /**
     * Plugin option (Enabling a proxy for example)
     */
    option : PluginOption;
    
    /**
     * Perform http request using a single instance
     */
    request : CustomRequest;

    /**
     * @param identifier fetch all, fetch a specific chapter... etc
     */
    async fetchBook (identifier : string) : Promise<Book> {
        throw Error ('Yet to be implemented');
    }


    /**
     * Write a book metadata in a temp folder to accelerate future requests
     * @param query 
     * @param book 
     * @returns 
     */
    static writeBookTocache (query : string, book : Book) : boolean {
        if (!book)
            return;
        const text = JSON.stringify (book, null, 2);
        const filename = computeSignatureQuery (query) + '.json';
        const base = config.CACHE.FOLDER;
        if (!fs.existsSync (base))
            fsextra.mkdirSync (base, {recursive : true});
        fs.writeFileSync (path.join(base, filename), text);
    }

    /**
     * Fetch a book from the cache folder, returns null if nothing is found
     * @param query 
     * @returns 
     */
    static fetchBookFromCache (query : string) : Book {
        const filename = computeSignatureQuery (query) + '.json';
        const base = config.CACHE.FOLDER;
        const compl_path = path.join(base, filename);
        if (fs.existsSync(compl_path)) {
            const raw_text = fs.readFileSync (compl_path).toString();
            const raw_json = JSON.parse (raw_text);
            return <Book> raw_json;
        }
        return null;
    }


    /**
     * * Get a book from source if not cached
     * * if `cache` is disabled, it is equivalent to `MXPlugin.fetchBook`
     * @param query query string | book identifier
     * @returns 
     */
    async getBook (query : string) : Promise<Book> {
        if (config.CACHE.ENABLE) {
            let book : Book = null;
            const cached : Book = MXPlugin.fetchBookFromCache (query);
            if (cached) {
                MXLogger.info ('[Cache] Loading ' + query);
                book = cached;
            } else {
                book = await this.fetchBook (query);
                MXPlugin.writeBookTocache (query, book);
            }
            return book;
        }
        return await this.fetchBook (query);
    }

    /**
     * @param term search keyword
     * @param option search option
     */
    async search (term : string, option : SearchOption) : Promise<Book[]> {
        throw Error ('Yet to be implemented');
    }

    /**
     * * Configure current plugin
     * * By default, this function setups a cloudfare proxy if option.useFlareSolverr is set to true
     * @param option
     */
     async configure (option : PluginOption) : Promise<void> {
        this.option = option;
        if (this.option.useFlareSolverr) {
            const solver_option : FlareSolverrProxyOption = <FlareSolverrProxyOption>{
                proxy_url : config.CLOUDFARE_PROXY_HOST,
                timeout : config.CLOUDFARE_MAX_TIMEOUT,
                session_id : this.option.useThisSessionId || undefined
            };
            this.request.configureProxy (solver_option);
            await this.request.initProxySession (); // init session if there are none
        }
    }
    
    /**
     * Useful if there are remaining sessions
     */
    async destructor () {
        if (!this.option || !this.request.proxy)
            return;
        if (this.option.useFlareSolverr && this.request.proxy.session_id)
            await this.request.destroyProxySession ();
    }
}