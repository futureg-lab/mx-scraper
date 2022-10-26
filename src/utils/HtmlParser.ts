import {AnyNode, CheerioAPI, load} from "cheerio";
import { PPriority, PSymbol } from "./CustomAST";

/**
 * Simple CheerioAPI wrapper
 * In most cases, we may want :
 * * An array of things
 * * The nth item
 * * The last item
 * * The first item
 * * A count
 * * A recursive load call (example from one page to another)
 * 
 * * Logic : 
 *  parser.select('div')
 *        .where('property = @some_text [& [| ...]] ')
 *        .asText(), asHtml(), asValue ()
 *        .nth(x), all(), last(), first()
 */
export class HtmlParser {
    private cheerio : CheerioAPI = null;
    private html : string = null;
    private query : string = null;
    private result_cache : AnyNode [] = [];

    static SYMBOLS : PSymbol [] = ['&', '|', '(', ')'];
    static SYM_PRIORITY : PPriority = {
        '|' : {value : 1, associative : 'left'}, 
        '&' : {value : 2, associative : 'left'}
    };

    private constructor () { }

    static use (html : string) {
        const parser = new HtmlParser ();
        parser.html = html;
        parser.cheerio = load (html);
        return parser;
    }

    select (query : string) : HtmlParser {
        const $ = this.cheerio;
        this.query = query;
        this.result_cache = $(query).toArray ();
        return this;
    }

    static tokenizeFilterQuery (filter : string) : string[] {
        const sym_str = HtmlParser.SYMBOLS.join('');
        const rstr = '[' + sym_str + ']{1}';
        const astr = '[^' + sym_str + ']+';
        const tokens = filter
                        .match (new RegExp(rstr + '|' + astr, 'g'))
                        .map (token => token.trim())
                        .filter (token => token != '');
        return tokens;
    }

    where (filter : string) : HtmlParserQueryResult {
        const qresult = new HtmlParserQueryResult (this.result_cache);
        return qresult;
    }
}

export class HtmlParserQueryResult {
    private result : AnyNode [] = [];

    constructor (result : AnyNode[]) {
        this.result = result;
    }

    all () : AnyNode[] {
        return this.result;
    }

    nth (index : number) : AnyNode {
        if (index < 0 || index > this.result.length)
            return null;
        return this.result[index];
    }

    last () {
        return this.nth (this.result.length - 1);
    }

    first () {
        return this.nth (0);
    }
}