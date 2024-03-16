import { MXPlugin } from "../../src/core/mx_plugin.ts";
import Example from "../../src/plugins/examples/example.ts";
import { MXScraper } from "../../src/core/mx_scraper.ts";
import {
  assertGreaterOrEqual,
  assertStringIncludes,
  fail,
} from "std/assert/mod.ts";

import { assertSnapshot } from "std/testing/snapshot.ts";

Deno.test("MXScraper should have more than 1 plugin", async () => {
  const engine = new MXScraper();
  await engine.initAllPlugins();
  const plugins = engine.getAllPlugins();
  console.info(
    "Loaded plugins:",
    plugins
      .map((plugin: MXPlugin) => plugin.constructor.name)
      .join(", "),
  );
  assertGreaterOrEqual(plugins.length, 1);
});

Deno.test("Registering duplicate ids should fail", async () => {
  let engine: MXScraper | undefined;
  try {
    engine = new MXScraper();
    await engine.initAllPlugins();
    engine.register((new Example()) as unknown as MXPlugin);
    fail("Duplicate plugin did not fail");
  } catch (err) {
    assertStringIncludes(
      err.message,
      `plugin id "Example" cannot be registered twice`,
    );
  } finally {
    await engine?.destructor();
  }
});

Deno.test("Example plugin should return a book", async (t) => {
  let engine: MXScraper | undefined;
  try {
    engine = new MXScraper();
    await engine.initAllPlugins();

    const plugins = engine.searchPluginFor("https://example.com");
    assertGreaterOrEqual(plugins.length, 1);

    const example = plugins.pop()!;
    const noCache = true;
    const book = await example.getBook("test", noCache);

    await assertSnapshot(t, book);
  } finally {
    await engine?.destructor();
  }
});
