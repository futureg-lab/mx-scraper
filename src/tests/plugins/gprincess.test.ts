import { MXScraper } from "../../core/MXScraper";
import { config } from "../../environment";
import { GPrincess } from "../../plugins/GPrincess";


test('GPrincess book should have a value', async () => {
    config.LOGGER.ENABLE = false;
    try {
        const test_link = 'https://idol.gravureprincess.date/2022/10/liyuu-young-dragon-age-2022-vol09.html';
        const gprincess = new GPrincess();
        const book = await gprincess.fetchBook (test_link);
        await gprincess.destructor ();
        expect(book != null).toBeTruthy();
    } catch (err) {
        fail(err);
    }
});

test('GPrincess book should have a title and 11 items', async () => {
    config.LOGGER.ENABLE = false;
    try {
        const test_link = 'https://idol.gravureprincess.date/2021/03/taketatsu-ayana-20211.html';
        const gprincess = new GPrincess();
        const book = await gprincess.fetchBook (test_link);
        await gprincess.destructor ();
        expect(book != null).toBeTruthy();
        expect(book.title.length).toBeGreaterThan(1);
        expect(book.chapters[0].pages.length).toBe(11);
    } catch (err) {
        fail(err);
    }
});