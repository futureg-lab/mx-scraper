import {AnyNode, CheerioAPI, load} from "cheerio";
import { CustomAST, PPriority, PSymbol } from "./CustomAST";

type FilterContent = 'value' | 'html' | 'text' | '**';

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
    private $ : CheerioAPI = null;
    private html : string = null;
    private query : string = null;

    static SYMBOLS : PSymbol [] = ['&', '|', '(', ')'];
    static SYM_PRIORITY : PPriority = {
        '|' : {value : 1, associative : 'left'}, 
        '&' : {value : 2, associative : 'left'}
    };

    private constructor () { }

    static use (html : string) {
        const parser = new HtmlParser ();
        parser.html = html;
        parser.$ = load (html);
        return parser;
    }

    getApi () : CheerioAPI {
        return this.$;
    }

    /**
     * Test content against str
     * * Example 1 : content='Hello World', str = '%World' => true
     * * Example 2 : content='Hello World', str = 'World%' => false
     * * Example 3 : content='Hello World', str = '@reg /W(.+)d/i' => true
     * @param content content
     * @param str 
     * @returns 
     */
     static testMatch (content : string, str : string) {
        if (!content || !str) return false;

        if (str.startsWith('%') && str.endsWith('%')) {
            str = str.substring (1, str.length); // remove % at the start
            str = str.substring (0, str.length - 1); // remove % at the end
            return content.includes (str);
        }
        
        if (str.startsWith('%')) {
            str = str.substring (1, str.length); // remove %
            return content.endsWith (str);
        }

        if (str.endsWith('%')) {
            str = str.substring (0, str.length - 1); // remove %
            return content.startsWith (str);
        }

        if (str.startsWith('@reg')) {
            // regex
            try {
                const match_res = str.match (/\/(.*)?\/(.*)?/i);
                if (!match_res || match_res.length < 2)
                    throw Error ('regex pattern invalid, expects "@reg /{regex}/{flag}"');
                const [ , pattern, mode] = match_res;
                const regex = new RegExp (pattern, mode);
                return regex.test (content);
            } catch (err) {
                throw Error ('Error parsing "' + str + '" : ' + err.message);
            }
        }

        return content == str;
    }

    /**
     * Example :
     * * HtmlParser.use(html).select('div>span')
     * @param query 
     * @returns 
     */
    select (query : string) : HtmlParserQueryResult {
        const $ = this.$;
        this.query = query;
        const result = $(query).toArray ()
                                    .map (node => HtmlNode.from($, node));
        return new HtmlParserQueryResult (this, result);;
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
}

export class HtmlParserQueryResult {
    private result : HtmlNode [] = [];
    private parser : HtmlParser = null;

    constructor (parser : HtmlParser, result : HtmlNode[]) {
        this.parser = parser;
        this.result = result;
    }
    
    where (filter : string) : HtmlParserQueryResult {
        const parser = new CustomAST (HtmlParser.SYMBOLS, HtmlParser.SYM_PRIORITY);
        const tokens = HtmlParser.tokenizeFilterQuery (filter);
        const ast_result = parser.constructAbstractSyntaxTree (tokens);
        ast_result.tree.print();
        return this;
    }

    /**
     * Filter by comparing the value type with `value`
     * @param type 'value' | 'html' | 'text' | '**';
     * @param str 
     * @returns 
     */
    filter (type : FilterContent, str : string) {
        const $ = this.parser.getApi ();
        const func = new Map<FilterContent, any>();
        func.set ('**', (x : HtmlNode, _ : number) => true);
        func.set ('html', (x : HtmlNode, _ : number) => HtmlParser.testMatch (x.asHtml(), str));
        func.set ('text', (x : HtmlNode, _ : number) => HtmlParser.testMatch (x.asText(), str));
        func.set ('value', (x : HtmlNode, _ : number) => {
            const val : string | string[] = x.asValue ();
            if (!val) 
                return false;
            if (typeof val == 'string')
                return HtmlParser.testMatch (val, str);
            // array
            return val.filter (x => HtmlParser.testMatch (x, str)).length > 0;
        });

        this.result = this.result.filter (func.get(type));
        
        return this;
    }

    /**
     * Filter by comparing the attribute value with `str`
     * @param attr_name
     * @param str 
     * @returns 
     */
    filterAttr (attr_name : string, str : string) {
        this.result = this.result.filter ((x : HtmlNode, _ : number) => {
            return HtmlParser.testMatch (x.attr(attr_name), str);
        });
        return this;
    }

    /**
     * @returns All nodes
     */
    all () : HtmlNode[] {
        return this.result;
    }

    /**
     * @param index 
     * @returns node at a specific index  in the current result (0-indexed)
     */
    at (index : number) {
        if (index < 0 || index > this.result.length)
            return null;
        return this.result[index];
    }

    /**
     * @param num 
     * @returns node at a specific place in the current result (1-indexed)
     */
    nth (num : number) : HtmlNode {
        if (num <= 0)
            throw Error ('num <= 0 encountered');
        return this.at (num - 1);
    }

    /**
     * @returns last item in the current result 
     */
    last () {
        return this.nth (this.result.length);
    }

    /**
     * @returns first item in the current result 
     */
    first () {
        return this.nth (1);
    }

    /**
     * @returns length of the current result 
     */
    count () {
        return this.result.length;
    }
}

/**
 * Wrapper for AnyNode
 */
 export class HtmlNode {
    private representation : AnyNode = null;
    private $ : CheerioAPI = null;

    static from (api : CheerioAPI, cheerio_node : AnyNode) {
        const node = new HtmlNode();
        node.representation = cheerio_node;
        node.$ = api;
        return node;
    }

    attr (attr_name : string) { return this.$(this.representation).attr (attr_name); }
    asAnyNode () : AnyNode { return this.representation; }
    asText () { return this.$(this.asAnyNode()).text (); }
    asValue () { return this.$(this.asAnyNode()).val (); }
    asHtml () { return this.$(this.asAnyNode()).html (); }
}