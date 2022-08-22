import { PluginOption } from "../interfaces/BookDef";
import { MXScraper } from "../MXScraper";
import { NHentai } from "../plugins/NHentai";
import { FlareSolverrProxyOption } from "../utils/CustomRequest";
import { config } from "../environment";
import { FlareSolverrClient } from "../utils/FlareSolverrClient";

(async () => {
    try {
        const engine = new MXScraper ();
        // init plugin
        const use_sess_config = true;
        await engine.initFromPluginFolder(use_sess_config);

        const nhentai = <NHentai> engine.getPluginByIdentifier ('NHentai');
        const book = await nhentai.fetchBook ('177013');
        console.log(book);
        console.log(book.chapters[0])

        // nhentai.destructor();
    } catch (err) {
        console.error(err);
    }
}) ();