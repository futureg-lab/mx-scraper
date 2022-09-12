import { MXPlugin } from "../interfaces/MXPlugin";
import { MXScraper } from "../MXScraper";
import { CLICommand, CLIEngine } from "./CLIEngine";
import { COMMAND_DEF } from "./MXCommand";

export class MXcli extends CLIEngine {

    constructor () {
        // register commands
        super (COMMAND_DEF);
        // at least a plugin specification or info + a metafetch specification
        this.defineRequiredArgs ([
            "Plugin | Plugin-Auto-Detect | Show-Plugins | Show-Help"
        ]);
    }


    async runCommand (engine : MXScraper, parsed : Map<string, string[]>) {
        // show help / plugins
        if (parsed.has('Show-Help')) {
            this.commandPrintHelp (engine, parsed.has('Verbose'));
            return;
        }
        if (parsed.has('Show-Plugins')) {
            this.commandShowPlugins (engine, parsed.has('Verbose'));
            return;
        }

        // core
    }


    private commandShowPlugins (engine : MXScraper, verbose : boolean = false) {
        const plugins = engine.getAllPlugins();

        let infos = '';
        for (let {title, version, target_url, author} of plugins) {
            infos +=
                '\t* '
                + title 
                + ' version ' + version
                + '\n'
                + (verbose ? `\t\tauthor: ${author}\n\t\tTarget url: ${target_url}\n` : '')
        }

        console.log(
            this.headerString ()
            + 'Plugin list :\n'
            + infos
        );
    }

    private commandPrintHelp (engine : MXScraper, verbose : boolean = false) {
        let examples = [
            " mx-scraper --plugin plugin_name --fetch-all manga1 manga2 manga3\n",
            " mx-scraper --auto --fetch http://some/link/to/a/title\n",
            " mx-scraper --show-plugins -v\n",
            " mx-scraper -h\n",
        ];
        let commands_instr = [];
        const keys = Array.from (this.commands.keys());
        for (let key of keys) {
            const command = this.commands.get(key);
            let verb_text = '';
            if (verbose) {
                const if_has_arg = command.arg_count !== Infinity ? 
                    command.arg_count + ' VAL' : 'a LIST';
                verb_text = '\t\tExpect ' 
                    + (!command.arg_count ? 'NONE' : if_has_arg)
                    + '\n'
            }
            commands_instr.push (
                '  ' + command.name + ' : '
                + command.aliases.join(' | ')
                + '  ' + command.description
                + '\n'
                + verb_text
            );
        }

        console.info (
            this.headerString ()
            + '\n* Examples : \n' + examples.join('')
            + '\n* Commands : \n'
            + commands_instr.join('')
        );
    }

    private headerString () {
        return 'MXScraper-CLI v1.0 - FutureG-lab\n';
    }
}