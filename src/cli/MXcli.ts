import { MXPlugin } from "../core/MXPlugin";
import { MXScraper } from "../core/MXScraper";
import { downloadBook, DownloadOption, DownloadProgressCallback } from "../utils/Downloader";
import { batchAListOf, readListFromFile, resumeBook } from "../utils/Utils";
import { CLIEngine } from "./CLIEngine";
import { COMMAND_DEF } from "./MXCommand";
import * as cliProgress from 'cli-progress';
import { Book } from "../core/BookDef";
import { MXLogger } from "./MXLogger";
import { config } from "../environment";
import { DynamicConfigurer } from "./DynamicConfigurer";

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

        if (parsed.has('Error-Stack')) {
            DynamicConfigurer.overrideField ('SHOW_CLI_ERROR_STACK', true);
        }

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

        // fetch metadatas
        if (parsed.has('Plugin') || parsed.has('Plugin-Auto-Detect')) {
            let used_count = 0;
            let input_entries : string[] = [];
            const list_expected = ['FetchMeta', 'FetchMeta-List', 'FetchMeta-List-From-File'];
            for (let fetch_method of list_expected) {
                if (parsed.has(fetch_method)) {
                    used_count++;
                    input_entries = parsed.get (fetch_method);
                }
            }

            if (used_count == 0)
                throw Error ('Fetch command expected.');

            if (used_count > 1)
                throw Error ('Only one Fetch command can be used at a time');

            // titles ok
            // FetchMeta is guaranteed to have one item only
            // FetchMeta-List is guaranteed to have at least one item
            let titles = input_entries;
            if (parsed.has('FetchMeta-List-From-File')) {
                const file_path = input_entries[0];
                // read file instead
                titles = readListFromFile (file_path);
                MXLogger.info ('\n\n[File] Fetching ' + titles.join(', ') + '\n');
            }

            let plugin : MXPlugin = null;
            if (parsed.has('Plugin')) {
                const plugin_name = parsed.get('Plugin')[0];
                plugin = engine.getPluginByIdentifier (plugin_name);
                if (plugin == null)
                    throw Error ('Plugin named "' + plugin_name + '" is not present');
            } else {
                let result = engine.searchPluginFor (titles[0], parsed.has('Exact-Match'));
                if (result.length > 0)
                    plugin = result[0];
                else
                    throw Error ('Unable to find a plugin to handle ' + titles[0]);
                MXLogger.infoRefresh ('[Using] ' + plugin.title);
            }

            let doption : DownloadOption = null;
            if (parsed.has('Download'))
                doption = { 
                    continue : !parsed.has ('Restart-Download'),
                    parallel : parsed.has ('Parallel-Download') && (
                        parsed.has ('FetchMeta-List') || parsed.has ('FetchMeta-List-From-File')
                    ),
                    meta_only : parsed.has ('Meta-Only')
                };
            const verbose = parsed.has('Verbose');
            await this.commandFetchMetaDatasOrDownload (plugin, titles, doption, verbose);
            return;
        }
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
            'mx-scraper --help --verbos',
            'mx-scraper -h -v',
            'mx-scraper --show-plugins -v',
            'mx-scraper --show-plugins -v -cs',
            'mx-scraper --search-plugin -v http://link/to/a/title',
            'mx-scraper --auto --fetch http://link/to/a/title',
            'mx-scraper --plugin plugin_name --fetch-all title1 title2 title3',
            'mx-scraper --plugin plugin_name --fetch-all 420166 420132 --download --conf-session',
            'mx-scraper --plugin nhentai --download --fetch-all 420166 420132',
            'mx-scraper --auto --fetch-all --download --parallel http://link/to/title1 http://link/to/title2',
            'mx-scraper --auto --download --parallel --fetch-file list.txt',
            'mx-scraper --auto --download --parallel --fetch-file list.txt --meta-only',
            'mx-scraper -a -d -pa -ff list.txt -mo',
            'mx-scraper -a -d -pa -ff list.txt'
        ];
        
        let commands_instr = [];
        const keys = Array.from (this.commands.keys());
        for (let key of keys) {
            const command = this.commands.get(key);
            let verb_text = '';
            if (verbose) {
                const if_has_arg = command.arg_count !== Infinity ? 
                    command.arg_count + ' VAL' : 'a LIST';
                verb_text = '\t- Arguments : ' 
                    + (!command.arg_count ? 'NONE' : if_has_arg)
                    + '\n';
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
            + '\n# Examples : \n' + examples.map(example => ' ' + example + '\n').join('')
            + '\n# Commands : \n'
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

    private async commandFetchMetaDatasOrDownload (
        plugin : MXPlugin, 
        titles : string[], 
        download_option : DownloadOption = null,
        verbose : boolean
    ) {
        if (download_option && download_option.parallel) {
            const batches = batchAListOf<string> (titles, config.MAX_SIZE_BATCH);
            let count = 1;
            for (let batch of batches) {
                MXLogger.info ('\n # Batch ' + (count++) + '/' + batches.length);
                await this.parallelFetchAllThenDownload (plugin, batch, download_option);
            }
        } else
            await this.sequentialFetchAll (plugin, titles, download_option, verbose);
    }

    private async sequentialFetchAll (
        plugin : MXPlugin, 
        titles : string[], 
        download_option : DownloadOption = null,
        verbose : boolean
    ) {
        let book_index = 1;
        for (let title of titles) {
            try {
                const book = await plugin.fetchBook (title);
                console.log (resumeBook (book, verbose));
                if (download_option) {
                    const progress = new cliProgress.SingleBar({
                        format : '[{bar}] {percentage}% | ETA: {eta}s {value}/{total} | {msg}'
                    }, cliProgress.Presets.shades_classic);

                    let started = true;
                    const callback : DownloadProgressCallback = (msg, curr, total, p) => {
                        const payload = { msg : msg };
                        if (started) {
                            progress.start (total, curr, payload);
                            started = false;
                        } else
                            progress.update (curr, payload);
                    };
                    await downloadBook (book, download_option, callback);
                    if (!started)
                        progress.stop ();
                    console.log ();
                }
            } catch (err) {
                console.error ('\nFailed to fetch "' + title + '"');
                console.error (err.message);
            }
        }
    }

    private async parallelFetchAllThenDownload (
        plugin : MXPlugin, 
        titles : string[], 
        download_option : DownloadOption = null
    ) {
        const books : Book[] = [];
        
        const multibar = new cliProgress.MultiBar({
            clearOnComplete: false,
            hideCursor: true,
            format: ' {bar} | {sourceid} {msg} | {value}/{total}',
        }, cliProgress.Presets.shades_grey);

        try {
            // Fetch metadatas first
            console.log (' Fetching book metadata.. ');            
            for (let title of titles) {
                const book = await plugin.fetchBook (title);
                books.push (book);
            }
            console.log('\n Downloading all..');

            // download concurrently
            const processes : Promise<void>[] = [];
            for (let book of books) {
                let sub_progress : cliProgress.SingleBar = null;
                const callback : DownloadProgressCallback = (msg, curr, total, _) => {
                    const payload = { sourceid : book.source_id, msg : msg };
                    if (sub_progress == null) {
                        sub_progress = multibar.create (total, curr, payload);
                    } else
                        sub_progress.update (curr, payload);
                };
                processes.push (downloadBook (book, download_option, callback));
            }

            // allSettled : handle resolved / failed promises
            // in this particular setup, the processes do not depend to each other
            const resolved : PromiseSettledResult<void>[] = await Promise.allSettled (processes);
            const failed_downloads = resolved
                                    .filter (solution => solution.status == 'rejected')
                                    .map ((_, index) => books[index].source_id);
            
            if (failed_downloads.length > 0)
                throw Error ('Failed to download ' + failed_downloads.join(', '));
        } catch (err) {
            console.error ('\nFailed to resolve all');
            console.error (err.message || err);
        } finally {
            multibar.stop ();
        }
    }

    private headerString () {
        return 'MXScraper-CLI v' + MXScraper.version + ' - FutureG-lab\n';
    }
}