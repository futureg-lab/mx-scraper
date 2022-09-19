import { MXLogger } from "../../cli/MXLogger";
import { MXScraper } from "../../core/MXScraper";
import { config } from "../../environment";
import { EHentai } from "../../plugins/EHentai";

test('EHentai book should have a value', async () => {
    config.LOGGER.ENABLE = false;
    try {
        const engine = new MXScraper ();
        await engine.initFromPluginFolder ();
        const ehentai = <EHentai> engine.getPluginByIdentifier ('EHentai');
        const book = await ehentai.fetchBook ('https://e-hentai.org/g/2330672/bac987c4fa/');
        await ehentai.destructor ();
        expect(book != null).toBeTruthy();
    } catch (err) {
        fail(err);
    }
});