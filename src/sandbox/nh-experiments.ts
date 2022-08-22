import { PluginOption } from "../interfaces/BookDef";
import { MXScraper } from "../MXScraper";
import { NHentai } from "../plugins/NHentai";
import { FlareSolverrProxyOption } from "../utils/CustomRequest";
import { config } from "../utils/environment ";
import { FlareSolverrClient } from "../utils/FlareSolverrClient";

(async () => {
    try {
        // const engine = new MXScraper ();
        // await engine.initFromPluginFolder();
        // const nhentai = <NHentai> engine.getPluginByIdentifier ('NHentai');

        // using nhentai directly will allow us to force assign a session
        const nhentai = new NHentai();
        nhentai.configure(<PluginOption>{
            useFlareSolverr : true,
            useThisSessionId : '38a41520-2232-11ed-b316-47b0b963912e'
        });
        const book = await nhentai.fetchBook ('177013');
        console.log(book);

        // nhentai.destructor();
    } catch (err) {
        console.error(err);
    }
}) ();