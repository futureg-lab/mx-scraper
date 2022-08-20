import axios, { AxiosRequestConfig } from "axios";

interface FlareSolverrCommand {
    cmd : string;
    url? : string;
    maxTimeout? : string;
};

export class FlareSolverrClient {
    base_url : string;
    /**
     * @param base_url proxy url, http://localhost:8191/v1 by default
     */
    constructor (base_url : string = 'http://localhost:8191/v1') {
        this.base_url = base_url;
    }

    /**
     * @param command FlareSolverr json object command
     * @returns 
     */
    async performCommand (command : FlareSolverrCommand) {
        const axios_req_conf : AxiosRequestConfig = {
            url : this.base_url, // change the target to the solver
            method : 'POST',
            headers : {
                'Content-Type' : 'application/json'
            },
            data : command
        };
        // the data field contains the response
        const {data} = await axios(axios_req_conf);
        return data;
    }

    /**
     * @returns FlareSolverr session list
     */
    async getSessions () : Promise<string[]> {
        const response = await this.performCommand (<FlareSolverrCommand> {
            cmd : 'sessions.list'
        });
        return response.sessions;
    }

    /**
     * @returns session id
     */
    async createSession () : Promise<string> {
        const response = await this.performCommand (<FlareSolverrCommand> {
            cmd : 'sessions.create'
        });
        return response.session;
    }

    /**
     * @param session_id
     */
    async destroySession (session_id : string) {
        const {status, message} = await this.performCommand (<FlareSolverrCommand> {
            cmd : 'sessions.destroy',
            session : session_id
        });
        if (status != 'ok')
            throw Error (message);
    }
}