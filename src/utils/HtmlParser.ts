import { AnyNode, CheerioAPI, load } from "cheerio";
import { ASTNode, CustomAST, PPriority, PSymbol } from "./CustomAST.ts";
import { interSet, unionSet } from "./Utils.ts";

type FilterContent = "value" | "html" | "text" | "**";
type MapFunc<T> = {
  (x: T, i: number): any;
};

/**
 * CheerioAPI wrapper for enabling SQL-like filters.
 * 
 * In most cases, we may want :
 * * An array of things
 * * The nth item
 * * The last item
 * * The first item
 * * A count
 * * A recursive load call (example from one page to another)
 *
 * Example:
 * ```
 *  parser.select('div')
 *        .where('attr.name1 = v1 & (attr.name2 = v2 | some_prop = v3) ..')
 *        .nth(x), all(), last(), first()
 *        .asText(), asHtml(), asValue ()
 * ```
 */
export class HtmlParser {
  private $: CheerioAPI = null;
  private constructor(readonly html: string) {}

  static use(html: string) {
    const parser = new HtmlParser(html);
    parser.$ = load(html);
    return parser;
  }

  getApi(): CheerioAPI {
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
  static testMatch(content: string, str: string) {
    if (!content || !str) return false;

    if (str.startsWith("%") && str.endsWith("%")) {
      str = str.substring(1, str.length); // remove % at the start
      str = str.substring(0, str.length - 1); // remove % at the end
      return content.includes(str);
    }

    if (str.startsWith("%")) {
      str = str.substring(1, str.length); // remove %
      return content.endsWith(str);
    }

    if (str.endsWith("%")) {
      str = str.substring(0, str.length - 1); // remove %
      return content.startsWith(str);
    }

    if (str.startsWith("@reg")) {
      // regex
      try {
        const match_res = str.match(/\/(.*)?\/(.*)?/i);
        if (!match_res || match_res.length < 2) {
          throw Error('regex pattern invalid, expects "@reg /{regex}/{flag}"');
        }
        const [, pattern, mode] = match_res;
        const regex = new RegExp(pattern, mode);
        return regex.test(content);
      } catch (err) {
        throw Error('Error parsing "' + str + '" : ' + err.message);
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
  select(query: string): HtmlParserQueryResult {
    const $ = this.$;
    const result = $(query).toArray()
      .map((node: any) => HtmlNode.from($, node));
    return new HtmlParserQueryResult(result);
  }

  /**
   * Retrieve text from `<title>..</title>`
   * Example :
   * * HtmlParser.use(exampleHtml).title(); // returns Example
   * @returns
   */
  title(): string {
    return this
      .select("title")
      .first()!
      .asText();
  }
}

export class HtmlParserQueryResult {
  private result: HtmlNode[] = [];

  static SYMBOLS: PSymbol[] = ["&", "|", "(", ")"];
  static SYM_PRIORITY: PPriority = {
    "|": { value: 1, associative: "left" },
    "&": { value: 2, associative: "left" },
  };
  static OPERATOR_FUNC = {
    "&": (a: HtmlNode[], b: HtmlNode[]) =>
      interSet<HtmlNode>(new Set<HtmlNode>(a), new Set<HtmlNode>(b)),
    "|": (a: HtmlNode[], b: HtmlNode[]) =>
      unionSet<HtmlNode>(new Set<HtmlNode>(a), new Set<HtmlNode>(b)),
  } as Record<string, CallableFunction>;

  constructor(result: HtmlNode[]) {
    this.result = result;
  }

  static tokenizeFilterQuery(filter: string): string[] {
    const sym_str = HtmlParserQueryResult.SYMBOLS.join("");
    const rstr = "[" + sym_str + "]{1}";
    const astr = "[^" + sym_str + "]+";
    const tokens = filter
      .match(new RegExp(rstr + "|" + astr, "g"))!
      .map((token) => token.trim())
      .filter((token) => token != "");
    return tokens;
  }

  /**
   * Examples :
   * * qstr = 'some_field : foo'
   * * qstr = 'some_field : "foo bar"'
   * * qstr = 'attr.href : http://example.com'
   * @param qstr
   * @param result
   */
  static evalResult(qstr: string, result: HtmlNode[]) {
    const matches = qstr.match(/(.+)?(\:|=)(.+)/);
    if (!matches) {
      throw Error('invalid expression "' + qstr + "'");
    }

    let [, field, _operator, value] = matches;
    [field, value] = [field, value].map((_) => _.trim());

    const str_regex = /^"(.*)"$|^'(.*)'$/;
    const is_string = str_regex.test(value);
    if (is_string) {
      // assuming value is trimed
      const temp = value.match(str_regex);
      const [, content] = temp!;
      value = content;
    }

    const syntax = {
      field,
      query: {
        type: is_string ? "string" : "literal",
        value: value,
      },
    };

    if (!is_string && syntax.query.value == "") {
      throw Error('invalid literal at "' + qstr + '"');
    }

    // validation
    const partial_quotes = /^"(.*)|^'(.*)|(.*)"$|(.*)'$/;
    if (syntax.query.type == "literal" && partial_quotes.test(value)) {
      throw Error("invalid literal due to \" or '");
    }

    const { filterResult, filterAttrResult } = HtmlParserQueryResult;
    const valid: FilterContent[] = ["html", "text", "value"];
    if ((<string[]> valid).includes(syntax.field)) {
      return filterResult(
        result,
        <FilterContent> syntax.field,
        syntax.query.value,
      );
    }

    if (syntax.field.startsWith("attr.")) {
      const field = syntax.field.replace("attr.", "");
      return filterAttrResult(result, field, syntax.query.value);
    }

    throw Error('invalid expression "' + syntax.field + '"');
  }

  private static whereHelper(
    node: ASTNode,
    list_nodes: HtmlNode[],
  ): HtmlNode[] {
    if (!node) {
      throw Error("Parsing error, invalid query");
    }

    if (node.isLeaf()) {
      const node_eval = HtmlParserQueryResult.evalResult(
        node?.value!,
        list_nodes,
      );
      return node_eval;
    }
    const operator = node.value!;
    const operator_func = HtmlParserQueryResult.OPERATOR_FUNC[operator];
    if (!operator_func) {
      throw Error('symbol "' + operator + "' is not an operator");
    }
    // TODO: optimize
    // maybe tag known excluded subsets?
    const left_eval = HtmlParserQueryResult.whereHelper(node?.left!, list_nodes);
    const right_eval = HtmlParserQueryResult.whereHelper(node?.right!, list_nodes);
    const res_set: Set<HtmlNode> = operator_func(left_eval, right_eval);
    return Array.from(res_set);
  }

  /**
   * Example :
   * * filter = "attr.alt : %sleeping%  &  (attr.src : %cat% | attr.src : %dog%) & attr.src : %.jpg "
   * @param filter
   * @returns
   */
  where(filter: string): HtmlParserQueryResult {
    const {
      SYMBOLS,
      SYM_PRIORITY,
      tokenizeFilterQuery,
      whereHelper,
    } = HtmlParserQueryResult;
    const parser = new CustomAST(SYMBOLS, SYM_PRIORITY);
    const tokens = tokenizeFilterQuery(filter);
    const ast_result = parser.constructAbstractSyntaxTree(tokens);
    // ast_result.tree.print();

    this.result = whereHelper(ast_result.tree, this.result);
    return this;
  }

  /**
   * Filter by comparing the value type with `value`
   * @param result
   * @param type 'value' | 'html' | 'text' | '**';
   * @param str
   * @returns
   */
  private static filterResult(
    result: HtmlNode[],
    type: FilterContent,
    str: string,
  ) {
    const func = new Map<FilterContent, any>();
    func.set("**", (_x: HtmlNode, _: number) => true);
    func.set(
      "html",
      (x: HtmlNode, _: number) => HtmlParser.testMatch(x.asHtml(), str),
    );
    func.set(
      "text",
      (x: HtmlNode, _: number) => HtmlParser.testMatch(x.asText(), str),
    );
    func.set("value", (x: HtmlNode, _: number) => {
      const val: string | string[] = x.asValue();
      if (!val) {
        return false;
      }
      if (typeof val == "string") {
        return HtmlParser.testMatch(val, str);
      }
      // array
      return val.filter((x) => HtmlParser.testMatch(x, str)).length > 0;
    });
    return result.filter(func.get(type));
  }

  /**
   * Filter by comparing the attribute value with `str`
   * @param attr_name
   * @param str
   * @returns
   */
  private static filterAttrResult(
    result: HtmlNode[],
    attr_name: string,
    str: string,
  ) {
    return result.filter((x: HtmlNode, _: number) => {
      return HtmlParser.testMatch(x.attr(attr_name), str);
    });
  }

  /**
   * Run eval on a given expression
   * * [Note] : A call mutates the current instance
   * - Examples :
   * * qstr = 'some_field : foo'
   * * qstr = 'some_field : "foo bar"'
   * * qstr = 'attr.href : http://example.com'
   * @param qstr
   */
  eval(qstr: string) {
    this.result = HtmlParserQueryResult.evalResult(qstr, this.result);
    return this;
  }

  /**
   * Filter by comparing the value type with `value`
   * * [Note] : A call mutates the current instance
   * @param type 'value' | 'html' | 'text' | '**';
   * @param str
   * @returns
   */
  filter(type: FilterContent, str: string) {
    this.result = HtmlParserQueryResult.filterResult(this.result, type, str);
    return this;
  }

  /**
   * Filter by comparing the attribute value with `str`
   * * [Note] : A call mutates the current instance
   * @param attr_name
   * @param str
   * @returns
   */
  filterAttr(attr_name: string, str: string) {
    this.result = HtmlParserQueryResult.filterAttrResult(
      this.result,
      attr_name,
      str,
    );
    return this;
  }

  /**
   * @returns All nodes
   */
  all(): HtmlNode[] {
    return this.result;
  }

  /**
   * @param fun
   * @returns
   */
  map<T>(fun: MapFunc<HtmlNode>): T[] {
    return this.result.map(fun);
  }

  /**
   * @param index
   * @returns node at a specific index  in the current result (0-indexed)
   */
  at(index: number) {
    if (index < 0 || index > this.result.length) {
      return null;
    }
    return this.result[index];
  }

  /**
   * @param num
   * @returns node at a specific place in the current result (1-indexed)
   */
  nth(num: number): HtmlNode | null {
    if (num <= 0) {
      throw Error("num <= 0 encountered");
    }
    return this.at(num - 1);
  }

  /**
   * @returns last item in the current result
   */
  last() {
    return this.nth(this.result.length);
  }

  /**
   * @returns first item in the current result
   */
  first() {
    return this.nth(1);
  }

  /**
   * @returns length of the current result
   */
  count() {
    return this.result.length;
  }
}

/**
 * Wrapper for AnyNode
 */
export class HtmlNode {
  private representation: AnyNode = null;
  private $: CheerioAPI = null;

  static from(api: CheerioAPI, cheerio_node: AnyNode) {
    const node = new HtmlNode();
    node.representation = cheerio_node;
    node.$ = api;
    return node;
  }

  attr(attr_name: string) {
    return this.$(this.representation).attr(attr_name);
  }
  asAnyNode(): AnyNode {
    return this.representation;
  }
  asText() {
    return this.$(this.asAnyNode()).text();
  }
  asValue() {
    return this.$(this.asAnyNode()).val();
  }
  asHtml() {
    return this.$(this.asAnyNode()).html();
  }
}
