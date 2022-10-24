import * as Puppeteer from 'puppeteer';
import { HeadlessBrowser, TypeEngine } from "../utils/HeadlessBrowser";

(async () => {
    // const headless = await HeadlessBrowser.getInstance (TypeEngine.JSDOM);
    const headless = await HeadlessBrowser.create (); // use type from config
    const html = await headless.getRenderedHtml ('http://localhost:8080');
    console.log (html);
    headless.destroy ();

    // const headless = await HeadlessBrowser.getInstance ();
    // console.log(headless.infos());
    // headless.runWithinContext (async (browser : Puppeteer.Browser) => {
    //     if (headless.infos().current != 'PUPPETEER')
    //         throw Error ('Should use PUPPETEER when init');
        
    //     const page = await browser.newPage();
    //     await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
    //     console.log (await page.content());
    //     headless.destroy ();
    // });
    
}) ();
