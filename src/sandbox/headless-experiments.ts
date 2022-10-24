import * as Puppeteer from 'puppeteer';
import { CustomRequest } from '../utils/CustomRequest';
import { HeadlessBrowser, TypeEngine } from "../utils/HeadlessBrowser";
import { UniqueHeadlessBrowser } from '../utils/UniqueHeadlessBrowser';

(async () => {
    // const headless = await HeadlessBrowser.getInstance (TypeEngine.JSDOM);
    // const headless = await HeadlessBrowser.create (); // use type from config
    // const html = await headless.getRenderedHtml ('http://localhost:8080');
    // console.log (html);
    // headless.destroy ();

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



    // singleton capabilities test
    // const _ = await UniqueHeadlessBrowser.getInstance (TypeEngine.PUPPETEER);
    
    // const a = await UniqueHeadlessBrowser.getInstance (TypeEngine.PUPPETEER);
    // if (a != _) throw Error ('Fail');
    // const html = await a.getHeadlessBrowser ().getRenderedHtml ('http://localhost:8080');
    // console.log('Has value ? ' + (html.length > 0));
    // await a.destroy ();
    
    // const b = await UniqueHeadlessBrowser.getInstance (TypeEngine.PUPPETEER);
    // if (b == _) throw Error ('Fail');
    // const html2 = await b.getHeadlessBrowser ().getRenderedHtml ('http://localhost:8080');
    // console.log('Has value ? ' + (html2.length > 0));
    // await b.destroy ();


    // singelton capabilities test 2
    const request = new CustomRequest ();
    request.enableRendering ();
    request.enableReUsingBrowserInstance ();
    const html = await request.get ('http://localhost:8080');
    console.log('Has value ? ' + (html.length > 0));
    await request.destroy ();

    const request2 = new CustomRequest ();
    request2.enableRendering ();
    request2.enableReUsingBrowserInstance ();
    const html2 = await request2.get ('http://localhost:8080');
    console.log('Has value ? ' + (html2.length > 0));
    await request2.destroy ();
}) ();
