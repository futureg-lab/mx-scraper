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

test('HtmlParserQueryResult.eval throws error correctly', () => {
    const parser = HtmlParser.use (html);
    // invalid (empty) literal 
    expect(() => { parser.select('input').eval('attr.value = ') })
        .toThrow();
    // invalid expression
    expect(() => { parser.select('input').eval('at tr.value = 1234') })
        .toThrow();
    // invalid expression
    expect(() => { parser.select('input').eval('foo = 1234') })
        .toThrow();
    // invalid "
    expect(() => { parser.select('input').eval('value = 1234"') })
        .toThrow();
});

test('HtmlParserQueryResult.where throws error correctly', () => {
    const parser = HtmlParser.use (html2);
    // invalid symbol
    expect(() => { parser.select('input').where ('text : %silly% --- html : %silly%') })
        .toThrow();
    // invalid expression
    expect(() => { parser.select('input').where ('at tr.value = 1234') })
        .toThrow();
});

test('Querying : "where" function behaves correctly', () => {
    const parser = HtmlParser.use (html2);

    expect(
        parser.select ('span')
            .where (`text : %silly% | html : %silly%`)
            .count()
    ).toBe (2);

    expect(
        parser.select ('span')
            .where (`text : %silly% & text : %bit% | attr.class : %urban%`)
            .count()
    ).toBe (3);
    
    expect(
        parser.select ('span')
            .where (`text : %silly% & (text : %bit% | attr.class : %urban%)`)
            .count()
    ).toBe (1);

    expect(
        parser.select ('span')
            .where (`attr.class : text text-primary`)
            .count()
    ).toBe (4);

    expect(
        parser.select ('a>img')
            .where (`attr.src : @reg /cat[0-1]+/`)
            .count()
    ).toBe (5);

    expect(
        parser.select ('a>img')
            .where (`attr.alt : %sleeping%   &  attr.src : @reg /cAt[0-1]+/i`)
            .count()
    ).toBe (1);


    expect(
        parser.select ('a')
            .where (`attr.href : %page%`)
            .count()
    ).toBe (3);
});


test('Querying : "where" function edgecases should resolve', () => {
    const parser = HtmlParser.use (html2);

    expect(
        parser.select ('span')
            .where (`
                text : %silly% & html : %silly% | html : %silly% 
                & html : %silly% & html : %silly% | html : %silly%
            `)
            .count()
    ).toBe (2);

    expect(
        parser.select ('img')
            .where (`(attr.src : %cat% | attr.src : %dog%) & attr.src : %.jpg`)
            .count()
    ).toBe (6);

    expect(
        parser.select ('img')
            .where (`attr.src : %dog% & attr.src : %.gif`)
            .count()
    ).toBe (0);

});