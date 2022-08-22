import { MXScraper } from "../../MXScraper";
import { NHentai } from "../../plugins/NHentai";

test('NHentai book should have a value', async () => {
    try {
        const engine = new MXScraper ();
        await engine.initFromPluginFolder ();
        const nhentai = <NHentai> engine.getPluginByIdentifier ('NHentai');
        const book = await nhentai.fetchBook ('177013');
        expect(book != null).toBeTruthy();
    } catch (err) {
        fail(err);
    }
});