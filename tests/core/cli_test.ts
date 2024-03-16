import { MXcli } from "../../src/cli/mx_cli.ts";
import { assertArrayIncludes } from "std/assert/assert_array_includes.ts";
import { assertEquals } from "std/assert/assert_equals.ts";

Deno.test("Fetch a single item", () => {
  const command = "--plugin plugin_name --fetch 177013";
  const mxcli = new MXcli();
  const parsed = mxcli.parse(command.split(" "));
  const keys = Array.from(parsed.keys());

  assertArrayIncludes(keys, ["Plugin"]);
  assertArrayIncludes(keys, ["FetchMeta"]);
  assertEquals(parsed.get("FetchMeta")?.length, 1);
});

Deno.test("Fetch an arbitrary number of items", () => {
  const command = "--plugin plugin_name --fetch-all 177013 410410 1234 159013";
  const mxcli = new MXcli();
  const parsed = mxcli.parse(command.split(" "));
  const keys = Array.from(parsed.keys());

  assertArrayIncludes(keys, ["Plugin"]);
  assertArrayIncludes(keys, ["FetchMeta-List"]);
  assertArrayIncludes(parsed.get("Plugin")!, ["plugin_name"]);
  assertEquals(parsed.get("FetchMeta-List")?.length, 4);

  assertArrayIncludes(parsed.get("FetchMeta-List")!, ["159013", "1234"]);
});

Deno.test("Use command aliases", () => {
  const commandA = "--auto --fetch http://some/link/to/a/title";
  const commandB = "-a -f http://some/link/to/a/title";

  const mxcli = new MXcli();
  const parsedA = mxcli.parse(commandA.split(" "));
  const parsedB = mxcli.parse(commandB.split(" "));

  assertEquals(parsedA.get("Plugin-Auto-Detect")?.length, 0);
  assertEquals(parsedB.get("Plugin-Auto-Detect")?.length, 0);
  assertEquals(parsedA.get("FetchMeta"), parsedB.get("FetchMeta"));
});
