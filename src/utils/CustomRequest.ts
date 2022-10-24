import axios, { AxiosRequestConfig } from 'axios';
import {JSDOM} from "jsdom";
import { FlareSolverrClient, FlareSolverrCommand } from './FlareSolverrClient';
import * as fs from 'fs';

export interface FlareSolverrProxyOption {
    proxy_url : string;
    timeout? : number;
    session_id? : string;
}

/**
 * A request wrapper for axios for 'GET' requests
 */
export class CustomRequest {
    proxy : FlareSolverrProxyOption = null;
    renderHTML : boolean = false;

    /**
     * @param option Custom proxy configuration
     */
    constructor (option? : FlareSolverrProxyOption) {
        if (option)
            this.configureProxy(option);
    }

    /**
     * @param option proxy option {proxy_url, timeout?, session_id?}
     */
    configureProxy (option : FlareSolverrProxyOption) {
        this.proxy = option;
    }

    /**
     * Enable HTML rendering for get request
     */
    enableRendering () {
        this.renderHTML = true;
    }

    /**
     * Disable HTML rendering for get request
     */
    disableRendering () {
        this.renderHTML = false;
    }

    /**
     * Create a session id for the current CustomRequest instance
     */
    async initProxySession () {
        const solver = new FlareSolverrClient (this.proxy.proxy_url);
        if (!this.proxy.session_id)
            this.proxy.session_id = await solver.createSession ();
    }

    hasExistingSession () {
        return (this.proxy != null) && (this.proxy.session_id != undefined);
    }

    /**
     * Destroy a session (assuming initProxySession was called first)
     */
    async destroyProxySession () {
        const solver = new FlareSolverrClient (this.proxy.proxy_url);
        const id = this.proxy.session_id;
        if (id) {
            await solver.destroySession (id);
            this.proxy.session_id = undefined;
        }
    }

    /**
     * @param target_url 
     * @returns 
     */
    async get (target_url : string) : Promise<string> {
        // cloudfare
        if (this.proxy) {
            const solver = new FlareSolverrClient (this.proxy.proxy_url);
            const cmd : FlareSolverrCommand = {
                cmd : 'request.get',
                url : target_url
            };
            // use an existing session if defined (assuming initProxySession was called)
            if (this.proxy.session_id)
                cmd.session = this.proxy.session_id;
            const {solution} = await solver.performCommand (cmd);
            return solution.response;
        }

        return await CustomRequest.doGet (target_url, this.renderHTML);
    }

    /**
     * @param target_url 
     * @param headless_mode Enable headless mode (run script), `false` by default
     * @returns 
     */
    static async doGet (target_url : string, headless_mode = false) {
        if (headless_mode) {
            const dom : JSDOM = await JSDOM.fromURL(target_url, {
                resources: 'usable', // load src tags and run
                pretendToBeVisual : true,
                runScripts : 'dangerously' // run scripts
            });
            return dom.serialize();
        }

        // perform a simple request with axios
        let axios_req_conf : AxiosRequestConfig = {
            url : target_url,
            method : 'GET'
        };
        const {data} = await axios(axios_req_conf);
        return <string> data;
    }

    /**
     * @param target_url download url
     * @param output_location_path where to save the file
     */
     async download (target_url : string, output_location_path : string) {
        const response = await axios ({
            method: 'get',
            url: target_url,
            responseType: 'stream'
        });
        const writer = fs.createWriteStream (output_location_path);
        response.data.pipe (writer);
        return new Promise<unknown> ((resolve, reject) => {
            writer.on ('finish', resolve)
            writer.on ('error', reject)
        });
    }
}