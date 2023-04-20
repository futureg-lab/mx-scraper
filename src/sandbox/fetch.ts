import { CustomRequest } from "../utils/CustomRequest";
import { HtmlParser } from "../utils/HtmlParser";

// (async () => {
//     // todo
//     // needs cookies
//     const url = "https://hitomi.la/reader/2389714.html#4";
//     const request = new CustomRequest();
//     request.enableRendering ();

//     const content = await request.get (url);
//     const parser = HtmlParser.use (content);
    
//     const result = parser
//         .select ('img')
//         .where ('attr.src : %.webp')
//         .map (node => node.attr('src'));
    
//     console.log(result);
// }) ();
(async () => {
    // todo
    // needs cookies
    const url = "https://kemono.party/fanbox/user/11229342";
    const request = new CustomRequest();
    const content = await request.get (url);
    const parser = HtmlParser.use (content);
    
    const html = await request.get (url);
    const title = parser
        .select('title')
        .first()
        .asText();
    
    const rawPages = parser
        .select('menu>a')
        .map<string>((node) => node.attr('href'))
        .filter((link) => link && link.includes('o='))
        .sort((a, b) => {
            const x = parseInt(a.match(/o=(\d+)/)?.[1]);
            const y = parseInt(a.match(/o=(\d+)/)?.[1]);
            if (isNaN(x) || isNaN(y))
                return a.localeCompare(b);
            return x - y;
        });
    const pages = new Set<string>(rawPages);

    console.log(title);
    console.log(pages);
}) ();