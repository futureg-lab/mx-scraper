import axios, { AxiosRequestConfig } from "axios";
import { config } from "../environment";

export interface FlareSolverrCommand {
  cmd: string;
  url?: string;
  maxTimeout?: number;
}

export class FlareSolverrClient {
  base_url: string;
  /**
   * @param base_url proxy url, http://localhost:8191/v1 by default
   */
  constructor(base_url: string = "http://localhost:8191/v1") {
    this.base_url = base_url;
  }

  /**
   * @param command FlareSolverr json object command
   * @returns
   */
  async performCommand(command: FlareSolverrCommand) {
    if (!command.maxTimeout) {
      command.maxTimeout = config.CLOUDFARE_MAX_TIMEOUT;
    }
    const axios_req_conf: AxiosRequestConfig = {
      url: this.base_url, // change the target to the solver
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: command,
    };
    // the data field contains the response
    const { data } = await axios(axios_req_conf);
    return data;
  }
}
