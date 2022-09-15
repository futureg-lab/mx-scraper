import {CheerioAPI, load} from "cheerio";
import { Book, PluginOption, Metadata, SearchOption, Tag, Page, TitleAlias, Chapter } from "../interfaces/BookDef";
import { MXPlugin } from "../interfaces/MXPlugin";
import { CustomRequest, FlareSolverrProxyOption } from "../utils/CustomRequest";
import { config } from "../environment";
import { decodeUnicodeCharacters } from "../utils/Utils";

export class NHentai implements MXPlugin {
    title : string = 'NHentai';
    author : string = 'afmika';
    version : string = '1.1.0';
    target_url : string = 'https://nhentai.net/';
    option : PluginOption;
    request : CustomRequest;

    private gallery_url : string = 'https://i3.nhentai.net/galleries/';
    private api_url : string = 'https://nhentai.net/api/gallery/';

    constructor () {
        this.request = new CustomRequest();
    }

    async configure (option : PluginOption) : Promise<void> {
        this.option = option;
        if (this.option.useFlareSolverr) {
            const solver_option : FlareSolverrProxyOption = <FlareSolverrProxyOption>{
                proxy_url : config.CLOUDFARE_PROXY_HOST,
                timeout : config.CLOUDFARE_MAX_TIMEOUT,
                session_id : this.option.useThisSessionId || undefined
            };
            this.request.configureProxy (solver_option);
            await this.request.initProxySession (); // init session if there are none
        }
    }

    async fetchBook (doujin_id_or_url : string) : Promise<Book> {
        const doujin_id = this.extractDoujinIdFromPotentialUrl (doujin_id_or_url);
        const url = this.target_url + 'g/' + doujin_id;

        // fetch the json object
        let json = null;
        try {
            json = await this.fetchJsonUsingAPI (doujin_id);
        } catch (err) {
            json = await this.fetchJsonOnDoujinPage (doujin_id);
        }
        
        // titles
        const titles : TitleAlias[] = [];
        for (let lang in json.title) {
            if (!json.title[lang] || json.title[lang] == '') continue;
            titles.push(<TitleAlias>{
                title : decodeUnicodeCharacters (json.title[lang]),
                description : lang
            });
        }
        const curr_title = decodeUnicodeCharacters (json.title['english'] || titles[0]);

        // author ?
        let authors = json
                        .tags
                        .filter ((tag : any) => ['artist', 'group'].includes (tag.type))
                        .map ((tag : any) => decodeUnicodeCharacters (tag.name));

        // tags ?
        const tags : Tag [] = json['tags'].map((tag : any) => <Tag>{
            name: tag.name,
            metadatas : Object.keys(tag).map(key => <Metadata>{
                label : key,
                content : tag[key]
            })
        });

        // book setup
        const book : Book = <Book> {
            url : url,
            title : curr_title,
            title_aliases : titles,
            source_id : doujin_id,
            authors : authors,
            chapters : [],
            description : '',
            tags : tags,
            metadatas : [<Metadata>{
                label : 'json',
                content : json
            }]
        };

        // chapter
        const chapter = await this.constructChapterFrom (book, json);
        book.chapters.push(chapter);
        
        return book;
    }

    private async constructChapterFrom (book : Book, json : any) : Promise<Chapter> {
        // TODO
        // asert book defined
        // asert book.title defined
        // asert book.url defined
        const chapter = <Chapter> {
            title : book.title,
            number : 1,
            pages : [],
            description : '',
            url : book.url
        };

        const type_map = {
            'p' : 'png', 
            'j' : 'jpg',
            'g' : 'gif'
        };
        const trivial_case = Object.values (type_map);

        // pages
        for (let i = 0; i < json.images.pages.length; i++) {
            const page_number = 1 + i;
            const meta_image = json.images.pages[i];
            const meta_type = meta_image['t'];
            const filename_chunk = [
                page_number,
                trivial_case.includes(meta_type) ? 
                    meta_type : (type_map[meta_type] || '')
            ];
            const filename = filename_chunk.join('.');
            chapter.pages.push(<Page> {
                title : '' + page_number,
                number : page_number,
                filename :  filename,
                url : this.gallery_url + json.media_id + '/' + filename
            });
        }

        return chapter;
    }

    private async fetchJsonUsingAPI (doujin_id : string) {
        const url = this.api_url + doujin_id;
        const response_html = await this.request.get (url);
        const $ : CheerioAPI = load (response_html);
        // fetch the json object
        const body = $('body').text();

        return JSON.parse(body.replace(/\\u0022/g, '"'));
    }

    private async fetchJsonOnDoujinPage (doujin_id : string) {
        const url = this.target_url + 'g/' + doujin_id;
        const response_html = await this.request.get (url);
        const $ : CheerioAPI = load (response_html);

        // fetch the json object
        let json = null;
        $('script').each((i, element) => {
            const text = $(element).text();
            if (/JSON\.parse/.test(text)) {
                const [ , temp] = text.match(/JSON\.parse\("(.+?)"\)/i);
                json = JSON.parse(temp.replace(/\\u0022/g, '"'))
                return;
            }
        });

        return json;
    }

    private extractDoujinIdFromPotentialUrl (str : string) {
        const [code , ] = str.match(/([0-9]+)/);
        return code;
    }

    async search (term : string, option : SearchOption) : Promise<Book[]> {
        throw Error ('Yet to be implemented');
    }

    async destructor () {
        if (this.request.proxy.session_id)
            await this.request.destroyProxySession ();
    }
}