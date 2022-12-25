import { MXScraper } from "../../core/MXScraper";
import { config } from "../../environment";
import { NHentai } from "../../plugins/NHentai";

test('NHentai book should have a value', async () => {
    config.LOGGER.ENABLE = false;
    try {
        const engine = new MXScraper ();
        await engine.initAllPlugins ();
        const nhentai = <NHentai> engine.getPluginByIdentifier ('NHentai');
        await engine.configureSpecificPlugin(nhentai.getPluginID());
        const book = await nhentai.fetchBook ('177013');
        await nhentai.destructor ();
        expect(book != null).toBeTruthy();
    } catch (err) {
        fail(err);
    }
});