import { config } from "../mx_configuration.ts";

export interface FlareSolverrCommand {
  cmd: string;
  url?: string;
  maxTimeout?: number;
}

export class FlareSolverrClient {
  baseUrl: string;
  /**
   * @param baseUrl proxy url, http://localhost:8191/v1 by default
   */
  constructor(baseUrl: string = "http://localhost:8191/v1") {
    this.baseUrl = baseUrl;
  }

  /**
   * @param command FlareSolverr json object command
   */
  async performCommand(command: FlareSolverrCommand) {
    if (!command.maxTimeout) {
      command.maxTimeout = config.CLOUDFARE_MAX_TIMEOUT;
    }
    // the data field contains the response
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    return await response.json();
  }
}
