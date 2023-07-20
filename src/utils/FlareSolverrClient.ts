import { config } from "../environment";

export interface FlareSolverrCommand {
    cmd : string;
    url? : string;
    maxTimeout? : number;
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
        if (!command.maxTimeout)
            command.maxTimeout = config.CLOUDFARE_MAX_TIMEOUT;
        // the data field contains the response

        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        
        const res = await fetch(this.base_url, {
            method : 'POST',
            headers,
            body: JSON.stringify(command)
        });
        return await res.json();
    }
}