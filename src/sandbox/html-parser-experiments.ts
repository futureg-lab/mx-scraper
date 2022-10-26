import { HtmlNode, HtmlParser, HtmlParserQueryResult } from "../utils/HtmlParser";

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


const parser = HtmlParser.use (html);
// const res = parser
//                 .select ('input[class="foo"]')
//                 .filter ('value', '@reg /[0-9]+/i');
// console.log('Item count', res.count(), res.first().asValue());

// const res2 = parser.select ('#gender');
// console.log('Item count', res2.count(), res2.all().map(x => x.asValue()));
    // .where ('(1 & ('2 | 3)) | (4 & 5 | 6)');

// console.log(parser.select('span').eval('@attr.class = @reg /primary/').map((_, i) => _.asText()));
// console.log(parser.select('input').eval('@attr.type = text').all().map(_ => _.asValue()));
// console.log(parser.select('input').eval('@value = "%John%"').all().map(_ => _.asValue()));
// console.log(parser.select('span').eval('@text = @reg /One|Two/i').all().map(_ => _.asText()));