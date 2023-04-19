import { MXLogger } from "../cli/MXLogger";
import { Book, Chapter, Page, PluginOption, SearchOption, Tag } from "../core/BookDef";
import { MXPlugin } from "../core/MXPlugin";
import { CustomRequest } from "../utils/CustomRequest";
import { HtmlParser } from "../utils/HtmlParser";

export class Kemono extends MXPlugin {
    title : string = 'Kemono';
    author : string = 'afmika';
    version : string = '1.0.0';
    target_url : string = 'https://kemono.party/';
    resource: string = 'https://c6.kemono.party/';

    option : PluginOption;
    request : CustomRequest;

    constructor () {
        super ();
        this.request = new CustomRequest ();
        this.request.enableRendering();
        this.request.enableReUsingBrowserInstance();
    }

    override async fetchBook (url : string) : Promise<Book> {
        const html = await this.request.get (url);
        const parser = HtmlParser.use(html);
        const title = parser
            .select('title')
            .first()
            .asText()
            ?.trim();
        if (title == undefined) 
            throw Error(`title not found for ${url}`);
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
        const pageUrls = new Set<string>(rawPages);
        if (pageUrls.size == 0) 
            throw Error(`no pages found for ${url}`);
        
        const pages = new Array<Page>();
        let count = 1;
        for (let i = 0; i < pageUrls.size; i++) {
            const pageUrl = pageUrls[i];
            MXLogger.infoRefresh("[Kemono] Page", `${i + 1}/${pageUrls.size}`, pageUrl);
            const images = await this.getSinglePage(this.fromRoot(pageUrl));
            for (let imageUrl of images) {
                const [filename, name, _ext] = imageUrl.match(/([A-Za-z0-9_]+)\.(.+)$/);
                pages.push({
                    filename,
                    number: count++,
                    title: name,
                    url: imageUrl,
                });
            }
        }

        const chapter = <Chapter>{
            title: title,
            pages: pages,
            number: 1,
            url: url,
            description: '',
        };

        const tags = this.extractTagsFromTitle(title);
        
        return <Book> {
            title : title,
            title_aliases : [],
            url : url,
            source_id : url,
            authors : [],
            chapters : [chapter],
            description : '',
            metadatas : [],
            tags : tags
                .map (tag => <Tag> {name : tag, metadatas : []}),
        };
    }

    private async getSinglePage(url: string): Promise<string[]> {
        const html = await this.request.get(url);
        const posts = HtmlParser
            .use(html)
            .select ('.post-card>a')
            .map (node => node.attr('href')) as Array<string>;
        const allImagesUrl = new Array<string>();
        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            const postLink = this.fromRoot(post);
            const postHtml = await this.request.get(postLink);
            const images = HtmlParser
                .use (postHtml)
                .select('.post__thumbnail>a>img')
                .map<string>((node) => {
                    const url = node.attr('src');
                    const identifier = url.match(/data(.*)/).shift();
                    return this.fromRoot(identifier, this.resource);
                });
            MXLogger.infoRefresh("[Kemono] Fetching post", `${i + 1}/${posts.length}`, postLink, `(total ${images.length})`);
            allImagesUrl.push(...images.filter((i) => i != undefined));
        }
        return allImagesUrl;

    }

    private fromRoot(url_chunk: string, root: string = this.target_url) {
        return (root + url_chunk).replace(/\/+/g, '/');
    }

    private extractTagsFromTitle (title : string) : string[] {
        return title
                .split(/[ \t|]+/g)
                .filter (str => str != '');
    }

    override async search (term : string, option : SearchOption) : Promise<Book[]> {
        return [];
    }
}