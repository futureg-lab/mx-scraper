import { MXScraper } from "../../MXScraper";
import { NHentai } from "../../plugins/nhentai/NHentai";

test('NHentai book should have a value', async () => {
    try {
        const engine = new MXScraper ();
        await engine.initPlugins ();
        const nhentai = <NHentai> engine.getPluginByIdentifier ('NHentai');
        const book = nhentai.fetchBook ('177013');
        expect(book != null).toBeTruthy();
    } catch (err) {
        fail(err);
    }
});