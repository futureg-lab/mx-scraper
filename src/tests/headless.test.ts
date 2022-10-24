import { config } from "../environment";
import { HeadlessBrowser, TypeEngine } from "../utils/HeadlessBrowser";
import { UniqueHeadlessBrowser } from "../utils/UniqueHeadlessBrowser";

test('Perform a request using the default headless type config', async () => {
    let headless : HeadlessBrowser = null;
    try {
        headless = await HeadlessBrowser.create ();

        const html = await headless.getRenderedHtml ('http://example.com');
        expect(headless.infos().current).toBe(config.HEADLESS_ENGINE); // must match to the config value
        expect(html).toContain('example');
    } catch (err) {
        throw err;
    } finally {
        headless?.destroy ();
    }
});

test('Perform a request using the UniqueHeadlessBrowser that uses the config', async () => {
    let singleton : UniqueHeadlessBrowser = null;
    try {
        singleton = await UniqueHeadlessBrowser.getInstance ();
        const headless = singleton.getHeadlessBrowser ();
        const html = await headless.getRenderedHtml ('http://example.com');

        expect(headless.infos().current).toBe(config.HEADLESS_ENGINE); // must match to the config value
        expect(html).toContain('example');
    } catch (err) {
        throw err;
    } finally {
        singleton?.destroy ();
    }
});


test('Perform a request using PUPPETEER', async () => {
    let headless : HeadlessBrowser = null;
    try {
        headless = await HeadlessBrowser.create (TypeEngine.PUPPETEER);
        const html = await headless.getRenderedHtml ('http://example.com');

        expect(headless.infos().current).toBe(config.HEADLESS_ENGINE); // must match to the config value
        expect(html).toContain('example');
    } catch (err) {
        throw err;
    } finally {
        headless?.destroy ();
    }
});

test('Perform a request using JSDOM', async () => {
    let headless : HeadlessBrowser = null;
    try {
        headless = await HeadlessBrowser.create (TypeEngine.JSDOM);
        const html = await headless.getRenderedHtml ('http://example.com');

        expect(headless.infos().current).toBe('JSDOM');
        expect(html).toContain('example');
    } catch (err) {
        throw err;
    } finally {
        headless?.destroy ();
    }
});