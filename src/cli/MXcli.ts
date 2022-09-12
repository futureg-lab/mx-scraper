import { MXScraper } from "../MXScraper";
import { CLICommand, CLIEngine } from "./CLIEngine";
import { COMMAND_DEF } from "./MXCommand";

export class MXcli extends CLIEngine {
    engine : MXScraper;
    constructor () {
        // register commands
        super (COMMAND_DEF);
        // at least a plugin specification or info + a metafetch specification
        this.defineRequiredArgs ([
            "Plugin | Plugin-Auto-Detect | Show-Plugins | Show-Help",
            "FetchMeta | FetchMeta-List"
        ]);

        this.engine = new MXScraper();
    }

    /**
     * @param argv command line arguments
     */
    runCommand (argv : string[]) {
        const parsed = this.parse (argv);
        // show help
        if (parsed.has('Show-Help')) {
            this.printHelp (parsed.has('Verbose'));
            return;
        }
    }


    private printHelp (verbose : boolean = false) {
        let examples = [
            "mx-scraper --plugin plugin_name --fetch-all manga1 manga2 manga3",
            "mx-scraper --auto --fetch http://some/link/to/a/title",
            "mx-scraper --show-plugins -v",
            "mx-scraper -h",
        ];
        let commands_instr = [];
        const keys = Array.from (this.commands.keys());
        for (let key of keys) {
            const command = this.commands.get(key);
            let verb_text = '';
            if (verbose) {
                verb_text = 'Expect ' 
                    + (command.arg_count !== Infinity ? command.arg_count + ' VAL' : 'A LIST');
            }
            commands_instr.push (
                command.name + ' : '
                + command.aliases.join(' | ')
                + verb_text
                + '\t' + command.description
            );
        }

        console.info (
            'MXScraper-CLI'    
        );
    }
}