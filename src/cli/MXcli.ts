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
            "Plugin | Plugin-Auto-Detect | Show-Plugins | Show-Help | Search-Plugin"
        ]);
    }

    async runCommand (engine : MXScraper, parsed : Map<string, string[]>) {
        const verbose = parsed.has('Verbose');
        // show help / plugins
        if (parsed.has('Show-Help')) {
            this.commandPrintHelp (engine, verbose);
            return;
        }
        if (parsed.has('Show-Plugins')) {
            this.commandShowPlugins (engine, verbose);
            return;
        }
        if (parsed.has('Search-Plugin')) {
            const url = parsed.get('Search-Plugin')[0];
            const exact_match = parsed.has('Exact-Match');
            this.commandSearchPlugin (url, exact_match, engine, verbose);
            return;
        }

        // core
    }

    private commandShowPlugins (engine : MXScraper, verbose : boolean = false) {
        const plugins = engine.getAllPlugins();
        this.displayPluginList (plugins, verbose);
    }

    private commandSearchPlugin (url : string, exact_match : boolean, engine : MXScraper, verbose : boolean = false) {
        const plugins = engine.searchPluginFor (url, exact_match);
        this.displayPluginList (plugins, verbose);
    }

    private commandPrintHelp (engine : MXScraper, verbose : boolean = false) {
        let examples = [
            " mx-scraper --plugin plugin_name --fetch-all title1 title2 title3\n",
            " mx-scraper --auto --fetch http://link/to/a/title\n",
            " mx-scraper --show-plugins -v\n",
            " mx-scraper -h\n",
            " mx-scraper --search-plugin -v http://link/to/a/title"
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

    private displayPluginList (plugins : MXPlugin[], verbose : boolean = false) {
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
            + (infos == '' ? '\n0 plugins found' : infos)
        );
    }

    private headerString () {
        return 'MXScraper-CLI v1.0 - FutureG-lab\n';
    }
}