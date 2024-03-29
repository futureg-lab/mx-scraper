import { assert } from "std/assert/assert.ts";
import { HtmlParser } from "../../src/utils/html_parser.ts";
import { assertFalse } from "std/assert/assert_false.ts";
import { assertEquals } from "std/assert/assert_equals.ts";
import { assertStringIncludes, assertThrows } from "std/assert/mod.ts";
import { assertSnapshot } from "std/testing/snapshot.ts";

const html = `
    <div>
        <div class="section">
            <span class="text text-primary" id="s1"> One </span>
            <span class="text text-primary" id="s2"> Two </span>
            <span class="text text-primary" id="s3"> Three </span>
        </div>
        <div class="section">
            <span id="s4"> 123 </span>
            <span id="s5"> 456 </span>
        </div>
        <div class="section">
            <div>
                <img src="cat.jpg">
            </div>
            <div>
                <a href="some/link"><b>Hello</b></a>
                <input type="text" class="bar" value="My name is John"/>
                <input type="text" class="foo" value="My pseudo is @JSX1234"/>
            </div>
            <div>
                <select id="gender">
                    <option value="0">Male</option>
                    <option value="1">Female</option>
                    <option value="2">---</option>
                </select>
            </div>
        </div>
    </div>
`;

const html2 = `
    <div>
        <span class="text text-primary" id="s1"> Some text </span>
        <span class="text text-primary" id="s2"> Another text </span>
        <span class="text text-primary" id="s3"> This is a bit silly </span>
        <span class="text text-primary" id="s4"> is it silly ? </span>
        <span class="urban text-danger"> based </span>
        <span class="urban text-danger" id="s3"> fr fr </span>
        <span class="weeb text-danger" id="s3"> ah yes. okaimono girl </span>
    </div>
    <div>
        <a href="http://some/link/page1"><img src="cat01.jpg"/></a>
        <a href="http://some/link/page2"><img src="cat02.jpg"/></a>
        <a href="http://some/link/page3"><img src="cat03.jpg"/></a>
        <a href="http://some/link/home"><img src="cat04.jpg"/></a>
        <a href="http://some/link/nekopunch"><img src="catpunch.gif"/></a>
        <a href="http://some/link/sleep"><img src="cat05.jpg" alt="a cat sleeping"/></a>
        <a href="http://some/link/doge"><img src="catdoge.jpg"/></a>
    </div>
`;

Deno.test('Querying: "where" parses the query correctly', async (t) => {
  const repr = HtmlParser.use(html)
    .select("foo")
    .where(`
      text: A & (html: B | attr.class: .C) & html: D% & attr.id: %E% | html: @reg /A/i
    `)
    .toString();
  await assertSnapshot(t, repr);
});

Deno.test("HtmlParser.testMatch behaves correctly", () => {
  assert(HtmlParser.testMatch("Hello World", "%World"));
  assert(HtmlParser.testMatch("Hello World", "%World%"));
  assert(HtmlParser.testMatch("Hello World", "@reg /wo(.+)/ig"));

  assertFalse(HtmlParser.testMatch("Hello World", "World%"));
  assertFalse(HtmlParser.testMatch("Hello World", "World"));
  assertFalse(HtmlParser.testMatch("Hello World", "world%"));
});

Deno.test("Querying: Filter expects 5 results", () => {
  const result = HtmlParser.use(html)
    .select("span");
  assertEquals(result.all().length, 5);
  assertEquals(result.count(), 5);
});

Deno.test("Querying: Filter with regex expects 1 result", () => {
  const parser = HtmlParser.use(html);
  const result = parser
    .select('input[class="foo"]')
    .filter("value", "@reg /[0-9]+/i");
  assertEquals(result.count(), 1);
  assertEquals(result.first()?.asValue(), "My pseudo is @JSX1234");
});

Deno.test("Querying: Filter with attribute expects 3 results", () => {
  const parser = HtmlParser.use(html);
  const result = parser
    .select("span")
    .filterAttr("class", "@reg   /(.+)primary/");
  assertEquals(result.count(), 3);
  assertStringIncludes(result.nth(2)?.asText() ?? "", "Two");
});

Deno.test("HtmlParserQueryResult.eval behaves correctly", () => {
  const parser = HtmlParser.use(html);

  assertEquals(
    parser.select("span").eval("attr.class = @reg /primary/").count(),
    3,
  ); // One, Two, Three

  assertEquals(
    parser.select("span").eval("text = @reg /One|Two/i").count(),
    2,
  ); // ' One ', ' two '

  assertEquals(
    parser.select("input").eval("attr.type = text").count(),
    2,
  ); // 'My name is John', 'My pseudo is @JSX1234'

  assertEquals(
    parser.select("input").eval('attr.value = "%John%"').count(),
    1,
  ); // 'My name is John'
});

Deno.test("HtmlParserQueryResult.eval throws error correctly", () => {
  const parser = HtmlParser.use(html);
  // invalid (empty) literal
  assertThrows(() => {
    parser.select("input").eval("attr.value = ");
  });

  // invalid expression
  assertThrows(() => {
    parser.select("input").eval("at tr.value = 1234");
  });

  // invalid expression
  assertThrows(() => {
    parser.select("input").eval("foo = 1234");
  });

  // invalid "
  assertThrows(() => {
    parser.select("input").eval('value = 1234"');
  });
});

Deno.test("HtmlParserQueryResult.where throws error correctly", () => {
  const parser = HtmlParser.use(html2);
  // invalid symbol
  assertThrows(() => {
    parser.select("input").where("text : %silly% --- html : %silly%");
  });

  // invalid expression
  assertThrows(() => {
    parser.select("input").where("at tr.value = 1234");
  });
});

Deno.test('Querying: "where" function behaves correctly', () => {
  const parser = HtmlParser.use(html2);

  assertEquals(
    parser.select("span")
      .where(`text : %silly% | html : %silly%`)
      .count(),
    2,
  );

  assertEquals(
    parser.select("span")
      .where(`text : %silly% & text : %bit% | attr.class : %urban%`)
      .count(),
    3,
  );

  assertEquals(
    parser.select("span")
      .where(`text : %silly% & (text : %bit% | attr.class : %urban%)`)
      .count(),
    1,
  );

  assertEquals(
    parser.select("span")
      .where(`attr.class : text text-primary`)
      .count(),
    4,
  );

  assertEquals(
    parser.select("a>img")
      .where(`attr.src : @reg /cat[0-1]+/`)
      .count(),
    5,
  );

  assertEquals(
    parser.select("a>img")
      .where(`attr.alt : %sleeping%   &  attr.src : @reg /cAt[0-1]+/i`)
      .count(),
    1,
  );

  assertEquals(
    parser.select("a")
      .where(`attr.href : %page%`)
      .count(),
    3,
  );
});

Deno.test('Querying: "where" function edgecases should resolve', () => {
  const parser = HtmlParser.use(html2);

  assertEquals(
    parser.select("span")
      .where(`
                text : %silly% & html : %silly% | html : %silly% 
                & html : %silly% & html : %silly% | html : %silly%
            `)
      .count(),
    2,
  );

  assertEquals(
    parser.select("img")
      .where(`(attr.src : %cat% | attr.src : %dog%) & attr.src : %.jpg`)
      .count(),
    6,
  );

  assertEquals(
    parser.select("img")
      .where(`attr.src : %dog% & attr.src : %.gif`)
      .count(),
    0,
  );
});
