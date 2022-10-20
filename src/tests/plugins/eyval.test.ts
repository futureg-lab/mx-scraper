import { MXScraper } from "../../core/MXScraper";
import { config } from "../../environment";
import { Eyval } from "../../plugins/Eyval";
import { GPrincess } from "../../plugins/GPrincess";


test('Eyval book should have a value', async () => {
    config.LOGGER.ENABLE = false;
    try {
        const test_link = 'https://www.eyval.net/2021/10/kana-hanazawa-smart-october-2021.html';
        const engine = new MXScraper ();
        await engine.initFromPluginFolder ();
        const eyval = <Eyval> engine.getPluginByIdentifier ('Eyval');
        const book = await eyval.fetchBook (test_link);
        await eyval.destructor ();
        expect(book != null).toBeTruthy();
    } catch (err) {
        fail(err);
    }
});

test('Eyval book should have a title and 3 items', async () => {
    config.LOGGER.ENABLE = false;
    try {
        const test_link = 'https://www.eyval.net/2020/03/kana-hanazawa-flash-20200324.html';
        const engine = new MXScraper ();
        await engine.initFromPluginFolder ();
        const eyval = <Eyval> engine.getPluginByIdentifier ('Eyval');
        const book = await eyval.fetchBook (test_link);
        await eyval.destructor ();
        expect(book != null).toBeTruthy();
        expect(book.title.length).toBeGreaterThan(1);
        expect(book.chapters[0].pages.length).toBe(3);
    } catch (err) {
        fail(err);
    }
});