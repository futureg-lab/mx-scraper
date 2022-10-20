import { PluginOption } from "../core/BookDef";
import { CustomRequest } from "../utils/CustomRequest";
import { GPrincess } from "./GPrincess";

export class Eyval extends GPrincess {
    title : string = 'Eyval';
    author : string = 'afmika';
    version : string = '1.0.0';
    target_url : string = 'https://www.eyval.net/';
    option : PluginOption;
    request : CustomRequest;

    constructor () {
        super ();
        this.request = new CustomRequest ();
    }
}