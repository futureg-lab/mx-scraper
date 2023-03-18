import { config } from "../environment";
import { CustomRequest, FlareSolverrProxyOption } from "../utils/CustomRequest";
import { Book, ParseLinkHint, PluginOption, SearchOption } from "./BookDef";
import * as fs from 'fs';
import * as fsextra from 'fs-extra';
import * as path from 'path';
import { computeSignatureQuery } from "../utils/Downloader";
import { MXLogger } from "../cli/MXLogger";
import { CheerioAPI, load } from "cheerio";

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
     * @returns id of the current plugin
     */
    getPluginID() {
        return this.constructor.name;
    }

    /**
     * @param identifier fetch all, fetch a specific chapter... etc
     */
    async fetchBook (identifier : string) : Promise<Book> {
        throw Error ('Yet to be implemented');
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
            const cached : Book = this.fetchBookFromCache (query);
            if (cached) {
                MXLogger.info ('[Cache] Loading ' + query);
                book = cached;
            } else {
                book = await this.fetchBook (query);
                this.writeBookTocache (query, book);
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
                timeout : config.CLOUDFARE_MAX_TIMEOUT
            };
            this.request.configureProxy (solver_option);
        }
    }

    static async autoScanIndirectLink (request : CustomRequest, intermediate_link : string, hint? : ParseLinkHint) : Promise<string[]> {
        // retrieve the real link
        const response_html = await request.get (intermediate_link);
        const $ : CheerioAPI = load (response_html);
        let parse_hint = <ParseLinkHint>{
            selector : hint ? hint.selector : 'img',
            attribute : hint ? hint.attribute : 'src'
        };
        const real_link = $(parse_hint.selector)
                        .first ()
                        .attr (parse_hint.attribute) || '';

        const comp_ext = real_link.split('.').pop();
        const extension = comp_ext && comp_ext != '' ? comp_ext : 'jpg';
        return [real_link, extension];
    }
    
    async destructor () {
        if (!this.option || !this.request.proxy)
            return;
        await this.request.destroy ();
    }

    /**
     * Write a book metadata in a temp folder to accelerate future requests
     * @param query 
     * @param book 
     * @returns 
     */
    writeBookTocache (query : string, book : Book) : boolean {
        if (!book)
            return;
        const text = JSON.stringify (book, null, 2);
        const plugin_name = this.title;
        const filename = computeSignatureQuery (query, plugin_name) + '.json';
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
    fetchBookFromCache (query : string) : Book {
        const plugin_name = this.title;
        const filename = computeSignatureQuery (query, plugin_name) + '.json';
        const base = config.CACHE.FOLDER;
        const compl_path = path.join(base, filename);
        if (fs.existsSync (compl_path)) {
            const raw_text = fs.readFileSync (compl_path).toString();
            const raw_json = JSON.parse (raw_text);
            return <Book> raw_json;
        }
        return null;
    }
}