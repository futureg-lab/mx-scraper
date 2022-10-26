import { HtmlParser, HtmlParserQueryResult } from "../../utils/HtmlParser";

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


test('HtmlParser.testMatch behaves correctly', () => {
    expect(HtmlParser.testMatch('Hello World', '%World')).toBeTruthy();
    expect(HtmlParser.testMatch('Hello World', '%World%')).toBeTruthy();
    expect(HtmlParser.testMatch('Hello World', '@reg /wo(.+)/ig')).toBeTruthy();

    expect(HtmlParser.testMatch('Hello World', 'World%')).toBeFalsy();
    expect(HtmlParser.testMatch('Hello World', 'World')).toBeFalsy();
    expect(HtmlParser.testMatch('Hello World', 'world%')).toBeFalsy();
});

test('Querying : Filter expects 5 results', () => {
    const result = HtmlParser.use (html)
                    .select ('span');
    expect(result.all().length).toBe(5);
    expect(result.count()).toBe(5);
});

test('Querying : Filter with regex expects 1 result', () => {
    const parser = HtmlParser.use (html);
    const result = parser
                    .select ('input[class="foo"]')
                    .filter ('value', '@reg /[0-9]+/i');
    expect(result.count()).toBe(1);
    expect(result.first().asValue()).toBe('My pseudo is @JSX1234');
});

test('Querying : Filter with attribute expects 3 results', () => {
    const parser = HtmlParser.use (html);
    const result = parser
                    .select ('span')
                    .filterAttr ('class', '@reg   /(.+)primary/');
    expect(result.count()).toBe(3);
    expect(result.nth(2).asText()).toContain('Two');
});


test('HtmlParserQueryResult.eval behaves correctly', () => {
    const parser = HtmlParser.use (html);
    
    expect(parser.select('span').eval('attr.class = @reg /primary/').count())
        .toBe(3); // One, Two, Three

    expect(parser.select('span').eval('text = @reg /One|Two/i').count())
        .toBe(2); // ' One ', ' two '
    
    expect(parser.select('input').eval('attr.type = text').count())
        .toBe(2); // 'My name is John', 'My pseudo is @JSX1234'
    
    expect(parser.select('input').eval('attr.value = "%John%"').count())
        .toBe(1); // 'My name is John'

});