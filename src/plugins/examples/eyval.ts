import { CustomRequest } from "../../utils/custom_request.ts";
import GPrincess from "./gprincess.ts";

export default class Eyval extends GPrincess {
  title: string = "Eyval";
  version: string = "1.0.0";
  targetUrl: string = "https://www.eyval.net/";
  request: CustomRequest;

  constructor() {
    super();
    this.request = new CustomRequest();
  }
}
