import {CheerioAPI, load} from "cheerio";
import { Book, PluginOption, Metadata, SearchOption, Tag, Page, TitleAlias, Chapter, Author } from "../core/BookDef";
import { MXPlugin } from "../core/MXPlugin";
import { CustomRequest, FlareSolverrProxyOption } from "../utils/CustomRequest";
import { MXLogger } from "../cli/MXLogger";

interface EHRelevantInformation {
    /**
     * Gallery title
     */
    title : string;
    /** 
     * Summary example
     * * Posted:	2022-05-28 01:53
     * * Parent:	2197090
     * * Visible:	No (Replaced)
     * * Language:	Japanese  
     * * File Size:	400.1 MB
     * * Length:	329 pages
     * * Favorited:	4822 times
     **/
    summary : Map<string, string>;

    /**
     * (type : language, group, artist, ..any) => (values : string[])
     */
    tags : Map<string, string[]>;
}

export class EHentai extends MXPlugin {
    title : string = 'EHentai';
    author : string = 'afmika';
    version : string = '1.1.0';
    target_url : string = 'https://e-hentai.org/';
    option : PluginOption;
    request : CustomRequest;

    constructor () {
        super ();
        this.request = new CustomRequest();
    }

    override async fetchBook (gallery_id_or_url : string) : Promise<Book> {
        const [gallery_id, gallery_token] = this.extractIdFromPotentialUrl (gallery_id_or_url);
        const url = this.target_url + 'g/' + gallery_id + '/' + gallery_token;

        MXLogger.infoRefresh (`[e-hentai] Fetching informations`);
        const {title, summary, tags} = await this.fetchAllRelevantsInformation (url);

        // authors ?
        const authors : Author[] = [];
        const artists = ['artist', 'group'];
        for (let key of artists) {
            const values : string[] = tags.get(key);
            if (values) {
                values.forEach ((name : string) => {
                    authors.push (<Author>{
                        name : name, 
                        description : ''
                    });
                });
            }
        }

        // tags ?
        const book_tags : Tag[] = [];
        const tag_keys = Array.from (tags.keys ());
        for (let key of tag_keys) {
            const values : string[] = tags.get (key);
            values.forEach ((name : string) => {
                book_tags.push (<Tag>{
                    name : name,
                    metadatas : [<Metadata>{
                        label : key,
                        content : name
                    }]
                });
            });
        }

        // book content ?
        const book = <Book> {
            url : url,
            title : title,
            title_aliases : [],
            source_id : gallery_id + '_' + gallery_token,
            authors : authors,
            chapters : [],
            description : '',
            tags : book_tags,
            metadatas : Array
                            .from (summary.keys())
                            .map (key => <Metadata>{
                                label: key, content : summary.get (key)
                            })
        };

        const chapter = <Chapter>{
            title : title,
            description : '',
            number : 1,
            pages : [],
            url : url
        };

        MXLogger.infoRefresh (`[e-hentai] Fetching pages`);
        const pages = await this.fetchAllPageUrls (url);
        chapter.pages = pages;
        book.chapters.push (chapter);

        return book;
    }

    private async fetchAllRelevantsInformation (url : string) : Promise<EHRelevantInformation> {
        const response_html = await this.request.get (url);
        const $ : CheerioAPI = load (response_html);
        // title ?
        const title = $('#gd2')?.text().trim();

        // summary ?
        const summary = new Map<string, string> ();
        $('#gdd>table>tbody>tr').each((_, elem) => {
            const [key, value] = $(elem)
                        .text()
                        .split(':')
                        .map(v => v.trim());
            summary.set (key, value);
        });

        // tags ?
        const tags = new Map<string, string[]> ();
        $('#taglist>table>tbody>tr').each((i, elem) => {
            const [left_td, right_td] = $(elem).children().toArray();
            const list = [];
            $(right_td).children().each((_, child) => {
                list.push($(child).text());
            });
            const key = $(left_td).text().replace(/:$/, '');
            tags.set (key, list);
        });

        return <EHRelevantInformation> {
            title : title,
            summary : summary,
            tags : tags
        };
    }

    private async fetchAllPageUrls (url : string) : Promise<Page[]> {
        const pages : Page[] = [];
        const idinfos = this.extractIdFromPotentialUrl (url).join('_');
        const url_cover_seen = new Set<string> ();

        // /!\ page is 0-indexed on the website
        let current_pagination = 0, item_count = 1;
        let do_next_page = true;

        while (do_next_page) {
            const pagination_url = url + '?p=' + current_pagination;
            MXLogger.infoRefresh (`[e-hentai] ${idinfos} :: Fetching page ${current_pagination} (Count ${item_count - 1})`);

            const response_html = await this.request.get (pagination_url);
            const $ : CheerioAPI = load (response_html);
            
            // links on the covers
            const links = $('#gdt>div>div>a')
                            .toArray()
                            .map(elem => $(elem).attr('href'));
            
            for (let link of links) {
                if (url_cover_seen.has (link)) {
                    do_next_page = false;
                    break;
                }
            }

            if (do_next_page) {
                for (let link of links) {
                    url_cover_seen.add (link);
                    // retrieve the real link
                    const response_html = await this.request.get (link);
                    const $ : CheerioAPI = load (response_html);
                    const real_link = $('#img').first ().attr ('src');
                    const filename = item_count + '.' + this.deduceImageTypeFromUrl (real_link);
    
                    const page = <Page> {
                        filename : filename,
                        title : '' + item_count,
                        number : item_count,
                        url : real_link
                    };
    
                    pages.push (page);
                    item_count++;
                }
            }
        
            current_pagination++;
        }

        return pages;
    }

    private extractIdFromPotentialUrl (str : string) : string[] {
        const [ , gid, gtoken] = str.match(/\/(\d+)\/(\w+)/);
        if (!gid || !gtoken)
            throw Error ('Unable to extract gallery_id, gallery_token from ' + str);
        return [gid, gtoken];
    }

    /**
     * @param image_url 
     * @returns jpg, png, jpeg, gif, bmp
     */
    private deduceImageTypeFromUrl (image_url : string) {
        return image_url.split('.').pop() || 'jpg';
    }
}