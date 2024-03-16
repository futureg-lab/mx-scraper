import { topValueOf } from "./utils.ts";

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
  value: string;

  constructor(
    value: string,
    left: ASTNode | null = null,
    right: ASTNode | null = null,
  ) {
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
    const leftStr = this.printHelper(node?.left!, depth + 1);
    const rightStr = this.printHelper(node?.right!, depth + 1);
    let finalStr = "---- '" + node.value + "'";
    if (leftStr != "") {
      finalStr += "\n" + this.indentHelper(depth + 1) + "|" + leftStr;
    }
    if (rightStr != "") {
      finalStr += "\n" + this.indentHelper(depth + 1) + "|" + rightStr;
    }
    return finalStr;
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

  constructAbstractSyntaxTree(tokens: string[]): ASTResult {
    const operators: string[] = [];
    const astNodes: ASTNode[] = [];
    let expressions = "";
    let runningExpr = "";

    const nearSubstr = (str: string) =>
      str.substring(str.length - 10, str.length);
    const popPopPushNode = (top: string) => {
      const right = astNodes.pop();
      const left = astNodes.pop();
      const node = new ASTNode(top, left, right);
      astNodes.push(node);
    };

    for (const token of tokens) {
      runningExpr += token;
      if (this.symbols.includes(token)) {
        if (token == EParenthesis.OPEN) {
          operators.push(token);
        } else if (token == EParenthesis.CLOSED) {
          let stop = false;
          while (!stop) {
            const top = operators.pop();
            if (!top) {
              throw Error(
                "invalid expression near .." + nearSubstr(runningExpr),
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
          const topOperator = topValueOf<string>(operators);
          if (topOperator != null && !this.isParenthesis(topOperator)) {
            // no need to compare the current token with ( or )
            const precToken: PPrecedence = this.priority[token];
            const precPoperator: PPrecedence = this.priority[topOperator];
            const shouldPop = precToken.value < precPoperator.value ||
              (precToken.value == precPoperator.value &&
                precPoperator.associative == "left");

            if (shouldPop) {
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
        astNodes.push(new ASTNode(token, null, null));
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

    if (astNodes.length != 1) {
      throw Error("ASTNode reduction failed");
    }

    return <ASTResult> {
      postfix: expressions,
      tree: astNodes[0],
    };
  }
}
