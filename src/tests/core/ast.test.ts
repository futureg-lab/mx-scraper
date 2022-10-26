import { CustomAST, PPriority, PSymbol } from "../../utils/CustomAST";

const priority : PPriority = {
    '+' : {value : 1, associative : 'left'},
    '-' : {value : 1, associative : 'left'},
    '*' : {value : 2, associative : 'left'},
    '/' : {value : 2, associative : 'left'},
    '^' : {value : 3, associative : 'right'}
};
const symbols : PSymbol[] = ['(', ')', ...Object.keys (priority)];
const tokens = '3 + 4 * 2  / (1 - 5) ^ 2 ^ 3'
    .replace(/[ ]+/g, '')
    .split('');

test('Postfix notation should match', () => {
    const cparser = new CustomAST (symbols, priority);
    const {postfix} = cparser.constructAbstractSyntaxTree (tokens);
    expect(postfix).toBe('342*15-23^^/+');
});


// TODO
// Check if ASTNode is valid