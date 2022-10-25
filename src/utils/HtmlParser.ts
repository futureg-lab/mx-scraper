import {AnyNode, CheerioAPI, load} from "cheerio";

type PPriority = {[key : string] : number};
type PSymbol = string;

const SYMBOLS : PSymbol [] = ['&', '|', '(', ')'];
const SYM_PRIORITY : PPriority = {'&' : 2, '|' : 1};

const topValueOf = (arr : number[]) => arr[arr.length - 1];


export class ASTNodeQuery {
    parent : ASTNodeQuery = null;
    left : ASTNodeQuery = null;
    right : ASTNodeQuery = null;
    value : string = null;
    constructor (value : string) {
        this.value = value;
    }

    private indentHelper (depth : number) {
        return new Array(depth).fill('  ').join('');
    }

    private printHelper (node : ASTNodeQuery, depth : number) {
        if (node == null)
            return '';
        const left_str = this.printHelper (node.left, depth + 1);
        const right_str = this.printHelper (node.right, depth + 1)
        let final_str = "-- '" + node.value + "'";
        if (left_str != '') final_str += '\n' + this.indentHelper(depth + 1) + '|' + left_str;
        if (right_str != '') final_str += '\n' + this.indentHelper(depth + 1) + '|' +  right_str;
        return final_str;
    }
    print () {
        console.log(this.printHelper (this, 0))
    }
};

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
        const sym_str = SYMBOLS.join('');
        const rstr = '[' + sym_str + ']{1}';
        const astr = '[^' + sym_str + ']+';
        const tokens = filter
                        .match (new RegExp(rstr + '|' + astr, 'g'))
                        .map (token => token.trim())
                        .filter (token => token != '');
        return tokens;
    }


    static convertToInfix (tokens : string[], symbols : PSymbol[], PPriority : PPriority) : string [] {
        const nearSubstr = (str : string) => str.substring (str.length - 10, str.length);
        const operators = [];
        const expressions = [];
        let running_expr = '';

        for (let token of tokens) {
            running_expr += token;
            if (SYMBOLS.includes(token)) {
                if (token == '(') {
                    operators.push (token);
                } else if (token == ')') {
                    let stop = false;
                    while (!stop) {
                        const top = operators.pop();
                        if (!top)
                            throw Error ('Error expression near ..' + nearSubstr (running_expr));
                        if (top == '(') 
                            stop = true;
                        else
                            expressions.push (top);
                    }
                } else {
                    // & and |
                    if (operators.length > 0) {
                        const top_operator = topValueOf (operators);
                        if (SYM_PRIORITY[token] < SYM_PRIORITY[top_operator])
                            expressions.push (operators.pop());
                    }
                    operators.push (token);
                }
            } else
                expressions.push (token);
        }

        while (operators.length > 0)
            expressions.push (operators.pop());

        return expressions;
    }

    static constructAbstractSyntaxTree (tokens : string[]) : ASTNodeQuery {
        const expr : string [] = HtmlParser.convertToInfix (tokens, SYMBOLS, SYM_PRIORITY);
        console.log (expr);
        let nodes : ASTNodeQuery[] = expr.map (token => new ASTNodeQuery(token));
        let next_nodes : ASTNodeQuery[] = [];
        while (nodes.length > 1) {
            for (let i = 0; i < nodes.length; i++) {
                if (SYMBOLS.includes (nodes[i].value)) {
                    // current_nodes[i] is parent
                    nodes[i].left = nodes[i - 1];
                    nodes[i - 1].parent = nodes[i];
    
                    nodes[i].right = nodes[i - 2];
                    nodes[i - 2].parent = nodes[i];
                    
                    next_nodes.pop();
                    next_nodes.pop();
                }
                next_nodes.push (nodes[i]);
            }
            nodes = next_nodes;
        }
        return nodes.pop(); // root
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