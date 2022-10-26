import { CustomAST, PPriority, PSymbol } from "../../utils/CustomAST";

const priority : PPriority = {
    '+' : {value : 1, associative : 'left'},
    '-' : {value : 1, associative : 'left'},
    '*' : {value : 2, associative : 'left'},
    '/' : {value : 2, associative : 'left'},
    '^' : {value : 3, associative : 'right'}
};
const symbols : PSymbol[] = ['(', ')', ...Object.keys (priority)];


test('Postfix representation should match', () => {
    const tokens = '3 + 4 * 2  / (1 - 5) ^ 2 ^ 3'
                    .replace(/[ ]+/g, '')
                    .split('');
    const cparser = new CustomAST (symbols, priority);
    const {postfix} = cparser.constructAbstractSyntaxTree (tokens);
    expect(postfix).toBe('342*15-23^^/+');
});

test('Abstract Syntax Tree should be the same', () => {
    const cparser = new CustomAST (symbols, priority);
    const tk_a = 'x+h+y*z/q'.split('');
    const tk_b = 'x+h+(y*z)/q'.split('');
    const result_a = cparser.constructAbstractSyntaxTree (tk_a);
    const result_b = cparser.constructAbstractSyntaxTree (tk_b);
    expect(result_a.tree.toString())
        .toBe(result_b.tree.toString());
});