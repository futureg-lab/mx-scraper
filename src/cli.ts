import { MXcli } from "./cli/MXcli";
import { config } from "./environment";
import { MXScraper } from "./MXScraper";

const [ , , ...argv] = process.argv;

(async () => {
    const engine = new MXScraper ();
    const mxcli = new MXcli();
    let use_conf_session_id = false;
    try {
        // init engine
        const parsed = mxcli.parse (argv);

        if (parsed.has('Use-Session') || parsed.has('Conf-Session')) {
            if (parsed.has('Use-Session')) // temporarily change the session id
                config.UNIQUE_SESSION = parsed.get('Use-Session')[0];
            console.info ('**** Using sessionid ' + config.UNIQUE_SESSION + ' ****');
            use_conf_session_id = true;
        }

        if (!parsed.has('Show-Help'))
            await engine.initFromPluginFolder (use_conf_session_id);

        // run the command
        await mxcli.runCommand (engine, parsed);
    } catch (err) {
        const message = err.message || '';
        if (message.includes('ECONNREFUSED'))
            console.error ('An error has occurred, make sure your CloudfareSolverr instance is working properly.');
        console.error (err.message || '');
    } finally {
        if (!use_conf_session_id) {
            try {
                await engine.destructor ();
            } catch (err) {
                console.error ('Failed to release resources!')
                console.error (err.message || '');
            }
        } /* else do not free any resources */
    }
}) ();
