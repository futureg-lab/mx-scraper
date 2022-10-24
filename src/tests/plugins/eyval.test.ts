import { MXScraper } from "../../core/MXScraper";
import { config } from "../../environment";
import { Eyval } from "../../plugins/Eyval";
import { GPrincess } from "../../plugins/GPrincess";


test('Eyval book should have a value', async () => {
    config.LOGGER.ENABLE = false;
    try {
        const test_link = 'https://www.eyval.net/2021/10/kana-hanazawa-smart-october-2021.html';
        const eyval = new Eyval();
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
        const eyval = new Eyval();
        const book = await eyval.fetchBook (test_link);
        await eyval.destructor ();
        expect(book != null).toBeTruthy();
        expect(book.title.length).toBeGreaterThan(1);
        expect(book.chapters[0].pages.length).toBe(3);
    } catch (err) {
        fail(err);
    }
});

test('Edge case #1 with different layout to have 5 items', async () => {
    config.LOGGER.ENABLE = false;
    try {
        const test_link = 'https://www.eyval.net/2022/03/liyuu-young-jump-20220324.html';
        const eyval = new Eyval();
        const book = await eyval.fetchBook (test_link);
        await eyval.destructor ();
        expect(book != null).toBeTruthy();
        expect(book.title.length).toBeGreaterThan(1);
        expect(book.chapters[0].pages.length).toBe(5);
    } catch (err) {
        fail(err);
    }
});

test('Edge case #2 with different layout to have 90 items', async () => {
    config.LOGGER.ENABLE = false;
    try {
        const test_link = 'https://www.eyval.net/2012/03/sayama-ayaka-virgin-nude-20120319.html';
        const eyval = new Eyval();
        const book = await eyval.fetchBook (test_link);
        await eyval.destructor ();
        expect(book != null).toBeTruthy();
        expect(book.title.length).toBeGreaterThan(1);
        expect(book.chapters[0].pages.length).toBe(90);
    } catch (err) {
        fail(err);
    }
});

