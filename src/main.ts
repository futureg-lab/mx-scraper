import { MXcli } from "./cli/mx_cli.ts";
import { config } from "./mx_configuration.ts";
import { MXScraper } from "./core/mx_scraper.ts";
import { DynamicConfigurer } from "./cli/dynamic_configurer.ts";

// --is_compiled_binary flag is provided once compiled
const argv = DynamicConfigurer.isDevMode() ? Deno.args : Deno.args.slice(1);

try {
  // init engine
  const engine = new MXScraper();
  const mxcli = new MXcli();
  const parsed = mxcli.parse(argv);

  // override mx_configuration.ts
  // if there is no config file, mx_configuration.ts will be used
  // to setup a new config
  DynamicConfigurer.forceOverrideConfig();

  if (!(parsed.has("Show-Help") || parsed.has("Show-Infos"))) {
    await engine.initAllPlugins();
  }

  // run the command
  await mxcli.runCommand(engine, parsed);
} catch (err) {
  const message = err.message || "";
  if (message.includes("ECONNREFUSED")) {
    console.error(
      "\nAn error has occurred, make sure your FlareSolverr instance is working properly.",
    );
  }
  console.error(err.message || "");
  if (config.SHOW_CLI_ERROR_STACK) {
    console.error(err);
  }
}
