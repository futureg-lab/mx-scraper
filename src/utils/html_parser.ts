import { AnyNode, CheerioAPI, load } from "cheerio";
import {
  ASTNode,
  ASTResult,
  CustomAST,
  PPriority,
  PSymbol,
} from "./custom_ast.ts";
import { interSet, unionSet } from "./utils.ts";

type FilterContent = "value" | "html" | "text" | "**";
type MapFunc<T, O> = {
  (x: T, i: number): O;
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
  private $: CheerioAPI | null = null;
  private constructor(readonly html: string) {}

  static use(html: string) {
    const parser = new HtmlParser(html);
    parser.$ = load(html);
    return parser;
  }

  getApi(): CheerioAPI {
    if (!this.$) {
      throw Error("Parser api not initialized");
    }
    return this.$!;
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
        const matchRes = str.match(/\/(.*)?\/(.*)?/i);
        if (!matchRes || matchRes.length < 2) {
          throw Error('regex pattern invalid, expects "@reg /{regex}/{flag}"');
        }
        const [, pattern, mode] = matchRes;
        const regex = new RegExp(pattern, mode);
        return regex.test(content);
      } catch (err) {
        throw Error(`Error parsing "${str}": ${err.message}`);
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
    const $ = this.getApi();
    const result = $(query).toArray()
      .map((node) => new HtmlNode($, node));
    return new HtmlParserQueryResult(result);
  }

  /**
   * Retrieve text from `<title>..</title>`
   * Example :
   * * HtmlParser.use(exampleHtml).title(); // returns Example
   * @returns
   */
  title() {
    return this
      .select("title")
      .first()
      ?.asText();
  }
}

export class HtmlParserQueryResult {
  private result: HtmlNode[] = [];
  private astResult: ASTResult | null = null; // for testing

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
  } as Record<string, (a: HtmlNode[], b: HtmlNode[]) => Set<HtmlNode>>;

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
      throw Error(`invalid expression "${qstr}"`);
    }

    let [, field, _operator, value] = matches;
    [field, value] = [field, value].map((_) => _.trim());

    const strRegex = /^"(.*)"$|^'(.*)'$/;
    const isString = strRegex.test(value);
    if (isString) {
      // assuming value is trimed
      const [, content] = value.match(strRegex)!;
      value = content;
    }

    const syntax = {
      field,
      query: {
        type: isString ? "string" : "literal",
        value: value,
      },
    };

    if (!isString && syntax.query.value == "") {
      throw Error(`invalid literal at "${qstr}"`);
    }

    // validation
    const partialQuotes = /^"(.*)|^'(.*)|(.*)"$|(.*)'$/;
    if (syntax.query.type == "literal" && partialQuotes.test(value)) {
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

    throw Error(`invalid expression "${syntax.field}"`);
  }

  private static whereHelper(
    node: ASTNode | null,
    listNodes: HtmlNode[],
  ): HtmlNode[] {
    if (!node) {
      throw Error("Parsing error, invalid query");
    }

    if (node.isLeaf()) {
      const nodeEval = HtmlParserQueryResult.evalResult(
        node.value!,
        listNodes,
      );
      return nodeEval;
    }
    const operator = node.value;
    const operator_func = HtmlParserQueryResult.OPERATOR_FUNC[operator!];
    if (!operator_func) {
      throw Error(`symbol "${operator}' is not an operator`);
    }
    // TODO: optimize
    // maybe tag known excluded subsets?
    const leftEval = HtmlParserQueryResult.whereHelper(node.left, listNodes);
    const rightEval = HtmlParserQueryResult.whereHelper(
      node.right,
      listNodes,
    );

    const resSet = operator_func(leftEval, rightEval);
    return Array.from(resSet);
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
    const astResult = parser.constructAbstractSyntaxTree(tokens);
    this.astResult = astResult;
    // ast_result.tree.print();

    this.result = whereHelper(astResult.tree, this.result);
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
    const func = new Map<
      FilterContent,
      (node: HtmlNode, n: number) => boolean
    >();

    func.set("**", (_x: HtmlNode, _: number) => true);
    func.set(
      "html",
      (x: HtmlNode, _: number) => HtmlParser.testMatch(x.asHtml()!, str),
    );
    func.set(
      "text",
      (x: HtmlNode, _index: number) => HtmlParser.testMatch(x.asText(), str),
    );
    func.set("value", (x: HtmlNode, _: number) => {
      const val = x.asValue();
      if (!val) {
        return false;
      }
      if (typeof val == "string") {
        return HtmlParser.testMatch(val, str);
      }
      // array
      return val.filter((x) => HtmlParser.testMatch(x, str)).length > 0;
    });
    return result.filter(func.get(type)!);
  }

  /**
   * Filter by comparing the attribute value with `str`
   * @param attrName
   * @param str
   * @returns
   */
  private static filterAttrResult(
    result: HtmlNode[],
    attrName: string,
    str: string,
  ) {
    return result.filter((x: HtmlNode, _: number) => {
      const value = x.attr(attrName);
      return value && HtmlParser.testMatch(value, str);
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
   * @param attrName
   * @param str
   * @returns
   */
  filterAttr(attrName: string, str: string) {
    this.result = HtmlParserQueryResult.filterAttrResult(
      this.result,
      attrName,
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
  map<T>(fun: MapFunc<HtmlNode, T>): T[] {
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

  toString() {
    return this.astResult?.tree.toString() ?? "";
  }
}

/**
 * Wrapper for AnyNode
 */
export class HtmlNode {
  constructor(
    private readonly api: CheerioAPI,
    private readonly representation: AnyNode,
  ) {
  }

  attr(attrName: string) {
    return this.api(this.representation).attr(attrName);
  }

  asAnyNode(): AnyNode {
    return this.representation;
  }

  asText() {
    return this.api(this.asAnyNode()).text();
  }

  asValue() {
    return this.api(this.asAnyNode()).val();
  }

  asHtml() {
    return this.api(this.asAnyNode()).html();
  }
}
