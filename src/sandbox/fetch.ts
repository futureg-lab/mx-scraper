import { CustomRequest } from "../utils/CustomRequest";
import { HtmlParser } from "../utils/HtmlParser";

(async () => {
    const url = "https://hitomi.la/reader/2389714.html#4";
    const request = new CustomRequest();
    request.enableRendering ();

    const content = await request.get (url);
    const parser = HtmlParser.use (content);
    
    const result = parser
        .select ('img')
        .where ('attr.src : %.webp')
        .map (node => node.attr('src'));
    
    console.log(result);
}) ();