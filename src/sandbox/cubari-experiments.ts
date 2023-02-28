import { CustomRequest } from "../utils/CustomRequest";
import { HtmlParser } from "../utils/HtmlParser";

const link = 'http://www.mangatown.com/manga/tensei_shitara_slime_datta_ken/c103/';

(async () => {
    const request = new CustomRequest();
    const content = await request.get(link);

    const parser = HtmlParser.use(content);
    const list = parser
                    .select('.chapter-title>a')
                    .map(item => <any>{
                        title : item.asText(),
                        link : item.attr('href')
                    });
    
    const last_ch = list.pop();

    console.log(list);
    console.log(last_ch);
}) ();