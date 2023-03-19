import * as Puppeteer from 'puppeteer';
import {JSDOM} from "jsdom";
import { config } from '../environment';
import { DynamicConfigurer } from '../cli/DynamicConfigurer';

export enum TypeEngine {
    JSDOM = 1, // do not start at 0 (0 == undefined)
    PUPPETEER = 2
};


type HeadlessBrowserInfos = {
    current_type : string;
    exec_path : string;
    supported : string[];
};

type TypeBrowser = Puppeteer.Browser | any;
type CustomScript = (browser: TypeBrowser) => Promise<void>; 
type TypeMap = {[key : string] : TypeEngine};

const type_map : TypeMap = {
    'JSDOM' : TypeEngine.JSDOM,
    'PUPPETEER' : TypeEngine.PUPPETEER
};

export class HeadlessBrowser {
    private browser : TypeBrowser = null;

    private instance_infos : HeadlessBrowserInfos = {
        current_type : '',
        exec_path : '',
        supported : Object.keys (type_map)
    };

    // Note : we cannot use async operation in a constructor
    // use HeadlessBrowser.create (...) instead
    private constructor () { }

    /**
     * @param type
     */
    private async initializeBrowser (type : TypeEngine) {        
        switch (type) {
            case TypeEngine.JSDOM:
                this.browser = JSDOM;
                break;
            case TypeEngine.PUPPETEER:
                let browser_path = Puppeteer.executablePath ();
        
                if ( ! DynamicConfigurer.isDevMode () ) 
                    browser_path = config.HEADLESS['EXEC_PATH'] || browser_path;
                
                this.browser = await Puppeteer.launch ({ 
                    executablePath : browser_path,
                    headless: !config.HEADLESS['FULL_HEADLESS']
                });
                this.instance_infos.exec_path = browser_path;
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
    static async create (custom_type? : TypeEngine) {
        const headless = new HeadlessBrowser ();
        let type : TypeEngine = custom_type;

        if (!custom_type) {
            // if type not provided, use the one from the config file
            const key_picked = config.HEADLESS?.ENGINE?.toUpperCase();
            const picked = type_map[key_picked];
            if (picked)
                type = picked;
            else
                throw Error ('config.HEADLESS.ENGINE is not defined, expects ' + Object.keys(type_map).join(', '));
            
            headless.instance_infos.current_type = key_picked;
        } else {
            // custom_type is defined
            // reverse map
            for (let key in type_map)
                if (type == type_map[key])
                    headless.instance_infos.current_type = key;
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
        if (!(this.browser == JSDOM)) {
            const browser = <Puppeteer.Browser> this.browser;
            await browser.close ();
        }
    }

    getBrowser() {
        return this.browser;
    }

    infos () {
        return this.instance_infos;
    }
}