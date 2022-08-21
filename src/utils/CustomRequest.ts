import axios, { AxiosRequestConfig } from 'axios';
import { FlareSolverrClient, FlareSolverrCommand } from './FlareSolverrClient';

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
     * Create a session id for the current CustomRequest instance
     */
    async initProxySession () {
        const solver = new FlareSolverrClient (this.proxy.proxy_url);
        if (!this.proxy.session_id)
            this.proxy.session_id = await solver.createSession ();
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
        let axios_req_conf : AxiosRequestConfig = {
            url : target_url,
            method : 'GET'
        };
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
        // the data field contains the response
        const {data} = await axios(axios_req_conf);
        return data;
    }

    /**
     * @param target_url 
     */
    async download (target_url : string) {
        throw Error ('Yet to be implemented');
    }
}