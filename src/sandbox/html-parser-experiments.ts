import { HtmlParser } from "../utils/HtmlParser";

const html = `
    <div>
        <div class="section">
            <span class="text text-primary" id="s1"> One </span>
            <span class="text text-primary" id="s2"> Three </span>
            <span class="text text-primary" id="s3"> two </span>
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
            </div>
        </div>
    </div>
`;


// const parser = HtmlParser.use (html);
// parser.select ('span', 'text');

const filter = '(1 & (2 | 3)) | (4 & 5 | 6)';
const tokens = HtmlParser.tokenizeFilterQuery (filter);
console.log (filter);
console.log (tokens);

HtmlParser.constructAbstractSyntaxTree (tokens).print();