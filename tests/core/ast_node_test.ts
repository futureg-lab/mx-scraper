import { assertEquals } from "std/assert/assert_equals.ts";
import {
  ASTNode,
  CustomAST,
  PPriority,
  PSymbol,
} from "../../src/utils/custom_ast.ts";
import { assertSnapshot } from "std/testing/snapshot.ts";

const priority: PPriority = {
  "+": { value: 1, associative: "left" },
  "-": { value: 1, associative: "left" },
  "*": { value: 2, associative: "left" },
  "/": { value: 2, associative: "left" },
  "^": { value: 3, associative: "right" },
};
const symbols: PSymbol[] = ["(", ")", ...Object.keys(priority)];

Deno.test("Postfix representation should match", () => {
  const tokens = "3 + 4 * 2  / (1 - 5) ^ 2 ^ 3"
    .replace(/[ ]+/g, "")
    .split("");
  const cparser = new CustomAST(symbols, priority);
  const { postfix } = cparser.constructAbstractSyntaxTree(tokens);

  assertEquals(postfix, "342*15-23^^/+");
});

Deno.test("Abstract Syntax Trees should be the same", () => {
  const cparser = new CustomAST(symbols, priority);
  const tkA = "x+h+y*z/q".split("");
  const tkB = "x+h+(y*z)/q".split("");
  const resultA = cparser.constructAbstractSyntaxTree(tkA);
  const resultB = cparser.constructAbstractSyntaxTree(tkB);

  assertEquals(resultA.tree.toString(), resultB.tree.toString());
});

Deno.test("Abstract Syntax Trees should evaluate to the same string", async (t) => {
  const __ = (x: string) => parseFloat(x);
  const OP = {
    "+": (a: string, b: string) => __(a) + __(b),
    "-": (a: string, b: string) => __(a) - __(b),
    "*": (a: string, b: string) => __(a) * __(b),
    "/": (a: string, b: string) => __(a) / __(b),
    "^": (a: string, b: string) => __(a) ** __(b),
  };

  const evalSignature = (node: ASTNode): string => {
    if (node.isLeaf()) {
      return node.value;
    }
    return (OP as any)[node.value!](
      evalSignature(node.left!),
      evalSignature(node.right!),
    );
  };

  const cparser = new CustomAST(symbols, priority);
  const tkA = "1+(2*7)/2+(4*2)-1-3+5/2+4-2^3^(2/4)+1-1+3-4".split("");
  const tkB = "1+2*(7/2)+4*2-(1+3)+5/2+4-2^3^(2/4)+1+3-(1+4)".split("");
  const resultA = cparser.constructAbstractSyntaxTree(tkA);
  const resultB = cparser.constructAbstractSyntaxTree(tkB);

  assertEquals(evalSignature(resultA.tree), evalSignature(resultB.tree));
  await assertSnapshot(t, resultA.tree.toString());
});
