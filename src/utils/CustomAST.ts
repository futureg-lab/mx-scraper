import { topValueOf } from "./Utils.ts";

export enum EParenthesis {
  OPEN = "(",
  CLOSED = ")",
}
export type PAssociative = "left" | "right";
export type PPrecedence = { value: number; associative: PAssociative };
export type ASTResult = { postfix: string; tree: ASTNode };
export type PPriority = { [key: string]: PPrecedence };
export type PSymbol = string;

export class ASTNode {
  parent: ASTNode | null = null;
  left: ASTNode | null = null;
  right: ASTNode | null = null;
  value: string | null = null;

  constructor(value: string, left: ASTNode | null = null, right: ASTNode | null = null) {
    this.value = value;
    this.left = left;
    this.right = right;
  }

  private indentHelper(depth: number) {
    return new Array(depth).fill("  ").join("");
  }

  private printHelper(node: ASTNode, depth: number) {
    if (node == null) {
      return "";
    }
    const left_str = this.printHelper(node?.left!, depth + 1);
    const right_str = this.printHelper(node?.right!, depth + 1);
    let final_str = "---- '" + node.value + "'";
    if (left_str != "") {
      final_str += "\n" + this.indentHelper(depth + 1) + "|" + left_str;
    }
    if (right_str != "") {
      final_str += "\n" + this.indentHelper(depth + 1) + "|" + right_str;
    }
    return final_str;
  }

  isLeaf() {
    return this.left == null && this.right == null;
  }

  toString() {
    return this.printHelper(this, 0);
  }

  print() {
    console.log(this.toString());
  }
}

export class CustomAST {
  private symbols: PSymbol[];
  private priority: PPriority;

  private parenthesis: string[] = [EParenthesis.OPEN, EParenthesis.CLOSED];

  constructor(symbols: PSymbol[], priority: PPriority) {
    this.symbols = symbols;
    this.priority = priority;
  }

  private isParenthesis(token: string) {
    return this.parenthesis.includes(token);
  }

  /**
   * Build postfix and tree
   * @param tokens
   * @returns
   */
  constructAbstractSyntaxTree(tokens: string[]): ASTResult {
    const operators: string[] = [];
    const ast_nodes: ASTNode[] = [];
    let expressions = "";
    let running_expr = "";

    const nearSubstr = (str: string) =>
      str.substring(str.length - 10, str.length);
    const popPopPushNode = (top: string) => {
      const right = ast_nodes.pop();
      const left = ast_nodes.pop();
      const node = new ASTNode(top, left, right);
      ast_nodes.push(node);
    };

    for (const token of tokens) {
      running_expr += token;
      if (this.symbols.includes(token)) {
        if (token == EParenthesis.OPEN) {
          operators.push(token);
        } else if (token == EParenthesis.CLOSED) {
          let stop = false;
          while (!stop) {
            const top = operators.pop();
            if (!top) {
              throw Error(
                "invalid expression near .." + nearSubstr(running_expr),
              );
            }
            if (top == EParenthesis.OPEN) {
              stop = true;
            } else {
              expressions += top;
              // AST
              popPopPushNode(top);
            }
          }
        } else {
          const top_operator = topValueOf<string>(operators);
          if (top_operator != null && !this.isParenthesis(top_operator)) {
            // no need to compare the current token with ( or )
            const prec_token: PPrecedence = this.priority[token];
            const prec_poperator: PPrecedence = this.priority[top_operator];
            const should_pop = prec_token.value < prec_poperator.value ||
              (prec_token.value == prec_poperator.value &&
                prec_poperator.associative == "left");

            if (should_pop) {
              const top = operators.pop()!;
              expressions += top;
              // AST
              popPopPushNode(top);
            }
          }
          operators.push(token);
        }
      } else {
        expressions += token;
        ast_nodes.push(new ASTNode(token, null, null));
      }
    }

    if (operators.includes("(") || operators.includes(")")) {
      throw Error("parenthesis invalid");
    }

    // remainder
    while (operators.length > 0) {
      const top = operators.pop()!;
      expressions += top;
      popPopPushNode(top);
    }

    if (ast_nodes.length != 1) {
      throw Error("ASTNode reduction failed");
    }

    return <ASTResult> {
      postfix: expressions,
      tree: ast_nodes[0],
    };
  }
}
