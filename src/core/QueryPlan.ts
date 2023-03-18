import { parse } from "yaml"
import { readFileSync } from "node:fs"
import { Book, Chapter, Page, Tag } from "./BookDef";
import { feedValues, resumeText } from "../utils/Utils";
import { CustomRequest } from "../utils/CustomRequest";
import { HtmlParser } from "../utils/HtmlParser";
import { MXLogger } from "../cli/MXLogger";


export type OnTarget = {
    (
        url: string,
        index: number,
        total: number,
        error?: Error
    ): void
};

export type OnErrorFlag = 'continue' | 'break';

export type Filter = {
    select: string;
    where?: string;
    linkFrom: string;
    followLink?: Filter;
};

export type Counter = {
    range: [number, number];
    onError: OnErrorFlag;
    each?: Iterate;
};

export type Iterate = {
    [iterName: string]: Counter
};


export type Plan = {
    version: string;
    target: string | string[];
    title?: string;
    filter: Filter;
    iterate?: Iterate;
};

export class QueryPlan {
    plan: Plan;
    params: Record<string, string | string>;
    usedNames: Set<string>;
    request : CustomRequest;
    verbose: boolean = true;

    private constructor(source_code: string) {
        // init props
        this.params = {};
        this.usedNames = new Set<string>();
        this.request = new CustomRequest();
        // load, validate and sanitize the plan
        const raw_plan = parse(source_code);
        this.plan = this.validate(raw_plan);
    }

    static fromString (source: string) {
        return new QueryPlan(source);
    }

    static load (filepath: string) {
        const content = readFileSync(filepath).toString();
        return this.fromString(content);
    }

    with (params: Record<string, string>) {
        this.params = params;
        // yaml variables has higher priority over cli args
        for (const key in params) {
            if (this.usedNames.has(key))
                throw Error(`parameters error, variable "${key}" already used in the plan`);
            this.usedNames.add(key);
        }
        return this;
    }

    async run (callback?: OnTarget): Promise<Book> {
        const {version, target, title, filter, iterate } = this.plan;
        if (version != '1.0.0') 
            throw Error(`version ${version} not supported`);
        const allTargets = Array.isArray(target) ? target : [target];

        let depth = 0;
        const indent = (str: string) => new Array(depth).fill('=').join('') + str; 
        const navigateUrl = async (root: Filter, pages: Page[], url: string, baseUrl: string) => {
            depth++;
            if (url.startsWith('/'))
                url = new URL(url, baseUrl).href;
            
            this.verbose && MXLogger.infoRefresh(indent('> ' + url));

            const html = await this.request.get(url);
            const { select, where, linkFrom } = root;
            const nodes = HtmlParser.use(html).select(select);
            const selection = (where ? nodes.where(where) : nodes).all();
            for (const item of selection) {
                let link = item.asText().trim();
                if (linkFrom.startsWith('attr.')) {
                    const [ _, attribute] = linkFrom.split('.');
                    link = item.attr(attribute).trim();
                }
                if (root.followLink) {
                    if (!link || link == '') {
                        this.verbose && MXLogger.infoRefresh("Unable to fetch", link);
                        continue;
                    }
                    await navigateUrl(root.followLink, pages, link, baseUrl);
                } else {
                    this.verbose && MXLogger.infoRefresh(indent('> Fetched'), resumeText(link));
                    const ext = link.split('.').pop() ?? 'jpg';
                    const pageCount = pages.length + 1;
                    pages.push({
                        filename: pageCount + '.' + ext,
                        number: pageCount,
                        title: item.attr('alt') ?? pageCount.toString(),
                        url: link
                    });
                }
            }
            depth--;
        };

        const processUrl = async (url: string): Promise<Page[]> => {
            const urlProcessed = feedValues(url, this.params);
            const baseUrl = new URL(urlProcessed).origin;
            const pages = new Array<Page>();
            await navigateUrl(filter, pages, urlProcessed, baseUrl);
            return pages;
        };

        const chapters = new Array<Chapter>();
        
        if (iterate) {
            const processIterate = async (root: Iterate, target: string, chapter: Chapter) => {
                const [counterName] = Object.keys(root);
                const counter = root[counterName];
                const [start, end] = counter.range;
                for (let i = start; i <= end; i++) {
                    this.params[counterName] = i.toString();
                    if (counter.each) {
                        await processIterate(counter.each, target, chapter);
                    } else {
                        try {
                            chapter.pages = await processUrl(target);
                        } catch (err) {
                            if(counter.onError == 'break') {
                                break;
                            } else /* ignore */;
                        }
                    }
                }
            }
            // apply individual iteration for each target
            for (const url of allTargets) {
                const chapterCount = chapters.length + 1;
                const chapter = <Chapter>{
                    title: this.titleFromUrl(url),
                    description: '',
                    number: chapterCount,
                    pages: [],
                    url: url
                };
                await processIterate(iterate, url, chapter);
                chapters.push(chapter);
            }
        } else {
            for (const url of allTargets) {
                const chapterCount = chapters.length + 1;
                const chapter = <Chapter>{
                    title: this.titleFromUrl(url),
                    description: '',
                    number: chapterCount,
                    pages: [],
                    url: url
                };
                chapter.pages = await processUrl(url);
            }
        }

        const bookTitle = title ?? this.params['TITLE'] ?? 'untitled';
        return <Book> {
            title: bookTitle,
            authors: [],
            chapters: chapters,
            metadatas: [],
            description: allTargets.join(', '),
            source_id: bookTitle,
            tags: allTargets.map(target => <Tag>{
                name: new URL(target).hostname.replace('www.', ''),
                metadatas: []
            }),
            url: allTargets[0] ?? '', // any idea ?
            title_aliases: [],
        };
    }


    private titleFromUrl(url: string) {
        const {hostname, pathname} = new URL(url);
        return [hostname, pathname].join('-');
    }


    private validate (raw_plan: unknown): Plan {
        const res: any = {};
        const get = (root: any, key: string, required: boolean = false, process?: any) => {
            const value = root[key];
            if (value === undefined && required)
                throw Error(`required command "${key}" not found in the query plan`);
            res[key] = process ? process(value) : value;
        };
        
        get(raw_plan, 'version', true);
        get(raw_plan, 'target', true);
        get(raw_plan, 'title', false);

        const filterProcessor = (filter: any, path: string[] = ['filter']) => {
            const curr_path = path.join('.');
            if (!filter.select) 
                throw Error (`html object not selected at ${curr_path}`);
            if (!filter.linkFrom)
                throw Error (`linkFrom is undefined at ${curr_path}`);
            if (filter.followLink)
                filterProcessor(filter.followLink, [...path, 'followLink']);
            return filter;
        };
        get(raw_plan, 'filter', true, filterProcessor);

        const iterateProcessor = (iterate: any, path: string[] = ['iterate']) => {
            const iterName = Object.keys(iterate)[0];
            path.push(iterName);
            const curr_path = path.join('.');
            if (!iterName) 
                throw Error(`counter name for iterate undefined at ${curr_path}`);
            
            if (this.usedNames.has(iterName))
                throw Error(`variable "${iterName}" already used at ${curr_path}`);
            this.usedNames.add(iterName);

            const counter = iterate[iterName];
            if (counter.onError) {
                const valid = ['continue', 'break'];
                if (!valid.includes(counter.onError)) {
                    const expected = valid.map((v: string) => `"${v}"`).join(' or ');
                    throw Error(`onError has invalid value "${counter.onError}" at ${curr_path}, ${expected} expected`);
                }
            }
            if (counter.range) {
                if (Array.isArray(counter.range)) {
                    if (counter.range.length > 2) 
                        throw Error(`invalid range size at ${curr_path}.range`);
                    const [start, end] = counter.range.map((x: any) => parseInt(x));
                    if (isNaN(start)) throw Error(`${start} is not a number at ${curr_path}.range[0]`);
                    if (isNaN(end)) throw Error(`${end} is not a number at ${curr_path}.range[1]`);
                    if (start > end) throw Error(`${start} > ${end} at ${curr_path}.range`);
                } else 
                    throw Error(`range is not an array at ${curr_path}`);
            } else
                throw Error(`range is undefined at ${curr_path}`);
            if (counter.each) 
                iterateProcessor(counter.each,  [...path, 'each']);
            return iterate;
        };
        get(raw_plan, 'iterate', false, iterateProcessor);

        return res as Plan;
    }
}