import { MXcli } from "./cli/MXcli";
import { config } from "./environment";
import { MXScraper } from "./core/MXScraper";
import { DynamicConfigurer } from "./cli/DynamicConfigurer";

const [, , ...argv] = process.argv;

(async () => {
  const engine = new MXScraper();
  const mxcli = new MXcli();
  try {
    // init engine
    const parsed = mxcli.parse(argv);

    // override environment.ts
    // if there aren't any config file, environment.ts will be used
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
  } finally {
    // if (!use_conf_session_id) {
    //     try {
    //         await engine.destructor ();
    //     } catch (err) {
    //         console.error ('Failed to release resources!')
    //         console.error (err.message || '');
    //         if (config.SHOW_CLI_ERROR_STACK)
    //             console.error (err);
    //     }
    // } /* else do not free any resources */
  }
})();
