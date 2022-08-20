import axios, { AxiosRequestConfig } from 'axios';

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
        this.proxy = option;
    }

    /**
     * @private
     */
    async createProxySession () {
        let axios_req_conf : AxiosRequestConfig = {
            url : this.proxy.proxy_url, // change the target to the solver
            method : 'POST',
            headers : {
                'Content-Type' : 'application/json'
            },
            data : {
                cmd : 'request.create',
            }
        };
        const {data} = await axios(axios_req_conf);
    }

    /**
     * 
     */
    async destroyProxySession () {

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
            axios_req_conf = {
                url : this.proxy.proxy_url, // change the target to the solver
                method : 'POST',
                headers : {
                    'Content-Type' : 'application/json'
                },
                data : {
                    cmd : 'request.get',
                    url : target_url,
                    maxTimeout : this.proxy.timeout || 60000
                }
            }
        }
        // the data field contains the response
        const {data} = await axios(axios_req_conf);
        return this.proxy ? data.solution?.response : data;
    }

    /**
     * @param target_url 
     */
    async download (target_url : string) {

    }
}