import { CustomAST, PPriority, PSymbol } from "../utils/CustomAST";
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

// const filter = '(1 & (2 | 3)) | (4 & 5 | 6)';
// const tokens = HtmlParser.tokenizeFilterQuery (filter);
// console.log (filter);
// console.log (tokens);
// CustomParser.convertToInfix ('tokens').print();

// CustomParser.convertToInfix (tokens, HtmlParser.SYMBOLS, HtmlParser.SYM_PRIORITY);

const priority : PPriority = {
    '+' : {value : 1, associative : 'left'},
    '-' : {value : 1, associative : 'left'},
    '*' : {value : 2, associative : 'left'},
    '/' : {value : 2, associative : 'left'},
    '^' : {value : 3, associative : 'right'}
};

const symbols : PSymbol[] = ['(', ')', ...Object.keys (priority)];
const tks = ' 3 + 4 * 2  / (1 - 5) ^ 2 ^ 3'.replace(/[ ]+/g, '').split('');
console.log(tks.join(' '));

const cparser = new CustomAST (symbols, priority);
const {postfix, tree} = cparser.constructAbstractSyntaxTree (tks);
console.log ('Postfix : ', postfix);
console.log ('Tree\n', tree.toString());