import * as Puppeteer from 'puppeteer';
import {JSDOM} from "jsdom";
import { config } from '../environment';
import { MXLogger } from '../cli/MXLogger';

export interface HeadlessType {
    value : number;
};

export const TypeEngine = {
    JSDOM : <HeadlessType>{value : 0},
    PUPPETEER : <HeadlessType>{value : 1},
};

export interface CustomScript {
    (browser: Puppeteer.Browser | any) : Promise<void>; 
};

const type_map = {
    'JSDOM' : TypeEngine.JSDOM,
    'PUPPETEER' : TypeEngine.PUPPETEER
};

export class HeadlessBrowser {
    private browser : Puppeteer.Browser | any = null;
    private current_type : string = '';

    // Note : we cannot use async operation in a constructor
    // use HeadlessBrowser.create (...) instead
    private constructor () { }

    /**
     * @param type HeadlessType
     */
    private async initializeBrowser (type : HeadlessType) {
        switch (type.value) {
            case TypeEngine.JSDOM.value:
                this.browser = JSDOM;
                break;
            case TypeEngine.PUPPETEER.value:
                this.browser = await Puppeteer.launch ();
                break;
            default:
                throw Error ('Invalid HeadlessType');
        }
    }

    /**
     * Create a new HeadlessBrowser instance
     * @param custom_type
     * @returns 
     */
    static async create (custom_type? : HeadlessType) {
        const headless = new HeadlessBrowser ();
        let type : HeadlessType = custom_type;

        // if type not provided, use the one from the config file
        if (!custom_type) {
            const key_picked = config.HEADLESS?.ENGINE?.toUpperCase();
            const picked : HeadlessType = type_map[key_picked];
            if (picked)
                type = picked;
            else
                throw Error ('config.HEADLESS.ENGINE is not defined, expects ' + Object.keys(type_map).join(', '));
            
            headless.current_type = key_picked;
        } else {
            // reverse map
            for (let key in type_map)
                if (type.value == type_map[key].value)
                    headless.current_type = key;
        }

        await headless.initializeBrowser (type);
        return headless;
    }

    /**
     * Get the rendered html
     * @param target_url 
     */
    async getRenderedHtml (target_url : string) : Promise<string> {
        if (this.browser == JSDOM) {
            // JSDOM
            const jsdom = this.browser;
            const dom : JSDOM = await jsdom.fromURL(target_url, {
                resources: 'usable', // load src tags and run
                pretendToBeVisual : true,
                runScripts : 'dangerously' // run scripts
            });
            return dom.serialize();
        } else {
            const browser = <Puppeteer.Browser> this.browser;
            const page = await browser.newPage();
            await page.goto(target_url, { waitUntil: 'networkidle2' });
            return await page.content();
        }
    }

    /**
     * @param fun custom async function
     */
    async runWithinContext (fun : CustomScript) {
        await fun (this.browser);
    }

    /**
     * Free all resources
     */
    async destroy () {
        if (!(this.browser == JSDOM))
            await this.browser.close ();
    }

    infos () {
        return {
            current : this.current_type,
            supported : Object.keys (type_map) 
        };
    }
}